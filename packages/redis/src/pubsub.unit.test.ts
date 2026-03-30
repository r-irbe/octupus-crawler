// Unit tests: Redis Pub/Sub wrapper
// Validates REQ-COMM-019: Ephemeral notifications via Pub/Sub
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPubSubPublisher, createPubSubSubscriber } from './pubsub.js';

function createMockRedis(overrides: Record<string, unknown> = {}): {
  redis: Parameters<typeof createPubSubPublisher>[0];
  messageListeners: Array<(channel: string, message: string) => void>;
} {
  const messageListeners: Array<(channel: string, message: string) => void> = [];
  const redis = {
    publish: vi.fn(() => Promise.resolve(1)),
    subscribe: vi.fn(() => Promise.resolve(1)),
    unsubscribe: vi.fn(() => Promise.resolve(1)),
    quit: vi.fn(() => Promise.resolve('OK')),
    on: vi.fn((event: string, handler: (channel: string, message: string) => void) => {
      if (event === 'message') {
        messageListeners.push(handler);
      }
    }),
    ...overrides,
  } as unknown as Parameters<typeof createPubSubPublisher>[0];

  return { redis, messageListeners };
}

describe('PubSubPublisher', () => {
  // Validates REQ-COMM-019
  it('publishes string message', async () => {
    const { redis } = createMockRedis();
    const pub = createPubSubPublisher(redis);
    const result = await pub.publish('cache:invalidate', 'key-123');
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBe(1);
    }
    expect(redis.publish).toHaveBeenCalledWith('cache:invalidate', 'key-123');
  });

  // Validates REQ-COMM-019
  it('publishes JSON message', async () => {
    const { redis } = createMockRedis();
    const pub = createPubSubPublisher(redis);
    const result = await pub.publishJson('status:update', { status: 'crawling', url: 'https://example.com' });
    expect(result.isOk()).toBe(true);
    expect(redis.publish).toHaveBeenCalledWith(
      'status:update',
      JSON.stringify({ status: 'crawling', url: 'https://example.com' }),
    );
  });

  // Validates REQ-COMM-019
  it('returns ConnectionError on failure', async () => {
    const { redis } = createMockRedis({
      publish: vi.fn(() => Promise.reject(new Error('disconnected'))),
    });
    const pub = createPubSubPublisher(redis);
    const result = await pub.publish('ch', 'msg');
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe('ConnectionError');
    }
  });
});

describe('PubSubSubscriber', () => {
  let mockRedis: ReturnType<typeof createMockRedis>;

  beforeEach(() => {
    mockRedis = createMockRedis();
  });

  // Validates REQ-COMM-019
  it('subscribes to channel and receives messages', async () => {
    const sub = createPubSubSubscriber(mockRedis.redis);
    const messages: string[] = [];
    await sub.subscribe('events', (_ch, msg) => messages.push(msg));
    expect(mockRedis.redis.subscribe).toHaveBeenCalledWith('events');

    // Simulate incoming message
    for (const listener of mockRedis.messageListeners) {
      listener('events', 'hello');
    }
    expect(messages).toEqual(['hello']);
  });

  // Validates REQ-COMM-019
  it('unsubscribes from channel', async () => {
    const sub = createPubSubSubscriber(mockRedis.redis);
    await sub.subscribe('ch', vi.fn());
    await sub.unsubscribe('ch');
    expect(mockRedis.redis.unsubscribe).toHaveBeenCalledWith('ch');
  });

  // Validates REQ-COMM-019
  it('close quits the subscriber connection', async () => {
    const sub = createPubSubSubscriber(mockRedis.redis);
    await sub.close();
    expect(mockRedis.redis.quit).toHaveBeenCalled();
  });

  // Validates REQ-COMM-019
  it('ignores messages for unsubscribed channels', async () => {
    const sub = createPubSubSubscriber(mockRedis.redis);
    const messages: string[] = [];
    await sub.subscribe('ch1', (_ch, msg) => messages.push(msg));

    // Simulate message on ch2 (not subscribed)
    for (const listener of mockRedis.messageListeners) {
      listener('ch2', 'should-not-appear');
    }
    expect(messages).toEqual([]);
  });
});
