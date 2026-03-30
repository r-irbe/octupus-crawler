// Resilient HTTP fetcher — wraps httpFetch with 7-layer resilience stack
// Implements: T-RES-017 (REQ-RES-001, REQ-RES-018, REQ-RES-019)
// Layer 1 (rate limit) checked pre-call; layers 2–5 applied via cockatiel policy

import { err } from 'neverthrow';
import type { AsyncResult } from '@ipf/core/types/result';
import type { FetchError } from '@ipf/core/errors/fetch-error';
import { httpFetch } from './http-fetcher.js';
import type { HttpClient, FetcherConfig, SsrfValidator, FetchResultData } from './http-fetcher.js';
import type { FetchMetrics } from './fetch-types.js';
import { NULL_FETCH_METRICS } from './fetch-types.js';

// --- Minimal resilience port (structural, avoids coupling to cockatiel IPolicy) ---

export type ResiliencePolicy = {
  readonly execute: <T>(fn: () => Promise<T>) => Promise<T>;
};

export type FetchPolicyPort = {
  readonly checkRateLimit: (domain: string) => boolean;
  readonly getPolicy: (domain: string) => ResiliencePolicy;
};

// --- Rate limit error ---

export type RateLimitError = {
  readonly kind: 'rate_limited';
  readonly domain: string;
  readonly message: string;
};

export type ResilientFetchError = FetchError | RateLimitError;

// --- Resilient fetcher ---

/**
 * Fetch a URL with the full 7-layer resilience stack.
 *
 * Flow:
 * 1. Token bucket rate limit check (pre-call) — rejects immediately if exhausted
 * 2–5. cockatiel policy (timeout → retry → circuit breaker → bulkhead)
 * 6–7. Fallback + DLQ handled at caller level
 *
 * REQ-RES-001: All external HTTP calls use resilience policies.
 * REQ-RES-018: Policies composed via cockatiel wrap().
 * REQ-RES-019: Per-domain policy isolation.
 */
export async function resilientFetch(
  url: string,
  domain: string,
  client: HttpClient,
  config: FetcherConfig,
  ssrfValidator: SsrfValidator,
  policyStack: FetchPolicyPort,
  metrics: FetchMetrics = NULL_FETCH_METRICS,
): AsyncResult<FetchResultData, ResilientFetchError> {
  // Layer 1: Rate limit check
  if (!policyStack.checkRateLimit(domain)) {
    return err({
      kind: 'rate_limited',
      domain,
      message: `Rate limit exceeded for domain ${domain}`,
    });
  }

  // Layers 2–5: timeout → retry → circuit breaker → bulkhead
  const policy = policyStack.getPolicy(domain);

  try {
    const result = await policy.execute(() =>
      httpFetch(url, client, config, ssrfValidator, metrics),
    );
    return result;
  } catch (cause: unknown) {
    // cockatiel policies throw on circuit open, timeout, bulkhead full
    const message = cause instanceof Error ? cause.message : String(cause);
    return err({
      kind: 'network',
      url,
      cause: cause instanceof Error ? cause : new Error(message),
      message: `Resilience policy rejected: ${message}`,
    } as FetchError);
  }
}
