// Integration test: Redis Pub/Sub with Testcontainers
// Validates REQ-COMM-019: Redis Pub/Sub for ephemeral notifications (RALPH-013)
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Redis } from 'ioredis';
import { startRedisContainer, type ManagedRedisContainer } from '@ipf/testing/containers/redis';
import { createPubSubPublisher, createPubSubSubscriber } from './pubsub.js';

function makeRedis(container: ManagedRedisContainer): Redis {
  return new Redis({
    host: container.connection.host,
    port: container.connection.port,
    maxRetriesPerRequest: null,
  });
}

describe('PubSub integration', () => {
  let container: ManagedRedisContainer;
  let pubRedis: Redis;

  beforeAll(async () => {
    container = await startRedisContainer();
    pubRedis = makeRedis(container);
  }, 30_000);

  afterAll(async () => {
    await pubRedis.quit();
    await container.stop();
  });

  // Validates REQ-COMM-019
  it('publishes and receives messages across connections', async () => {
    const subRedis = makeRedis(container);
    const publisher = createPubSubPublisher(pubRedis);
    const subscriber = createPubSubSubscriber(subRedis);

    const received: string[] = [];
    await subscriber.subscribe('test-channel', (_ch, msg) => { received.push(msg); });

    await new Promise((resolve) => { setTimeout(resolve, 100); });

    const publishResult = await publisher.publish('test-channel', 'hello-world');
    expect(publishResult.isOk()).toBe(true);

    await new Promise((resolve) => { setTimeout(resolve, 100); });

    expect(received).toContain('hello-world');
    await subscriber.close();
  });

  // Validates REQ-COMM-019
  it('publishes JSON and receives correctly', async () => {
    const subRedis = makeRedis(container);
    const publisher = createPubSubPublisher(pubRedis);
    const subscriber = createPubSubSubscriber(subRedis);

    const received: string[] = [];
    await subscriber.subscribe('json-channel', (_ch, msg) => { received.push(msg); });

    await new Promise((resolve) => { setTimeout(resolve, 100); });

    const publishResult = await publisher.publishJson('json-channel', { type: 'CrawlCompleted', url: 'https://example.com' });
    expect(publishResult.isOk()).toBe(true);

    await new Promise((resolve) => { setTimeout(resolve, 100); });

    expect(received.length).toBe(1);
    const firstReceived = received[0];
    expect(firstReceived).toBeDefined();
    if (firstReceived !== undefined) {
      const parsed: unknown = JSON.parse(firstReceived);
      expect(parsed).toEqual({ type: 'CrawlCompleted', url: 'https://example.com' });
    }

    await subscriber.close();
  });

  // Validates REQ-COMM-019
  it('unsubscribe stops message delivery', async () => {
    const subRedis = makeRedis(container);
    const publisher = createPubSubPublisher(pubRedis);
    const subscriber = createPubSubSubscriber(subRedis);

    const received: string[] = [];
    await subscriber.subscribe('unsub-channel', (_ch, msg) => { received.push(msg); });

    await new Promise((resolve) => { setTimeout(resolve, 100); });

    await publisher.publish('unsub-channel', 'before');
    await new Promise((resolve) => { setTimeout(resolve, 100); });
    expect(received).toContain('before');

    await subscriber.unsubscribe('unsub-channel');
    await new Promise((resolve) => { setTimeout(resolve, 50); });

    await publisher.publish('unsub-channel', 'after');
    await new Promise((resolve) => { setTimeout(resolve, 100); });
    expect(received).not.toContain('after');

    await subscriber.close();
  });
});
