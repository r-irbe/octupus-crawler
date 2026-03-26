// HTTP Fetching — fetch operation types
// Implements: REQ-FETCH-022, REQ-FETCH-019

// --- Fetcher Metrics Contract ---

export type FetchMetrics = {
  readonly recordFetch: (status: 'success' | 'error', errorKind?: string) => void;
  readonly recordDuration: (seconds: number) => void;
  readonly recordRedirect: () => void;
  readonly recordBodyBytes: (bytes: number) => void;
};

export const NULL_FETCH_METRICS: FetchMetrics = {
  recordFetch: (): void => { /* no-op */ },
  recordDuration: (): void => { /* no-op */ },
  recordRedirect: (): void => { /* no-op */ },
  recordBodyBytes: (): void => { /* no-op */ },
};
