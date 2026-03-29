// Property tests for retry backoff bounds
// Property for REQ-RES-005: exponential backoff with jitter within bounds
// Implements: T-RES-023

import { describe, expect } from 'vitest';
import { fc, test as fcTest } from '@fast-check/vitest';
import { createRetryPolicy } from './retry-policy.js';

// Arbitrary: retry config — small delays to avoid test timeouts
const arbRetryConfig = fc.record({
  retryMaxAttempts: fc.integer({ min: 1, max: 3 }),
  retryInitialDelayMs: fc.constant(10),
  retryMaxDelayMs: fc.constant(50),
});

describe('Retry policy backoff properties', () => {
  // Property for REQ-RES-005: retry eventually succeeds if failure is transient
  // cockatiel: total allowed calls = 1 initial + maxAttempts retries
  fcTest.prop([arbRetryConfig, fc.integer({ min: 1, max: 3 })])(
    'retry succeeds if failure count < total allowed attempts',
    async (config, failCount: number) => {
      const totalAllowed = config.retryMaxAttempts + 1;
      fc.pre(failCount < totalAllowed);
      const policy = createRetryPolicy(config);

      let calls = 0;
      const result = await policy.execute(() => {
        calls++;
        if (calls <= failCount) throw new Error('transient');
        return 'success';
      });

      expect(result).toBe('success');
      expect(calls).toBe(failCount + 1);
    },
  );

  // Property for REQ-RES-005: retry gives up after maxAttempts
  // cockatiel maxAttempts = number of retries; total calls = 1 initial + maxAttempts
  fcTest.prop([arbRetryConfig])(
    'retry gives up after maxAttempts permanent failures',
    async (config) => {
      const policy = createRetryPolicy(config);

      let calls = 0;
      try {
        await policy.execute(() => {
          calls++;
          throw new Error('permanent');
        });
      } catch {
        // expected
      }

      // cockatiel: 1 initial attempt + maxAttempts retries
      expect(calls).toBe(config.retryMaxAttempts + 1);
    },
  );

  // Property for REQ-RES-005: backoff delays are non-negative
  fcTest.prop([arbRetryConfig])(
    'backoff delays are non-negative',
    async (config) => {
      const delays: number[] = [];
      const policy = createRetryPolicy(
        config,
        (_domain, _attempt, delay) => { delays.push(delay); },
        'test.com',
      );

      try {
        await policy.execute(() => { throw new Error('fail'); });
      } catch {
        // expected
      }

      for (const delay of delays) {
        expect(delay).toBeGreaterThanOrEqual(0);
      }
    },
  );

  // Property for REQ-RES-005: max delay is respected
  fcTest.prop([arbRetryConfig])(
    'backoff delay never exceeds maxDelay',
    async (config) => {
      const delays: number[] = [];
      const policy = createRetryPolicy(
        config,
        (_domain, _attempt, delay) => { delays.push(delay); },
        'test.com',
      );

      try {
        await policy.execute(() => { throw new Error('fail'); });
      } catch {
        // expected
      }

      for (const delay of delays) {
        expect(delay).toBeLessThanOrEqual(config.retryMaxDelayMs);
      }
    },
  );
});
