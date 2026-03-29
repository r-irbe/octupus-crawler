// Retry policy with exponential backoff + jitter and idempotency guard
// Implements: T-RES-005 (REQ-RES-005), T-RES-006 (REQ-RES-006)

import {
  retry,
  handleAll,
  ExponentialBackoff,
  type IPolicy,
} from 'cockatiel';
import type { ResilienceConfig, RetryEventHandler } from './resilience-types.js';
import { DEFAULT_RESILIENCE_CONFIG } from './resilience-types.js';

/**
 * Creates a retry policy with exponential backoff and decorrelated jitter.
 * REQ-RES-005: Initial 1s, max 30s, 3 max attempts.
 */
export function createRetryPolicy(
  config: Partial<ResilienceConfig> = {},
  onRetry?: RetryEventHandler,
  domain?: string,
): IPolicy {
  const maxAttempts = config.retryMaxAttempts ?? DEFAULT_RESILIENCE_CONFIG.retryMaxAttempts;
  const initialDelay = config.retryInitialDelayMs ?? DEFAULT_RESILIENCE_CONFIG.retryInitialDelayMs;
  const maxDelay = config.retryMaxDelayMs ?? DEFAULT_RESILIENCE_CONFIG.retryMaxDelayMs;

  const policy = retry(handleAll, {
    maxAttempts,
    backoff: new ExponentialBackoff({ initialDelay, maxDelay }),
  });

  if (onRetry && domain) {
    policy.onRetry(({ attempt, delay }) => {
      onRetry(domain, attempt, delay);
    });
  }

  return policy;
}

/**
 * Idempotency guard: wraps a policy to only retry if the operation is idempotent.
 * REQ-RES-006: Non-idempotent operations fail immediately on first error.
 */
export function withIdempotencyGuard<T>(
  policy: IPolicy,
  fn: (context: { signal: AbortSignal }) => Promise<T> | T,
  isIdempotent: boolean,
): Promise<T> {
  if (!isIdempotent) {
    // Non-idempotent: execute without retry protection (REQ-RES-006)
    return new Promise<T>((resolve, reject) => {
      try {
        const result = fn({ signal: AbortSignal.timeout(60_000) });
        resolve(result as T);
      } catch (err: unknown) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    });
  }
  return policy.execute(fn);
}
