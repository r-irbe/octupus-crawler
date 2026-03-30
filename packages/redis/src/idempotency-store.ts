// Idempotency key store — Redis-backed request deduplication
// Implements: T-COMM-021 (REQ-COMM-021, REQ-COMM-022)
// REQ-COMM-021: All mutating endpoints support Idempotency-Key header
// REQ-COMM-022: Known keys return cached response without re-execution

import type { Redis } from 'ioredis';
import { ok, err, type Result } from 'neverthrow';
import { z } from 'zod';

// --- Configuration ---

export type IdempotencyConfig = {
  readonly ttlMs: number;
  readonly keyPrefix: string;
};

export const DEFAULT_IDEMPOTENCY_CONFIG: IdempotencyConfig = {
  ttlMs: 24 * 60 * 60 * 1_000, // 24 hours
  keyPrefix: 'idem',
} as const;

// --- Error types ---

export type IdempotencyError =
  | { readonly _tag: 'ConnectionError'; readonly message: string }
  | { readonly _tag: 'SerializationError'; readonly message: string };

// --- Cached response ---

const CachedResponseSchema = z.object({
  statusCode: z.number(),
  body: z.string(),
  contentType: z.string(),
});

export type CachedResponse = z.infer<typeof CachedResponseSchema>;

// --- Idempotency store ---

export type IdempotencyStore = {
  readonly get: (key: string) => Promise<Result<CachedResponse | undefined, IdempotencyError>>;
  readonly set: (key: string, response: CachedResponse) => Promise<Result<void, IdempotencyError>>;
  readonly delete: (key: string) => Promise<Result<void, IdempotencyError>>;
};

export function createIdempotencyStore(
  redis: Redis,
  config: Partial<IdempotencyConfig> = {},
): IdempotencyStore {
  const ttlMs = config.ttlMs ?? DEFAULT_IDEMPOTENCY_CONFIG.ttlMs;
  const keyPrefix = config.keyPrefix ?? DEFAULT_IDEMPOTENCY_CONFIG.keyPrefix;

  function buildKey(key: string): string {
    return `${keyPrefix}:${key}`;
  }

  return {
    async get(key: string): Promise<Result<CachedResponse | undefined, IdempotencyError>> {
      try {
        const raw = await redis.get(buildKey(key));
        if (raw === null) {
          return ok(undefined);
        }
        const json: unknown = JSON.parse(raw);
        const parsed = CachedResponseSchema.safeParse(json);
        if (!parsed.success) {
          return err({ _tag: 'SerializationError', message: `Invalid cached response: ${parsed.error.message}` });
        }
        return ok(parsed.data);
      } catch (error: unknown) {
        if (error instanceof SyntaxError) {
          return err({ _tag: 'SerializationError', message: `Malformed JSON in cache: ${error.message}` });
        }
        const message = error instanceof Error ? error.message : String(error);
        return err({ _tag: 'ConnectionError', message });
      }
    },

    async set(key: string, response: CachedResponse): Promise<Result<void, IdempotencyError>> {
      try {
        const serialized = JSON.stringify(response);
        await redis.set(buildKey(key), serialized, 'PX', ttlMs);
        return ok(undefined);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return err({ _tag: 'ConnectionError', message });
      }
    },

    async delete(key: string): Promise<Result<void, IdempotencyError>> {
      try {
        await redis.del(buildKey(key));
        return ok(undefined);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return err({ _tag: 'ConnectionError', message });
      }
    },
  };
}
