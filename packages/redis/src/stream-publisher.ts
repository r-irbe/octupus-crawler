// Redis Stream publisher — XADD-based event publishing
// Implements: T-COMM-011 (REQ-COMM-009)
// Domain events published to Redis Streams as JSON-encoded entries

import type { Redis } from 'ioredis';
import { err, ok, type Result } from 'neverthrow';

// --- Error types ---

export type StreamPublishError =
  | { readonly _tag: 'ConnectionError'; readonly message: string; readonly cause: unknown }
  | { readonly _tag: 'SerializationError'; readonly message: string; readonly cause: unknown };

// --- Event envelope for transport ---

export type StreamEvent = {
  readonly type: string;
  readonly version: number;
  readonly payload: Record<string, unknown>;
  readonly id: string;
  readonly timestamp: string;
  readonly source: string;
};

// --- Publisher interface (port) ---

export type EventPublisher = {
  readonly publish: (
    streamKey: string,
    event: StreamEvent,
  ) => Promise<Result<string, StreamPublishError>>;
  readonly publishBatch: (
    streamKey: string,
    events: readonly StreamEvent[],
  ) => Promise<Result<readonly string[], StreamPublishError>>;
};

// --- Redis Streams implementation ---

export type RedisStreamPublisherConfig = {
  readonly maxLen: number;
  readonly approximate: boolean;
};

const DEFAULT_CONFIG: RedisStreamPublisherConfig = {
  maxLen: 100_000,
  approximate: true,
};

export function createRedisStreamPublisher(
  redis: Redis,
  config: Partial<RedisStreamPublisherConfig> = {},
): EventPublisher {
  const resolved: RedisStreamPublisherConfig = {
    maxLen: config.maxLen ?? DEFAULT_CONFIG.maxLen,
    approximate: config.approximate ?? DEFAULT_CONFIG.approximate,
  };

  return {
    async publish(
      streamKey: string,
      event: StreamEvent,
    ): Promise<Result<string, StreamPublishError>> {
      let serialized: string;
      try {
        serialized = JSON.stringify(event);
      } catch (cause: unknown) {
        return err({
          _tag: 'SerializationError',
          message: 'Failed to serialize event',
          cause,
        });
      }

      try {
        const args: (string | number)[] = [
          streamKey,
          resolved.approximate ? 'MAXLEN' : 'MAXLEN',
          ...(resolved.approximate ? ['~', resolved.maxLen] : [resolved.maxLen]),
          '*',
          'data',
          serialized,
        ];

        const entryId = await redis.xadd(...(args as [string, ...Array<string | number>]));
        return ok(entryId as string);
      } catch (cause: unknown) {
        return err({
          _tag: 'ConnectionError',
          message: `Failed to publish to stream ${streamKey}`,
          cause,
        });
      }
    },

    async publishBatch(
      streamKey: string,
      events: readonly StreamEvent[],
    ): Promise<Result<readonly string[], StreamPublishError>> {
      const ids: string[] = [];
      const pipeline = redis.pipeline();

      for (const event of events) {
        let serialized: string;
        try {
          serialized = JSON.stringify(event);
        } catch (cause: unknown) {
          return err({
            _tag: 'SerializationError',
            message: 'Failed to serialize event in batch',
            cause,
          });
        }

        if (resolved.approximate) {
          pipeline.xadd(streamKey, 'MAXLEN', '~', String(resolved.maxLen), '*', 'data', serialized);
        } else {
          pipeline.xadd(streamKey, 'MAXLEN', String(resolved.maxLen), '*', 'data', serialized);
        }
      }

      try {
        const results = await pipeline.exec();
        if (results === null) {
          return err({
            _tag: 'ConnectionError',
            message: 'Pipeline returned null — connection lost',
            cause: undefined,
          });
        }

        for (const [pipeErr, result] of results) {
          if (pipeErr !== null) {
            return err({
              _tag: 'ConnectionError',
              message: `Pipeline entry failed: ${String(pipeErr)}`,
              cause: pipeErr,
            });
          }
          ids.push(result as string);
        }

        return ok(ids);
      } catch (cause: unknown) {
        return err({
          _tag: 'ConnectionError',
          message: `Failed to execute batch publish to ${streamKey}`,
          cause,
        });
      }
    },
  };
}
