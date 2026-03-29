// Per-domain circuit breaker registry with LRU eviction
// Implements: T-RES-002 (REQ-RES-002, REQ-RES-019, REQ-RES-020)
// Implements: T-RES-003 (REQ-RES-004) — state transition callbacks

import {
  circuitBreaker,
  handleAll,
  ConsecutiveBreaker,
  type CircuitState,
  type IPolicy,
} from 'cockatiel';
import type { ResilienceConfig, CircuitStateChangeHandler } from './resilience-types.js';
import { DEFAULT_RESILIENCE_CONFIG } from './resilience-types.js';

type RegistryEntry = {
  readonly policy: IPolicy;
  lastUsed: number;
};

export type CircuitBreakerRegistry = {
  readonly get: (domain: string) => IPolicy;
  readonly getState: (domain: string) => CircuitState | undefined;
  readonly size: () => number;
  readonly clear: () => void;
};

/**
 * Creates a per-domain circuit breaker registry with LRU eviction.
 * REQ-RES-002: Isolates failures to individual crawl targets.
 * REQ-RES-020: LRU eviction at maxDomains threshold.
 */
export function createCircuitBreakerRegistry(
  config: Partial<ResilienceConfig> = {},
  onStateChange?: CircuitStateChangeHandler,
): CircuitBreakerRegistry {
  const threshold = config.circuitBreakerThreshold ?? DEFAULT_RESILIENCE_CONFIG.circuitBreakerThreshold;
  const halfOpenAfter = config.circuitBreakerHalfOpenAfterMs ?? DEFAULT_RESILIENCE_CONFIG.circuitBreakerHalfOpenAfterMs;
  const maxDomains = config.circuitBreakerMaxDomains ?? DEFAULT_RESILIENCE_CONFIG.circuitBreakerMaxDomains;

  const entries = new Map<string, RegistryEntry>();
  const disposables: Array<{ dispose: () => void }> = [];

  // O(n) eviction is acceptable at 10K entries (~sub-ms scan).
  // Replace with linked-list LRU if profiling shows hotspot.
  function evictLRU(): void {
    let oldest: string | undefined;
    let oldestTime = Infinity;
    for (const [domain, entry] of entries) {
      if (entry.lastUsed < oldestTime) {
        oldestTime = entry.lastUsed;
        oldest = domain;
      }
    }
    if (oldest !== undefined) {
      entries.delete(oldest);
    }
  }

  function createBreaker(domain: string): IPolicy {
    const policy = circuitBreaker(handleAll, {
      halfOpenAfter,
      breaker: new ConsecutiveBreaker(threshold),
    });

    // T-RES-003: Subscribe to state transitions for metrics/logging
    if (onStateChange) {
      const sub = policy.onStateChange((state) => {
        onStateChange(domain, state);
      });
      disposables.push(sub);
    }

    return policy;
  }

  return {
    get(domain: string): IPolicy {
      const existing = entries.get(domain);
      if (existing) {
        existing.lastUsed = Date.now();
        return existing.policy;
      }
      if (entries.size >= maxDomains) {
        evictLRU();
      }
      const policy = createBreaker(domain);
      entries.set(domain, { policy, lastUsed: Date.now() });
      return policy;
    },

    getState(domain: string): CircuitState | undefined {
      const entry = entries.get(domain);
      if (!entry) return undefined;
      // cockatiel's IPolicy doesn't expose .state; concrete CircuitBreakerPolicy does
      return (entry.policy as unknown as { state: CircuitState }).state;
    },

    size(): number {
      return entries.size;
    },

    clear(): void {
      for (const d of disposables) {
        d.dispose();
      }
      disposables.length = 0;
      entries.clear();
    },
  };
}
