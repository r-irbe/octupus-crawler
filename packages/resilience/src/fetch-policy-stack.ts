// Full 7-layer fetch policy factory
// Implements: T-RES-016 (REQ-RES-018, REQ-RES-019)

import { wrap, type IPolicy } from 'cockatiel';
import { createCircuitBreakerRegistry, type CircuitBreakerRegistry } from './circuit-breaker-registry.js';
import { createRetryPolicy } from './retry-policy.js';
import { createTimeoutPolicy } from './timeout-policy.js';
import { createBulkheadRegistry, type BulkheadRegistry } from './bulkhead-registry.js';
import { createTokenBucketLimiter, type TokenBucketLimiter, type TokenBucketConfig } from './token-bucket.js';
import { createFallbackHandler, type FallbackHandler } from './fallback-handler.js';
import type {
  ResilienceConfig,
  CircuitStateChangeHandler,
  RetryEventHandler,
  TimeoutEventHandler,
} from './resilience-types.js';
import type { DegradedModeHandler } from './fallback-handler.js';

export type FetchPolicyConfig = Partial<ResilienceConfig> & Partial<TokenBucketConfig>;

export type FetchPolicyHandlers = {
  readonly onCircuitStateChange?: CircuitStateChangeHandler;
  readonly onRetry?: RetryEventHandler;
  readonly onTimeout?: TimeoutEventHandler;
  readonly onDegradedMode?: DegradedModeHandler;
};

export type FetchPolicyStack = {
  /** Get the composed cockatiel policy (timeout → retry → CB → bulkhead). */
  readonly getPolicy: (domain: string) => IPolicy;
  /** Check rate limit before executing. Returns true if allowed. */
  readonly checkRateLimit: (domain: string) => boolean;
  /** Execute with fallback: wraps policy execution with stale cache. */
  readonly executeWithFallback: <T>(domain: string, fn: () => Promise<T>) => Promise<T>;
  /** Access circuit breaker registry for state inspection. */
  readonly circuitBreakers: CircuitBreakerRegistry;
  /** Access bulkhead registry. */
  readonly bulkheads: BulkheadRegistry;
  /** Access token bucket limiter. */
  readonly rateLimiter: TokenBucketLimiter;
  /** Access fallback handler. Uses `unknown` for domain-agnostic caching — callers must ensure type consistency per domain. */
  readonly fallback: FallbackHandler<unknown>;
  /** Cleanup all resources. */
  readonly dispose: () => void;
};

/**
 * Creates the full 7-layer resilience stack for fetch operations.
 *
 * Layers (in order):
 * 1. Rate Limiter — token bucket per domain (pre-call check)
 * 2. Timeout — cooperative cancellation
 * 3. Retry — exponential backoff + jitter
 * 4. Circuit Breaker — per-domain ConsecutiveBreaker
 * 5. Bulkhead — concurrency limiter per domain
 * 6. Fallback — cached stale data on failure
 * 7. DLQ — BullMQ dead letter queue (not composed here, handled at job level)
 *
 * REQ-RES-018: Policies composed via cockatiel wrap().
 * REQ-RES-019: Factory returns composed policy for any crawl domain.
 */
export function createFetchPolicyStack(
  config: FetchPolicyConfig = {},
  handlers: FetchPolicyHandlers = {},
): FetchPolicyStack {
  const circuitBreakers = createCircuitBreakerRegistry(config, handlers.onCircuitStateChange);
  const bulkheads = createBulkheadRegistry(config);
  const rateLimiter = createTokenBucketLimiter(config);
  const fallback = createFallbackHandler<unknown>(handlers.onDegradedMode);

  return {
    getPolicy(domain: string): IPolicy {
      const timeoutPolicy = createTimeoutPolicy('fetch', config, handlers.onTimeout, domain);
      const retryPolicy = createRetryPolicy(config, handlers.onRetry, domain);
      const breakerPolicy = circuitBreakers.get(domain);
      const bulkheadPolicy = bulkheads.get(domain);

      // REQ-RES-018: timeout → retry → circuit breaker → bulkhead
      return wrap(timeoutPolicy, retryPolicy, breakerPolicy, bulkheadPolicy);
    },

    checkRateLimit(domain: string): boolean {
      return rateLimiter.tryAcquire(domain);
    },

    async executeWithFallback<T>(domain: string, fn: () => Promise<T>): Promise<T> {
      return fallback.execute(domain, fn) as Promise<T>;
    },

    circuitBreakers,
    bulkheads,
    rateLimiter,
    fallback,

    dispose(): void {
      circuitBreakers.clear();
      bulkheads.clear();
      rateLimiter.clear();
      fallback.cache.clear();
    },
  };
}
