// Fallback strategy — serve cached stale data on circuit open
// Implements: T-RES-012 (REQ-RES-014)

export type FallbackCache<T> = {
  /** Store a value for a domain. */
  readonly set: (domain: string, value: T) => void;
  /** Get a cached value for a domain. Returns undefined if no cache. */
  readonly get: (domain: string) => T | undefined;
  /** Check if a cached value exists. */
  readonly has: (domain: string) => boolean;
  /** Clear all cached entries. */
  readonly clear: () => void;
  /** Number of cached entries. */
  readonly size: () => number;
};

export type FallbackHandler<T> = {
  /** Execute with fallback: try primary, fall back to cache on error. */
  readonly execute: (domain: string, primary: () => Promise<T>) => Promise<T>;
  /** Access the underlying cache for pre-population or inspection. */
  readonly cache: FallbackCache<T>;
};

export type DegradedModeHandler = (domain: string, error: unknown) => void;

/**
 * Creates a fallback handler that caches successful results and serves stale data on failure.
 * REQ-RES-014: When circuit is open, serve cached stale data where applicable.
 */
export function createFallbackHandler<T>(
  onDegradedMode?: DegradedModeHandler,
): FallbackHandler<T> {
  const entries = new Map<string, T>();

  const cache: FallbackCache<T> = {
    set(domain: string, value: T): void {
      entries.set(domain, value);
    },
    get(domain: string): T | undefined {
      return entries.get(domain);
    },
    has(domain: string): boolean {
      return entries.has(domain);
    },
    clear(): void {
      entries.clear();
    },
    size(): number {
      return entries.size;
    },
  };

  return {
    async execute(domain: string, primary: () => Promise<T>): Promise<T> {
      try {
        const result = await primary();
        // Cache successful result for future fallback
        cache.set(domain, result);
        return result;
      } catch (error: unknown) {
        const cached = cache.get(domain);
        if (cached !== undefined) {
          // REQ-RES-014: Serve cached stale data
          if (onDegradedMode) {
            onDegradedMode(domain, error);
          }
          return cached;
        }
        // No cached data available — rethrow
        throw error;
      }
    },
    cache,
  };
}
