// Integration test: Redis sliding window rate limiter with Testcontainers
// Validates REQ-RES-011: Global rate limiting with real Redis
// Implements: T-RES-024
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Redis } from 'ioredis';
import { startRedisContainer, type ManagedRedisContainer } from '@ipf/testing/containers/redis';
import { createSlidingWindowRateLimiter } from './sliding-window-rate-limiter.js';

describe('SlidingWindowRateLimiter (integration)', () => {
  let container: ManagedRedisContainer;
  let redis: Redis;

  beforeAll(async () => {
    container = await startRedisContainer();
    redis = new Redis({
      host: container.connection.host,
      port: container.connection.port,
      maxRetriesPerRequest: null,
      lazyConnect: false,
    });
  }, 30_000);

  afterAll(async () => {
    await redis.quit();
    await container.stop();
  });

  // Validates REQ-RES-011
  it('allows requests within limit', async () => {
    const limiter = createSlidingWindowRateLimiter(redis, {
      maxRequests: 5,
      windowMs: 10_000,
      keyPrefix: 'test-allow',
    });

    const result = await limiter.check('user:1');
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.allowed).toBe(true);
      expect(result.value.remaining).toBe(4);
    }
  });

  // Validates REQ-RES-011
  it('blocks requests exceeding limit', async () => {
    const limiter = createSlidingWindowRateLimiter(redis, {
      maxRequests: 3,
      windowMs: 10_000,
      keyPrefix: 'test-block',
    });

    // Consume all 3 tokens
    for (let i = 0; i < 3; i++) {
      const r = await limiter.check('user:2');
      expect(r.isOk()).toBe(true);
      if (r.isOk()) {
        expect(r.value.allowed).toBe(true);
      }
    }

    // 4th request should be blocked
    const blocked = await limiter.check('user:2');
    expect(blocked.isOk()).toBe(true);
    if (blocked.isOk()) {
      expect(blocked.value.allowed).toBe(false);
      expect(blocked.value.remaining).toBe(0);
    }
  });

  // Validates REQ-RES-011
  it('peek returns count without consuming', async () => {
    const limiter = createSlidingWindowRateLimiter(redis, {
      maxRequests: 10,
      windowMs: 10_000,
      keyPrefix: 'test-peek',
    });

    await limiter.check('user:3');
    await limiter.check('user:3');

    const count = await limiter.peek('user:3');
    expect(count.isOk()).toBe(true);
    if (count.isOk()) {
      expect(count.value).toBe(2);
    }
  });

  // Validates REQ-RES-011
  it('reset clears the rate limit', async () => {
    const limiter = createSlidingWindowRateLimiter(redis, {
      maxRequests: 2,
      windowMs: 10_000,
      keyPrefix: 'test-reset',
    });

    await limiter.check('user:4');
    await limiter.check('user:4');

    // Should be at limit
    const atLimit = await limiter.check('user:4');
    expect(atLimit.isOk()).toBe(true);
    if (atLimit.isOk()) {
      expect(atLimit.value.allowed).toBe(false);
    }

    // Reset and retry
    await limiter.reset('user:4');
    const afterReset = await limiter.check('user:4');
    expect(afterReset.isOk()).toBe(true);
    if (afterReset.isOk()) {
      expect(afterReset.value.allowed).toBe(true);
    }
  });

  // Validates REQ-RES-011
  it('isolates different keys', async () => {
    const limiter = createSlidingWindowRateLimiter(redis, {
      maxRequests: 1,
      windowMs: 10_000,
      keyPrefix: 'test-isolate',
    });

    await limiter.check('ip:10.0.0.1');
    await limiter.check('ip:10.0.0.2');

    // Key 1 should be at limit
    const k1 = await limiter.check('ip:10.0.0.1');
    expect(k1.isOk()).toBe(true);
    if (k1.isOk()) {
      expect(k1.value.allowed).toBe(false);
    }

    // Key 2 should also be at limit
    const k2 = await limiter.check('ip:10.0.0.2');
    expect(k2.isOk()).toBe(true);
    if (k2.isOk()) {
      expect(k2.value.allowed).toBe(false);
    }
  });
});
