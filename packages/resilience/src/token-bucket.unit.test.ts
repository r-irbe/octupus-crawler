// Token bucket rate limiter — unit tests
// Validates REQ-RES-010

import { describe, it, expect } from 'vitest';
import { createTokenBucketLimiter, DEFAULT_TOKEN_BUCKET_CONFIG } from './token-bucket.js';

describe('createTokenBucketLimiter', () => {
  it('allows requests up to maxTokens burst', () => {
    const limiter = createTokenBucketLimiter({ maxTokens: 3, refillRate: 1 });
    expect(limiter.tryAcquire('example.com')).toBe(true);
    expect(limiter.tryAcquire('example.com')).toBe(true);
    expect(limiter.tryAcquire('example.com')).toBe(true);
    expect(limiter.tryAcquire('example.com')).toBe(false);
  });

  it('refills tokens over time', () => {
    let time = 0;
    const limiter = createTokenBucketLimiter(
      { maxTokens: 2, refillRate: 1 },
      () => time,
    );
    // Exhaust tokens
    limiter.tryAcquire('a.com');
    limiter.tryAcquire('a.com');
    expect(limiter.tryAcquire('a.com')).toBe(false);

    // Advance 1 second — 1 token refills
    time = 1_000;
    expect(limiter.tryAcquire('a.com')).toBe(true);
    expect(limiter.tryAcquire('a.com')).toBe(false);
  });

  it('isolates domains', () => {
    const limiter = createTokenBucketLimiter({ maxTokens: 1, refillRate: 1 });
    expect(limiter.tryAcquire('a.com')).toBe(true);
    expect(limiter.tryAcquire('a.com')).toBe(false);
    // Different domain still has tokens
    expect(limiter.tryAcquire('b.com')).toBe(true);
  });

  it('does not exceed maxTokens on refill', () => {
    let time = 0;
    const limiter = createTokenBucketLimiter(
      { maxTokens: 2, refillRate: 10 },
      () => time,
    );
    // Advance 10 seconds (100 tokens worth of refill)
    time = 10_000;
    expect(limiter.getTokens('a.com')).toBeLessThanOrEqual(2);
  });

  it('returns maxTokens for unknown domain', () => {
    const limiter = createTokenBucketLimiter({ maxTokens: 5 });
    expect(limiter.getTokens('unknown.com')).toBe(5);
  });

  it('reset removes domain bucket', () => {
    const limiter = createTokenBucketLimiter({ maxTokens: 1 });
    limiter.tryAcquire('a.com');
    expect(limiter.tryAcquire('a.com')).toBe(false);
    limiter.reset('a.com');
    expect(limiter.tryAcquire('a.com')).toBe(true);
  });

  it('clear removes all buckets', () => {
    const limiter = createTokenBucketLimiter({ maxTokens: 1 });
    limiter.tryAcquire('a.com');
    limiter.tryAcquire('b.com');
    expect(limiter.size()).toBe(2);
    limiter.clear();
    expect(limiter.size()).toBe(0);
  });

  it('uses default config values', () => {
    expect(DEFAULT_TOKEN_BUCKET_CONFIG.maxTokens).toBe(2);
    expect(DEFAULT_TOKEN_BUCKET_CONFIG.refillRate).toBe(1);
  });
});
