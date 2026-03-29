// Bulkhead policy — per-domain concurrency limiting
// Implements: T-RES-011 (REQ-RES-012, REQ-RES-013)

import { bulkhead, type IPolicy } from 'cockatiel';
import type { ResilienceConfig } from './resilience-types.js';
import { DEFAULT_RESILIENCE_CONFIG } from './resilience-types.js';

export type BulkheadRegistry = {
  /** Get a bulkhead policy for a specific domain. */
  readonly get: (domain: string) => IPolicy;
  /** Number of tracked domains. */
  readonly size: () => number;
  /** Clear all bulkhead instances. */
  readonly clear: () => void;
};

/**
 * Creates a per-domain bulkhead registry.
 * REQ-RES-012: Prevents one dependency from consuming all resources.
 * REQ-RES-013: Default 2 concurrent per domain.
 * Note: No LRU eviction — entry count grows with unique domains.
 * Phase 5 integration should add shared maxDomains eviction.
 */
export function createBulkheadRegistry(
  config: Partial<ResilienceConfig> = {},
): BulkheadRegistry {
  const maxConcurrent = config.bulkheadMaxConcurrentPerDomain
    ?? DEFAULT_RESILIENCE_CONFIG.bulkheadMaxConcurrentPerDomain;

  const entries = new Map<string, IPolicy>();

  return {
    get(domain: string): IPolicy {
      const existing = entries.get(domain);
      if (existing) return existing;
      // Queue size Infinity — overflow will queue rather than reject
      const policy = bulkhead(maxConcurrent, Infinity);
      entries.set(domain, policy);
      return policy;
    },

    size(): number {
      return entries.size;
    },

    clear(): void {
      entries.clear();
    },
  };
}
