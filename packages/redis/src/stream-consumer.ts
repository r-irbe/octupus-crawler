// Redis Stream consumer — XREADGROUP-based event consumption
// Implements: T-COMM-012 (REQ-COMM-011)
// Consumer groups provide durable, at-least-once delivery

import type { Redis } from 'ioredis';
import { err, ok, type Result } from 'neverthrow';

// --- Error types ---

export type StreamConsumeError =
  | { readonly _tag: 'ConnectionError'; readonly message: string; readonly cause: unknown }
  | { readonly _tag: 'DeserializationError'; readonly message: string; readonly cause: unknown }
  | { readonly _tag: 'GroupError'; readonly message: string; readonly cause: unknown };

// --- Raw stream entry ---

export type StreamEntry = {
  readonly entryId: string;
  readonly data: string;
};

// --- Consumer interface (port) ---

export type EventConsumer = {
  readonly createGroup: (
    streamKey: string,
    groupName: string,
  ) => Promise<Result<void, StreamConsumeError>>;
  readonly consume: (
    streamKey: string,
    groupName: string,
    consumerName: string,
    count: number,
    blockMs: number,
  ) => Promise<Result<readonly StreamEntry[], StreamConsumeError>>;
  readonly ack: (
    streamKey: string,
    groupName: string,
    entryIds: readonly string[],
  ) => Promise<Result<number, StreamConsumeError>>;
  readonly claimStale: (
    streamKey: string,
    groupName: string,
    consumerName: string,
    minIdleMs: number,
    count: number,
  ) => Promise<Result<readonly StreamEntry[], StreamConsumeError>>;
};

// --- Redis Streams implementation ---

// Expected xreadgroup result shape
type XReadGroupResult = Array<[string, Array<[string, string[]]>]>;

// Expected xautoclaim result shape
type XAutoClaimResult = [string, Array<[string, string[]]>];

export function createRedisStreamConsumer(redis: Redis): EventConsumer {
  return {
    async createGroup(
      streamKey: string,
      groupName: string,
    ): Promise<Result<void, StreamConsumeError>> {
      try {
        await redis.xgroup('CREATE', streamKey, groupName, '0', 'MKSTREAM');
        return ok(undefined);
      } catch (cause: unknown) {
        const message = cause instanceof Error ? cause.message : String(cause);
        if (message.includes('BUSYGROUP')) {
          return ok(undefined); // Group already exists — idempotent
        }
        return err({
          _tag: 'GroupError',
          message: `Failed to create consumer group ${groupName} on ${streamKey}`,
          cause,
        });
      }
    },

    async consume(
      streamKey: string,
      groupName: string,
      consumerName: string,
      count: number,
      blockMs: number,
    ): Promise<Result<readonly StreamEntry[], StreamConsumeError>> {
      try {
        const raw = await redis.xreadgroup(
          'GROUP', groupName, consumerName,
          'COUNT', count,
          'BLOCK', blockMs,
          'STREAMS', streamKey,
          '>',
        );

        // xreadgroup returns null on BLOCK timeout (runtime behavior),
        // but ioredis types don't reflect this — cast to handle both
        const result = raw as unknown as XReadGroupResult | null;
        if (result === null || result.length === 0) {
          return ok([]); // Timeout — no new entries
        }

        const entries: StreamEntry[] = [];
        const typed = result as unknown as XReadGroupResult;
        for (const [, streamEntries] of typed) {
          for (const [entryId, fields] of streamEntries) {
            const dataIndex = fields.indexOf('data');
            if (dataIndex === -1 || dataIndex + 1 >= fields.length) {
              continue; // Skip entries without 'data' field
            }
            const data = fields[dataIndex + 1];
            if (typeof data === 'string') {
              entries.push({ entryId, data });
            }
          }
        }

        return ok(entries);
      } catch (cause: unknown) {
        return err({
          _tag: 'ConnectionError',
          message: `Failed to consume from ${streamKey}/${groupName}`,
          cause,
        });
      }
    },

    async ack(
      streamKey: string,
      groupName: string,
      entryIds: readonly string[],
    ): Promise<Result<number, StreamConsumeError>> {
      if (entryIds.length === 0) {
        return ok(0);
      }

      try {
        const count = await redis.xack(streamKey, groupName, ...entryIds);
        return ok(count);
      } catch (cause: unknown) {
        return err({
          _tag: 'ConnectionError',
          message: `Failed to ack entries on ${streamKey}/${groupName}`,
          cause,
        });
      }
    },

    async claimStale(
      streamKey: string,
      groupName: string,
      consumerName: string,
      minIdleMs: number,
      count: number,
    ): Promise<Result<readonly StreamEntry[], StreamConsumeError>> {
      try {
        const result = await redis.call(
          'XAUTOCLAIM', streamKey, groupName, consumerName,
          String(minIdleMs), '0-0', 'COUNT', String(count),
        ) as XAutoClaimResult;

        const entries: StreamEntry[] = [];
        const claimed = result[1];
        for (const [entryId, fields] of claimed) {
          const dataIndex = fields.indexOf('data');
          if (dataIndex === -1 || dataIndex + 1 >= fields.length) {
            continue;
          }
          const data = fields[dataIndex + 1];
          if (typeof data === 'string') {
            entries.push({ entryId, data });
          }
        }

        return ok(entries);
      } catch (cause: unknown) {
        return err({
          _tag: 'ConnectionError',
          message: `Failed to claim stale entries on ${streamKey}/${groupName}`,
          cause,
        });
      }
    },
  };
}
