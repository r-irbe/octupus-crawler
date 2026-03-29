// Per-domain token bucket rate limiter
// Implements: T-RES-009 (REQ-RES-010)

export type TokenBucketConfig = {
  readonly maxTokens: number;
  readonly refillRate: number; // tokens per second
};

export const DEFAULT_TOKEN_BUCKET_CONFIG: TokenBucketConfig = {
  maxTokens: 2,
  refillRate: 1,
} as const;

type BucketEntry = {
  tokens: number;
  lastRefill: number;
};

export type TokenBucketLimiter = {
  /** Try to consume a token for the domain. Returns true if allowed. */
  readonly tryAcquire: (domain: string) => boolean;
  /** Get remaining tokens for a domain. */
  readonly getTokens: (domain: string) => number;
  /** Reset a specific domain's bucket. */
  readonly reset: (domain: string) => void;
  /** Clear all buckets. */
  readonly clear: () => void;
  /** Number of tracked domains. */
  readonly size: () => number;
};

/**
 * Creates a per-domain token bucket rate limiter.
 * REQ-RES-010: Configurable burst (maxTokens) and refill rate.
 * Tokens refill continuously based on elapsed time.
 */
export function createTokenBucketLimiter(
  config: Partial<TokenBucketConfig> = {},
  now: () => number = Date.now,
): TokenBucketLimiter {
  const maxTokens = config.maxTokens ?? DEFAULT_TOKEN_BUCKET_CONFIG.maxTokens;
  const refillRate = config.refillRate ?? DEFAULT_TOKEN_BUCKET_CONFIG.refillRate;
  const buckets = new Map<string, BucketEntry>();

  function getOrCreate(domain: string): BucketEntry {
    const existing = buckets.get(domain);
    if (existing) return existing;
    const entry: BucketEntry = { tokens: maxTokens, lastRefill: now() };
    buckets.set(domain, entry);
    return entry;
  }

  function refill(entry: BucketEntry): void {
    const currentTime = now();
    const elapsed = (currentTime - entry.lastRefill) / 1_000; // seconds
    const newTokens = elapsed * refillRate;
    entry.tokens = Math.min(maxTokens, entry.tokens + newTokens);
    entry.lastRefill = currentTime;
  }

  return {
    tryAcquire(domain: string): boolean {
      const entry = getOrCreate(domain);
      refill(entry);
      if (entry.tokens >= 1) {
        entry.tokens -= 1;
        return true;
      }
      return false;
    },

    getTokens(domain: string): number {
      const entry = buckets.get(domain);
      if (!entry) return maxTokens;
      refill(entry);
      return entry.tokens;
    },

    reset(domain: string): void {
      buckets.delete(domain);
    },

    clear(): void {
      buckets.clear();
    },

    size(): number {
      return buckets.size;
    },
  };
}
