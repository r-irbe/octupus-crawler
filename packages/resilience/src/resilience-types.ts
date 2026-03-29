// Resilience types — shared across resilience modules
// Implements: REQ-RES-001 (cockatiel policies for external calls)

import type { CircuitState } from 'cockatiel';

/** Callback for circuit breaker state transition events. */
export type CircuitStateChangeHandler = (domain: string, state: CircuitState) => void;

/** Callback for retry events. */
export type RetryEventHandler = (domain: string, attempt: number, delay: number) => void;

/** Callback for timeout events. */
export type TimeoutEventHandler = (domain: string, durationMs: number) => void;

/** Configuration for resilience policies. */
export type ResilienceConfig = {
  readonly circuitBreakerThreshold: number;
  readonly circuitBreakerHalfOpenAfterMs: number;
  readonly retryMaxAttempts: number;
  readonly retryInitialDelayMs: number;
  readonly retryMaxDelayMs: number;
  readonly timeoutFetchMs: number;
  readonly timeoutDbMs: number;
  readonly timeoutRedisMs: number;
  readonly bulkheadMaxConcurrentPerDomain: number;
  readonly circuitBreakerMaxDomains: number;
};

export const DEFAULT_RESILIENCE_CONFIG: ResilienceConfig = {
  circuitBreakerThreshold: 5,
  circuitBreakerHalfOpenAfterMs: 30_000,
  retryMaxAttempts: 3,
  retryInitialDelayMs: 1_000,
  retryMaxDelayMs: 30_000,
  timeoutFetchMs: 30_000,
  timeoutDbMs: 10_000,
  timeoutRedisMs: 5_000,
  bulkheadMaxConcurrentPerDomain: 2,
  circuitBreakerMaxDomains: 10_000,
} as const;

/**
 * Tags for resilience error discriminated union.
 * Follows project convention: _tag field for variants.
 */
export type ResilienceError =
  | { readonly _tag: 'CircuitOpen'; readonly domain: string; readonly message: string }
  | { readonly _tag: 'Timeout'; readonly domain: string; readonly durationMs: number; readonly message: string }
  | { readonly _tag: 'BulkheadRejected'; readonly domain: string; readonly message: string }
  | { readonly _tag: 'RetriesExhausted'; readonly domain: string; readonly attempts: number; readonly message: string };

export function createCircuitOpenError(domain: string): ResilienceError {
  return { _tag: 'CircuitOpen', domain, message: `Circuit open for domain ${domain}` };
}

export function createTimeoutResilienceError(domain: string, durationMs: number): ResilienceError {
  return { _tag: 'Timeout', domain, durationMs, message: `Timeout after ${String(durationMs)}ms for ${domain}` };
}

export function createBulkheadRejectedError(domain: string): ResilienceError {
  return { _tag: 'BulkheadRejected', domain, message: `Bulkhead rejected for domain ${domain}` };
}

export function createRetriesExhaustedError(domain: string, attempts: number): ResilienceError {
  return { _tag: 'RetriesExhausted', domain, attempts, message: `All ${String(attempts)} retries exhausted for ${domain}` };
}
