// Unit tests for RedisStreamConsumer
// Validates: REQ-COMM-011 (consumer groups, at-least-once delivery)

import { describe, it, expect, vi } from 'vitest';
import {
  createRedisStreamConsumer,
} from './stream-consumer.js';

function mockRedis(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    xgroup: vi.fn().mockResolvedValue('OK'),
    xreadgroup: vi.fn().mockResolvedValue(null),
    xack: vi.fn().mockResolvedValue(1),
    call: vi.fn().mockResolvedValue(['0-0', []]),
    ...overrides,
  };
}

describe('RedisStreamConsumer', () => {
  describe('createGroup', () => {
    // Validates REQ-COMM-011
    it('creates consumer group with MKSTREAM', async () => {
      const redis = mockRedis();
      const consumer = createRedisStreamConsumer(redis as never);

      const result = await consumer.createGroup('events:test', 'my-group');

      expect(result.isOk()).toBe(true);
      expect(redis.xgroup).toHaveBeenCalledWith(
        'CREATE', 'events:test', 'my-group', '0', 'MKSTREAM',
      );
    });

    // Validates REQ-COMM-011
    it('treats BUSYGROUP as idempotent success', async () => {
      const redis = mockRedis({
        xgroup: vi.fn().mockRejectedValue(new Error('BUSYGROUP Consumer Group name already exists')),
      });
      const consumer = createRedisStreamConsumer(redis as never);

      const result = await consumer.createGroup('events:test', 'my-group');

      expect(result.isOk()).toBe(true);
    });

    // Validates REQ-COMM-011
    it('returns GroupError on non-BUSYGROUP failure', async () => {
      const redis = mockRedis({
        xgroup: vi.fn().mockRejectedValue(new Error('WRONGTYPE')),
      });
      const consumer = createRedisStreamConsumer(redis as never);

      const result = await consumer.createGroup('events:test', 'my-group');

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()._tag).toBe('GroupError');
    });
  });

  describe('consume', () => {
    // Validates REQ-COMM-011
    it('returns empty array on timeout (null result)', async () => {
      const redis = mockRedis();
      const consumer = createRedisStreamConsumer(redis as never);

      const result = await consumer.consume('events:test', 'grp', 'c1', 10, 1000);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toEqual([]);
    });

    // Validates REQ-COMM-011
    it('parses stream entries from XREADGROUP result', async () => {
      const redis = mockRedis({
        xreadgroup: vi.fn().mockResolvedValue([
          ['events:test', [
            ['1711756800000-0', ['data', '{"type":"CrawlCompleted"}']],
            ['1711756800001-0', ['data', '{"type":"CrawlFailed"}']],
          ]],
        ]),
      });
      const consumer = createRedisStreamConsumer(redis as never);

      const result = await consumer.consume('events:test', 'grp', 'c1', 10, 1000);

      expect(result.isOk()).toBe(true);
      const entries = result._unsafeUnwrap();
      expect(entries).toHaveLength(2);
      expect(entries[0]?.entryId).toBe('1711756800000-0');
      expect(entries[0]?.data).toBe('{"type":"CrawlCompleted"}');
    });

    // Validates REQ-COMM-011
    it('skips entries without data field', async () => {
      const redis = mockRedis({
        xreadgroup: vi.fn().mockResolvedValue([
          ['events:test', [
            ['1-0', ['other', 'value']],
            ['2-0', ['data', '{"ok":true}']],
          ]],
        ]),
      });
      const consumer = createRedisStreamConsumer(redis as never);

      const result = await consumer.consume('events:test', 'grp', 'c1', 10, 1000);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toHaveLength(1);
    });

    // Validates REQ-COMM-011
    it('returns ConnectionError on failure', async () => {
      const redis = mockRedis({
        xreadgroup: vi.fn().mockRejectedValue(new Error('NOGROUP')),
      });
      const consumer = createRedisStreamConsumer(redis as never);

      const result = await consumer.consume('events:test', 'grp', 'c1', 10, 1000);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()._tag).toBe('ConnectionError');
    });
  });

  describe('ack', () => {
    // Validates REQ-COMM-011
    it('acknowledges entries and returns count', async () => {
      const redis = mockRedis({ xack: vi.fn().mockResolvedValue(2) });
      const consumer = createRedisStreamConsumer(redis as never);

      const result = await consumer.ack('events:test', 'grp', ['1-0', '2-0']);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toBe(2);
      expect(redis.xack).toHaveBeenCalledWith('events:test', 'grp', '1-0', '2-0');
    });

    // Validates REQ-COMM-011
    it('returns 0 for empty entry list without calling Redis', async () => {
      const redis = mockRedis();
      const consumer = createRedisStreamConsumer(redis as never);

      const result = await consumer.ack('events:test', 'grp', []);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toBe(0);
      expect(redis.xack).not.toHaveBeenCalled();
    });

    // Validates REQ-COMM-011
    it('returns ConnectionError on ack failure', async () => {
      const redis = mockRedis({
        xack: vi.fn().mockRejectedValue(new Error('ERR')),
      });
      const consumer = createRedisStreamConsumer(redis as never);

      const result = await consumer.ack('events:test', 'grp', ['1-0']);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()._tag).toBe('ConnectionError');
    });
  });

  describe('claimStale', () => {
    // Validates REQ-COMM-011
    it('claims stale entries via XAUTOCLAIM', async () => {
      const redis = mockRedis({
        call: vi.fn().mockResolvedValue([
          '0-0',
          [['1-0', ['data', '{"stale":true}']]],
        ]),
      });
      const consumer = createRedisStreamConsumer(redis as never);

      const result = await consumer.claimStale('events:test', 'grp', 'c1', 30_000, 10);

      expect(result.isOk()).toBe(true);
      const entries = result._unsafeUnwrap();
      expect(entries).toHaveLength(1);
      expect(entries[0]?.entryId).toBe('1-0');
    });

    // Validates REQ-COMM-011
    it('returns empty array when no stale entries', async () => {
      const redis = mockRedis();
      const consumer = createRedisStreamConsumer(redis as never);

      const result = await consumer.claimStale('events:test', 'grp', 'c1', 30_000, 10);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toHaveLength(0);
    });

    // Validates REQ-COMM-011
    it('returns ConnectionError on claim failure', async () => {
      const redis = mockRedis({
        call: vi.fn().mockRejectedValue(new Error('ERR')),
      });
      const consumer = createRedisStreamConsumer(redis as never);

      const result = await consumer.claimStale('events:test', 'grp', 'c1', 30_000, 10);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()._tag).toBe('ConnectionError');
    });
  });
});
