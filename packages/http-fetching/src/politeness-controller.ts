// Politeness Controller — per-domain delay enforcement with promise-chain serialization
// Implements: T-FETCH-002 to 004, T-FETCH-028, T-FETCH-029
// REQ-FETCH-009 to 013, REQ-FETCH-020, REQ-FETCH-021

import { getDomain } from 'tldts';
import { LruMap } from './lru-map.js';

// --- Types ---

export type PolitenessConfig = {
  readonly delayMs: number;
  readonly maxDomains: number;
  readonly staleThresholdMs: number;
};

export const DEFAULT_POLITENESS_CONFIG: PolitenessConfig = {
  delayMs: 2000,
  maxDomains: 10_000,
  staleThresholdMs: 600_000, // 10 minutes
};

type DomainEntry = {
  chain: Promise<void>;
  lastAccessMs: number;
};

// --- Controller ---

export class PolitenessController {
  private readonly domains: LruMap<string, DomainEntry>;
  private readonly config: PolitenessConfig;
  private pruneTimer: ReturnType<typeof setInterval> | undefined;

  constructor(config: PolitenessConfig = DEFAULT_POLITENESS_CONFIG) {
    this.config = config;
    this.domains = new LruMap(config.maxDomains);

    // REQ-FETCH-012: Background pruning of stale entries
    if (config.staleThresholdMs > 0) {
      this.pruneTimer = setInterval(() => { this.pruneStale(); }, config.staleThresholdMs);
      this.pruneTimer.unref();
    }
  }

  /**
   * Wait for the per-domain delay, then allow execution.
   * First request to a domain proceeds immediately (REQ-FETCH-010).
   * Concurrent calls are serialized via promise chain (REQ-FETCH-020).
   */
  async acquire(hostname: string): Promise<void> {
    const domain = getRegistrableDomain(hostname);
    const existing = this.domains.get(domain);
    const now = Date.now();

    if (!existing) {
      // First request — proceed immediately (REQ-FETCH-010)
      const entry: DomainEntry = { chain: Promise.resolve(), lastAccessMs: now };
      this.domains.set(domain, entry);
      return;
    }

    // Chain onto previous promise with delay (REQ-FETCH-020)
    const prev = existing.chain;
    const next = prev.then(() => delay(this.config.delayMs));
    existing.chain = next;
    existing.lastAccessMs = now;
    this.domains.set(domain, existing); // refresh LRU position

    await next;
  }

  /**
   * Release the domain slot after a fetch completes (success or failure).
   * REQ-FETCH-011: Failed fetches do not break the serialization chain.
   */
  release(_hostname: string): void {
    // The promise chain approach means the chain continues regardless
    // of success/failure. This method exists for API completeness and
    // to update the last access timestamp.
    const domain = getRegistrableDomain(_hostname);
    const entry = this.domains.get(domain);
    if (entry) {
      entry.lastAccessMs = Date.now();
    }
  }

  /** Remove stale entries older than staleThresholdMs (REQ-FETCH-012) */
  pruneStale(): number {
    const cutoff = Date.now() - this.config.staleThresholdMs;
    let pruned = 0;

    for (const [domain, entry] of this.domains.entries()) {
      if (entry.lastAccessMs < cutoff) {
        this.domains.delete(domain);
        pruned++;
      }
    }

    return pruned;
  }

  get trackedDomains(): number {
    return this.domains.size;
  }

  dispose(): void {
    if (this.pruneTimer !== undefined) {
      clearInterval(this.pruneTimer);
      this.pruneTimer = undefined;
    }
    this.domains.clear();
  }
}

// --- Helpers ---

/** REQ-FETCH-021: Domain = TLD+1 via public suffix list */
export function getRegistrableDomain(hostname: string): string {
  const domain = getDomain(hostname, { allowPrivateDomains: true });
  // Fall back to lowercased hostname if tldts can't parse (e.g., localhost, IPs)
  return (domain ?? hostname).toLowerCase();
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
