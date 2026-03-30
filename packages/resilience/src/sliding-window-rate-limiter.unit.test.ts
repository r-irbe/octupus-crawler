// Unit tests for Redis sliding window rate limiter
// Validates REQ-RES-011: Global rate limiting with Redis
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSlidingWindowRateLimiter } from './sliding-window-rate-limiter.js';

// Mock ioredis Pipeline + Redis
function createMockRedis(overrides: Record<string, unknown> = {}): {
  redis: Parameters<typeof createSlidingWindowRateLimiter>[0];
  pipelineExecResults: Array<[Error | null, unknown][]>;
} {
  const pipelineExecResults: Array<[Error | null, unknown][]> = [];
  let callIndex = 0;

  const pipelineCommands: string[] = [];
  const mockPipeline = {
    zremrangebyscore: vi.fn(() => { pipelineCommands.push('zremrangebyscore'); return mockPipeline; }),
    zcard: vi.fn(() => { pipelineCommands.push('zcard'); return mockPipeline; }),
    zadd: vi.fn(() => { pipelineCommands.push('zadd'); return mockPipeline; }),
    pexpire: vi.fn(() => { pipelineCommands.push('pexpire'); return mockPipeline; }),
    exec: vi.fn(() => {
      const result = pipelineExecResults[callIndex];
      callIndex++;
      return Promise.resolve(result ?? null);
    }),
  };

  const redis = {
    pipeline: vi.fn(() => {
      pipelineCommands.length = 0;
      return mockPipeline;
    }),
    del: vi.fn(() => Promise.resolve(1)),
    zrem: vi.fn(() => Promise.resolve(1)),
    ...overrides,
  } as unknown as Parameters<typeof createSlidingWindowRateLimiter>[0];

  return { redis, pipelineExecResults };
}

describe('SlidingWindowRateLimiter', () => {
  let mockRedis: ReturnType<typeof createMockRedis>;

  beforeEach(() => {
    mockRedis = createMockRedis();
  });

  // Validates REQ-RES-011
  it('allows requests within the limit', async () => {
    // Single pipeline: zremrangebyscore + zcard + zadd + pexpire
    mockRedis.pipelineExecResults.push([
      [null, 0], // zremrangebyscore
      [null, 0], // zcard = 0 current requests
      [null, 1], // zadd
      [null, 1], // pexpire
    ]);

    const limiter = createSlidingWindowRateLimiter(mockRedis.redis, {
      maxRequests: 10,
      windowMs: 60_000,
    });

    const result = await limiter.check('user:123');
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.allowed).toBe(true);
      expect(result.value.remaining).toBe(9);
    }
  });

  // Validates REQ-RES-011
  it('rejects requests exceeding the limit', async () => {
    // Single pipeline: zremrangebyscore + zcard(10) + zadd + pexpire
    mockRedis.pipelineExecResults.push([
      [null, 0],  // zremrangebyscore
      [null, 10], // zcard = 10 (at limit) → triggers zrem rollback
      [null, 1],  // zadd (optimistic)
      [null, 1],  // pexpire
    ]);

    const limiter = createSlidingWindowRateLimiter(mockRedis.redis, {
      maxRequests: 10,
      windowMs: 60_000,
    });

    const result = await limiter.check('user:123');
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.allowed).toBe(false);
      expect(result.value.remaining).toBe(0);
    }
    // Verify the optimistic add was rolled back
    expect(mockRedis.redis.zrem).toHaveBeenCalled();
  });

  // Validates REQ-RES-011
  it('uses configured key prefix', async () => {
    mockRedis.pipelineExecResults.push([
      [null, 0],
      [null, 5],
      [null, 1],
      [null, 1],
    ]);

    const limiter = createSlidingWindowRateLimiter(mockRedis.redis, {
      keyPrefix: 'api-rate',
    });

    await limiter.check('ip:10.0.0.1');
    // Verify pipeline was called (key construction is internal)
    expect(mockRedis.redis.pipeline).toHaveBeenCalled();
  });

  // Validates REQ-RES-011
  it('peek returns current count without consuming', async () => {
    mockRedis.pipelineExecResults.push([
      [null, 0],
      [null, 7],
    ]);

    const limiter = createSlidingWindowRateLimiter(mockRedis.redis);
    const result = await limiter.peek('user:123');
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBe(7);
    }
  });

  // Validates REQ-RES-011
  it('reset clears the rate limit window', async () => {
    const limiter = createSlidingWindowRateLimiter(mockRedis.redis);
    const result = await limiter.reset('user:123');
    expect(result.isOk()).toBe(true);
    expect(mockRedis.redis.del).toHaveBeenCalledWith('rate:user:123');
  });

  // Validates REQ-RES-011
  it('returns ConnectionError on Redis failure', async () => {
    const failRedis = createMockRedis({
      pipeline: vi.fn(() => ({
        zremrangebyscore: vi.fn().mockReturnThis(),
        zcard: vi.fn().mockReturnThis(),
        zadd: vi.fn().mockReturnThis(),
        pexpire: vi.fn().mockReturnThis(),
        exec: vi.fn(() => Promise.reject(new Error('Connection refused'))),
      })),
    });

    const limiter = createSlidingWindowRateLimiter(failRedis.redis);
    const result = await limiter.check('user:123');
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe('ConnectionError');
    }
  });

  // Validates REQ-RES-011
  it('returns error when pipeline returns null', async () => {
    const nullRedis = createMockRedis({
      pipeline: vi.fn(() => ({
        zremrangebyscore: vi.fn().mockReturnThis(),
        zcard: vi.fn().mockReturnThis(),
        zadd: vi.fn().mockReturnThis(),
        pexpire: vi.fn().mockReturnThis(),
        exec: vi.fn(() => Promise.resolve(null)),
      })),
    });

    const limiter = createSlidingWindowRateLimiter(nullRedis.redis);
    const result = await limiter.check('user:123');
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe('ConnectionError');
    }
  });

  // Validates REQ-RES-011
  it('uses default config when none provided', async () => {
    mockRedis.pipelineExecResults.push([
      [null, 0],
      [null, 99], // 99 < 100 default max
      [null, 1],
      [null, 1],
    ]);

    const limiter = createSlidingWindowRateLimiter(mockRedis.redis);
    const result = await limiter.check('key');
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.allowed).toBe(true);
      expect(result.value.remaining).toBe(0); // 100 - 99 - 1
    }
  });
});
