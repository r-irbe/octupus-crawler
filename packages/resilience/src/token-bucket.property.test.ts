// Token bucket property tests
// Property for REQ-RES-010: token bucket invariants
// Implements: T-RES-022

import { describe, expect } from 'vitest';
import { fc, test as fcTest } from '@fast-check/vitest';
import { createTokenBucketLimiter } from './token-bucket.js';

const arbMaxTokens = fc.integer({ min: 1, max: 100 });
const arbRefillRate = fc.integer({ min: 1, max: 100 });
const arbElapsedSeconds = fc.integer({ min: 1, max: 10 });
const arbAttempts = fc.integer({ min: 1, max: 100 });

describe('token bucket properties', () => {
  // Property: Never exceeds maxTokens
  fcTest.prop([arbMaxTokens, arbRefillRate])(
    'tokens never exceed maxTokens',
    (maxTokens: number, refillRate: number) => {
      let time = 0;
      const limiter = createTokenBucketLimiter(
        { maxTokens, refillRate },
        () => time,
      );
      // Advance a large amount of time
      time = 100_000;
      const tokens = limiter.getTokens('test.com');
      expect(tokens).toBeLessThanOrEqual(maxTokens);
    },
  );

  // Property: Burst allows exactly maxTokens immediate acquisitions
  fcTest.prop([arbMaxTokens])(
    'fresh bucket allows exactly maxTokens acquisitions',
    (maxTokens: number) => {
      const limiter = createTokenBucketLimiter({ maxTokens, refillRate: 0.001 });
      let acquired = 0;
      for (let i = 0; i < maxTokens + 5; i++) {
        if (limiter.tryAcquire('test.com')) {
          acquired++;
        }
      }
      expect(acquired).toBe(maxTokens);
    },
  );

  // Property: Refill restores tokens proportional to elapsed time
  fcTest.prop([arbMaxTokens, arbRefillRate, arbElapsedSeconds])(
    'refill restores tokens proportionally',
    (maxTokens: number, refillRate: number, elapsedSeconds: number) => {
      let time = 0;
      const limiter = createTokenBucketLimiter(
        { maxTokens, refillRate },
        () => time,
      );
      // Exhaust all tokens
      for (let i = 0; i < maxTokens; i++) {
        limiter.tryAcquire('test.com');
      }
      // Advance time
      time = elapsedSeconds * 1_000;
      const tokens = limiter.getTokens('test.com');
      const expected = Math.min(maxTokens, refillRate * elapsedSeconds);
      // Allow small floating-point tolerance
      expect(tokens).toBeGreaterThanOrEqual(expected - 0.01);
      expect(tokens).toBeLessThanOrEqual(maxTokens);
    },
  );

  // Property: Different domains are isolated
  fcTest.prop([arbMaxTokens])(
    'domains are isolated',
    (maxTokens: number) => {
      const limiter = createTokenBucketLimiter({ maxTokens, refillRate: 0.001 });
      // Exhaust domain A
      for (let i = 0; i < maxTokens; i++) {
        limiter.tryAcquire('a.test.com');
      }
      expect(limiter.tryAcquire('a.test.com')).toBe(false);
      // Domain B should still have tokens
      expect(limiter.tryAcquire('b.test.com')).toBe(true);
    },
  );

  // Property: Tokens are always non-negative
  fcTest.prop([arbMaxTokens, arbAttempts])(
    'tokens are always non-negative',
    (maxTokens: number, attempts: number) => {
      const limiter = createTokenBucketLimiter({ maxTokens, refillRate: 0.001 });
      for (let i = 0; i < attempts; i++) {
        limiter.tryAcquire('test.com');
      }
      expect(limiter.getTokens('test.com')).toBeGreaterThanOrEqual(0);
    },
  );
});
