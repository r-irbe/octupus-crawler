// Unit tests for RedisStreamPublisher
// Validates: REQ-COMM-009 (Redis Streams event publishing)

import { describe, it, expect, vi } from 'vitest';
import {
  createRedisStreamPublisher,
  type StreamEvent,
} from './stream-publisher.js';

function makeEvent(overrides: Partial<StreamEvent> = {}): StreamEvent {
  return {
    type: 'CrawlCompleted',
    version: 1,
    payload: { jobId: 'j-1', url: 'https://example.com' },
    id: 'evt-001',
    timestamp: '2026-03-30T00:00:00Z',
    source: 'worker-1',
    ...overrides,
  };
}

function mockRedis(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    xadd: vi.fn().mockResolvedValue('1711756800000-0'),
    pipeline: vi.fn().mockReturnValue({
      xadd: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue([
        [null, '1711756800000-0'],
        [null, '1711756800001-0'],
      ]),
    }),
    ...overrides,
  };
}

describe('RedisStreamPublisher', () => {
  // Validates REQ-COMM-009
  it('publishes event via XADD and returns entry ID', async () => {
    const redis = mockRedis();
    const publisher = createRedisStreamPublisher(redis as never);
    const event = makeEvent();

    const result = await publisher.publish('events:CrawlCompleted', event);

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toBe('1711756800000-0');
    expect(redis.xadd).toHaveBeenCalledOnce();
  });

  // Validates REQ-COMM-009
  it('passes MAXLEN with approximate trimming by default', async () => {
    const redis = mockRedis();
    const publisher = createRedisStreamPublisher(redis as never);
    const event = makeEvent();

    await publisher.publish('events:test', event);

    const args = (redis.xadd as ReturnType<typeof vi.fn>).mock.calls[0] as unknown[];
    expect(args).toContain('MAXLEN');
    expect(args).toContain('~');
    expect(args).toContain(100_000);
  });

  // Validates REQ-COMM-009
  it('uses exact MAXLEN when approximate is false', async () => {
    const redis = mockRedis();
    const publisher = createRedisStreamPublisher(redis as never, {
      approximate: false,
      maxLen: 50_000,
    });
    const event = makeEvent();

    await publisher.publish('events:test', event);

    const args = (redis.xadd as ReturnType<typeof vi.fn>).mock.calls[0] as unknown[];
    expect(args).toContain('MAXLEN');
    expect(args).not.toContain('~');
    expect(args).toContain(50_000);
  });

  // Validates REQ-COMM-009
  it('serializes event as JSON in data field', async () => {
    const redis = mockRedis();
    const publisher = createRedisStreamPublisher(redis as never);
    const event = makeEvent();

    await publisher.publish('events:test', event);

    const args = (redis.xadd as ReturnType<typeof vi.fn>).mock.calls[0] as unknown[];
    expect(args).toContain('data');
    const dataIdx = args.indexOf('data');
    const serialized = args[dataIdx + 1] as string;
    expect(JSON.parse(serialized)).toEqual(event);
  });

  // Validates REQ-COMM-009
  it('returns ConnectionError on XADD failure', async () => {
    const redis = mockRedis({
      xadd: vi.fn().mockRejectedValue(new Error('READONLY')),
    });
    const publisher = createRedisStreamPublisher(redis as never);

    const result = await publisher.publish('events:test', makeEvent());

    expect(result.isErr()).toBe(true);
    const error = result._unsafeUnwrapErr();
    expect(error._tag).toBe('ConnectionError');
  });

  // Validates REQ-COMM-009
  it('returns SerializationError for circular references', async () => {
    const redis = mockRedis();
    const publisher = createRedisStreamPublisher(redis as never);
    const circular: Record<string, unknown> = { a: 1 };
    circular['self'] = circular;
    const event = makeEvent({ payload: circular });

    const result = await publisher.publish('events:test', event);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()._tag).toBe('SerializationError');
  });

  // Validates REQ-COMM-009
  it('publishBatch sends multiple events via pipeline', async () => {
    const redis = mockRedis();
    const publisher = createRedisStreamPublisher(redis as never);
    const events = [makeEvent({ id: 'e1' }), makeEvent({ id: 'e2' })];

    const result = await publisher.publishBatch('events:test', events);

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toHaveLength(2);
    expect(redis.pipeline).toHaveBeenCalledOnce();
  });

  // Validates REQ-COMM-009
  it('publishBatch returns ConnectionError when pipeline returns null', async () => {
    const redis = mockRedis({
      pipeline: vi.fn().mockReturnValue({
        xadd: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue(null),
      }),
    });
    const publisher = createRedisStreamPublisher(redis as never);

    const result = await publisher.publishBatch('events:test', [makeEvent()]);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()._tag).toBe('ConnectionError');
  });

  // Validates REQ-COMM-009
  it('publishBatch returns ConnectionError on pipeline entry failure', async () => {
    const redis = mockRedis({
      pipeline: vi.fn().mockReturnValue({
        xadd: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([
          [new Error('BUSYKEY'), null],
        ]),
      }),
    });
    const publisher = createRedisStreamPublisher(redis as never);

    const result = await publisher.publishBatch('events:test', [makeEvent()]);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()._tag).toBe('ConnectionError');
  });

  // Validates REQ-COMM-009
  it('publishBatch with empty array returns empty results', async () => {
    const redis = mockRedis({
      pipeline: vi.fn().mockReturnValue({
        xadd: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([]),
      }),
    });
    const publisher = createRedisStreamPublisher(redis as never);

    const result = await publisher.publishBatch('events:test', []);

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toHaveLength(0);
  });
});
