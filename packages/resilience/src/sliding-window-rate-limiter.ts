// Redis sliding window rate limiter — global API rate limiting
// Implements: T-RES-010 (REQ-RES-011)
// Design: docs/specs/resilience-patterns/design.md §Rate Limiter Design

import type { Redis } from 'ioredis';
import { ok, err, type Result } from 'neverthrow';

export type SlidingWindowConfig = {
  /** Maximum requests allowed in the window. */
  readonly maxRequests: number;
  /** Window duration in milliseconds. */
  readonly windowMs: number;
  /** Key prefix for rate limit keys. */
  readonly keyPrefix: string;
};

export const DEFAULT_SLIDING_WINDOW_CONFIG: SlidingWindowConfig = {
  maxRequests: 100,
  windowMs: 60_000,
  keyPrefix: 'rate',
} as const;

export type RateLimitResult = {
  readonly allowed: boolean;
  readonly remaining: number;
  readonly resetMs: number;
};

export type RateLimitError =
  | { readonly _tag: 'ConnectionError'; readonly message: string }
  | { readonly _tag: 'ScriptError'; readonly message: string };

export type SlidingWindowRateLimiter = {
  /** Check if the request is within the rate limit. Adds the request if allowed. */
  readonly check: (key: string) => Promise<Result<RateLimitResult, RateLimitError>>;
  /** Get current count without consuming. */
  readonly peek: (key: string) => Promise<Result<number, RateLimitError>>;
  /** Reset a key's rate limit window. */
  readonly reset: (key: string) => Promise<Result<void, RateLimitError>>;
};

/**
 * Creates a Redis-backed sliding window rate limiter.
 * REQ-RES-011: Keyed by IP/user, configurable window and limit.
 * Uses sorted sets: ZADD timestamp, ZREMRANGEBYSCORE, ZCARD.
 */
export function createSlidingWindowRateLimiter(
  redis: Redis,
  config: Partial<SlidingWindowConfig> = {},
): SlidingWindowRateLimiter {
  const maxRequests = config.maxRequests ?? DEFAULT_SLIDING_WINDOW_CONFIG.maxRequests;
  const windowMs = config.windowMs ?? DEFAULT_SLIDING_WINDOW_CONFIG.windowMs;
  const keyPrefix = config.keyPrefix ?? DEFAULT_SLIDING_WINDOW_CONFIG.keyPrefix;

  function buildKey(key: string): string {
    return `${keyPrefix}:${key}`;
  }

  async function check(key: string): Promise<Result<RateLimitResult, RateLimitError>> {
    const redisKey = buildKey(key);
    const now = Date.now();
    const windowStart = now - windowMs;

    try {
      // Single pipeline: cleanup + count + add + expire (atomic, one round-trip)
      const member = `${String(now)}:${Math.random().toString(36).slice(2, 8)}`;
      const pipeline = redis.pipeline();
      pipeline.zremrangebyscore(redisKey, 0, windowStart); // [0] cleanup
      pipeline.zcard(redisKey);                             // [1] count after cleanup
      pipeline.zadd(redisKey, now, member);                 // [2] optimistic add
      pipeline.pexpire(redisKey, windowMs);                 // [3] set TTL
      const results = await pipeline.exec();

      if (results === null) {
        return err({ _tag: 'ConnectionError', message: 'Pipeline returned null' });
      }

      const zcardResult = results[1];
      if (zcardResult === undefined) {
        return err({ _tag: 'ScriptError', message: 'Missing zcard result' });
      }
      const [zcardErr, currentCount] = zcardResult;
      if (zcardErr !== null) {
        return err({ _tag: 'ScriptError', message: String(zcardErr) });
      }

      const count = currentCount as number;

      if (count >= maxRequests) {
        // Over limit — remove the optimistic add
        await redis.zrem(redisKey, member);
        return ok({
          allowed: false,
          remaining: 0,
          resetMs: windowMs,
        });
      }

      return ok({
        allowed: true,
        remaining: maxRequests - count - 1,
        resetMs: windowMs,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return err({ _tag: 'ConnectionError', message });
    }
  }

  async function peek(key: string): Promise<Result<number, RateLimitError>> {
    const redisKey = buildKey(key);
    const now = Date.now();
    const windowStart = now - windowMs;

    try {
      const pipeline = redis.pipeline();
      pipeline.zremrangebyscore(redisKey, 0, windowStart);
      pipeline.zcard(redisKey);
      const results = await pipeline.exec();

      if (results === null) {
        return err({ _tag: 'ConnectionError', message: 'Pipeline returned null' });
      }

      const zcardResult = results[1];
      if (zcardResult === undefined) {
        return err({ _tag: 'ScriptError', message: 'Missing zcard result' });
      }
      const [zcardErr, count] = zcardResult;
      if (zcardErr !== null) {
        return err({ _tag: 'ScriptError', message: String(zcardErr) });
      }

      return ok(count as number);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return err({ _tag: 'ConnectionError', message });
    }
  }

  async function reset(key: string): Promise<Result<void, RateLimitError>> {
    try {
      await redis.del(buildKey(key));
      return ok(undefined);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return err({ _tag: 'ConnectionError', message });
    }
  }

  return { check, peek, reset };
}
