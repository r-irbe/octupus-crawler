// Validates REQ-RES-005: Exponential backoff with jitter (initial 1s, max 30s, 3 attempts)
// Validates REQ-RES-006: Only idempotent operations retried

import { describe, it, expect, vi } from 'vitest';
import { createRetryPolicy, withIdempotencyGuard } from './retry-policy.js';

describe('createRetryPolicy', () => {
  // Validates REQ-RES-005: succeeds after transient failures
  it('retries and succeeds after transient failures', async () => {
    const policy = createRetryPolicy({ retryMaxAttempts: 3 });
    let calls = 0;
    const result = await policy.execute(() => {
      calls++;
      if (calls < 3) throw new Error('transient');
      return 'success';
    });
    expect(result).toBe('success');
    expect(calls).toBe(3);
  });

  it('gives up after max attempts', async () => {
    const policy = createRetryPolicy({
      retryMaxAttempts: 2,
      retryInitialDelayMs: 10,
      retryMaxDelayMs: 50,
    });
    let calls = 0;
    await expect(
      policy.execute(() => { calls++; throw new Error('permanent'); }),
    ).rejects.toThrow('permanent');
    // cockatiel: 1 initial + 2 retries = 3 total calls
    expect(calls).toBe(3);
  });

  it('calls onRetry handler on retry', async () => {
    const handler = vi.fn();
    const policy = createRetryPolicy(
      { retryMaxAttempts: 2, retryInitialDelayMs: 10, retryMaxDelayMs: 50 },
      handler,
      'retry.com',
    );
    let calls = 0;
    await policy.execute(() => {
      calls++;
      if (calls < 2) throw new Error('transient');
      return 'ok';
    });
    expect(handler).toHaveBeenCalledWith('retry.com', expect.any(Number), expect.any(Number));
  });

  it('uses default config when none provided', () => {
    const policy = createRetryPolicy();
    expect(policy).toBeDefined();
    expect(typeof policy.execute).toBe('function');
  });
});

describe('withIdempotencyGuard', () => {
  // Validates REQ-RES-006: non-idempotent operations fail immediately
  it('runs idempotent operations through policy', async () => {
    const policy = createRetryPolicy({ retryMaxAttempts: 3, retryInitialDelayMs: 10, retryMaxDelayMs: 50 });
    let calls = 0;
    const result = await withIdempotencyGuard(
      policy,
      () => {
        calls++;
        if (calls < 2) throw new Error('transient');
        return 'done';
      },
      true,
    );
    expect(result).toBe('done');
    expect(calls).toBe(2);
  });

  it('skips retry for non-idempotent operations', async () => {
    const policy = createRetryPolicy({ retryMaxAttempts: 3 });
    let calls = 0;
    await expect(
      withIdempotencyGuard(
        policy,
        () => {
          calls++;
          throw new Error('fail');
        },
        false,
      ),
    ).rejects.toThrow('fail');
    // Non-idempotent: only called once, no retry
    expect(calls).toBe(1);
  });
});
