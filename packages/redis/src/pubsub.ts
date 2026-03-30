// Redis Pub/Sub wrapper — fire-and-forget ephemeral notifications
// Implements: T-COMM-022 (REQ-COMM-019)
// REQ-COMM-019: Cache invalidation and live status via Pub/Sub (no delivery guarantees)

import type { Redis } from 'ioredis';
import { ok, err, type Result } from 'neverthrow';

// --- Error types ---

export type PubSubError =
  | { readonly _tag: 'ConnectionError'; readonly message: string }
  | { readonly _tag: 'SerializationError'; readonly message: string };

// --- Message handler ---

export type PubSubMessageHandler = (channel: string, message: string) => void;

// --- Publisher ---

export type PubSubPublisher = {
  readonly publish: (channel: string, message: string) => Promise<Result<number, PubSubError>>;
  readonly publishJson: (channel: string, data: Record<string, unknown>) => Promise<Result<number, PubSubError>>;
};

export function createPubSubPublisher(redis: Redis): PubSubPublisher {
  return {
    async publish(channel: string, message: string): Promise<Result<number, PubSubError>> {
      try {
        const receivers = await redis.publish(channel, message);
        return ok(receivers);
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        return err({ _tag: 'ConnectionError', message: msg });
      }
    },

    async publishJson(channel: string, data: Record<string, unknown>): Promise<Result<number, PubSubError>> {
      let serialized: string;
      try {
        serialized = JSON.stringify(data);
      } catch {
        return err({ _tag: 'SerializationError', message: 'Failed to serialize message' });
      }

      try {
        const receivers = await redis.publish(channel, serialized);
        return ok(receivers);
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        return err({ _tag: 'ConnectionError', message: msg });
      }
    },
  };
}

// --- Subscriber ---

export type PubSubSubscriber = {
  readonly subscribe: (channel: string, handler: PubSubMessageHandler) => Promise<Result<void, PubSubError>>;
  readonly unsubscribe: (channel: string) => Promise<Result<void, PubSubError>>;
  readonly close: () => Promise<void>;
};

/**
 * Creates a Pub/Sub subscriber. Requires a DEDICATED Redis connection
 * (ioredis enters subscriber mode and can't execute other commands).
 */
export function createPubSubSubscriber(subscriberRedis: Redis): PubSubSubscriber {
  const handlers = new Map<string, PubSubMessageHandler>();

  subscriberRedis.on('message', (channel: string, message: string) => {
    const handler = handlers.get(channel);
    if (handler) {
      handler(channel, message);
    }
  });

  return {
    async subscribe(channel: string, handler: PubSubMessageHandler): Promise<Result<void, PubSubError>> {
      try {
        handlers.set(channel, handler);
        await subscriberRedis.subscribe(channel);
        return ok(undefined);
      } catch (error: unknown) {
        handlers.delete(channel);
        const msg = error instanceof Error ? error.message : String(error);
        return err({ _tag: 'ConnectionError', message: msg });
      }
    },

    async unsubscribe(channel: string): Promise<Result<void, PubSubError>> {
      try {
        handlers.delete(channel);
        await subscriberRedis.unsubscribe(channel);
        return ok(undefined);
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        return err({ _tag: 'ConnectionError', message: msg });
      }
    },

    async close(): Promise<void> {
      handlers.clear();
      await subscriberRedis.quit();
    },
  };
}
