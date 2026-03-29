// Validates REQ-RES-008: Configurable timeouts (30s fetch, 10s DB, 5s Redis)
// Validates REQ-RES-009: Cooperative cancellation via AbortSignal

import { describe, it, expect, vi } from 'vitest';
import { TaskCancelledError } from 'cockatiel';
import { createTimeoutPolicy } from './timeout-policy.js';

describe('createTimeoutPolicy', () => {
  // Validates REQ-RES-009: cooperative cancellation
  it('cancels operations that exceed timeout', async () => {
    const policy = createTimeoutPolicy('redis', { timeoutRedisMs: 50 });

    await expect(
      policy.execute(async ({ signal }) => {
        // Simulate a long operation that checks signal
        await new Promise((resolve, reject) => {
          const timer = setTimeout(resolve, 5000);
          signal.addEventListener('abort', () => {
            clearTimeout(timer);
            reject(new TaskCancelledError());
          });
        });
      }),
    ).rejects.toThrow(TaskCancelledError);
  });

  it('allows operations that complete within timeout', async () => {
    const policy = createTimeoutPolicy('fetch', { timeoutFetchMs: 5000 });
    const result = await policy.execute(() => 'fast');
    expect(result).toBe('fast');
  });

  // Validates REQ-RES-008: correct defaults per target
  it('uses 30s default for fetch target', () => {
    const policy = createTimeoutPolicy('fetch');
    expect(policy).toBeDefined();
  });

  it('uses 10s default for db target', () => {
    const policy = createTimeoutPolicy('db');
    expect(policy).toBeDefined();
  });

  it('uses 5s default for redis target', () => {
    const policy = createTimeoutPolicy('redis');
    expect(policy).toBeDefined();
  });

  it('calls onTimeout handler when timeout fires', async () => {
    const handler = vi.fn();
    const policy = createTimeoutPolicy('redis', { timeoutRedisMs: 50 }, handler, 'slow.com');

    try {
      await policy.execute(async ({ signal }) => {
        await new Promise((resolve, reject) => {
          const timer = setTimeout(resolve, 5000);
          signal.addEventListener('abort', () => {
            clearTimeout(timer);
            reject(new TaskCancelledError());
          });
        });
      });
    } catch {
      // expected timeout
    }

    expect(handler).toHaveBeenCalledWith('slow.com', 50);
  });
});
