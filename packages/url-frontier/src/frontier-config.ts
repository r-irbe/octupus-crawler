// Frontier configuration — queue name, retry, retention
// Implements: T-DIST-004, T-DIST-005, T-DIST-006, REQ-DIST-003, REQ-DIST-005, REQ-DIST-006

/** Single shared queue name across all components (REQ-DIST-006). */
export const FRONTIER_QUEUE_NAME = 'crawl-jobs' as const;

/** Retry configuration for failed jobs (REQ-DIST-003). */
export type RetryConfig = {
  readonly attempts: number;
  readonly backoffType: 'exponential';
  readonly backoffDelay: number;
};

/** Default retry: 3 attempts, 1s base exponential backoff. */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  attempts: 3,
  backoffType: 'exponential',
  backoffDelay: 1000,
};

/** Retention window configuration (REQ-DIST-005). */
export type RetentionConfig = {
  readonly completedLimit: number;
  readonly failedLimit: number;
};

/** Default retention: 10K completed, 5K failed (sliding window). */
export const DEFAULT_RETENTION_CONFIG: RetentionConfig = {
  completedLimit: 10_000,
  failedLimit: 5_000,
};

/** Full frontier configuration. */
export type FrontierConfig = {
  readonly retry: RetryConfig;
  readonly retention: RetentionConfig;
};

/** Default frontier configuration. */
export const DEFAULT_FRONTIER_CONFIG: FrontierConfig = {
  retry: DEFAULT_RETRY_CONFIG,
  retention: DEFAULT_RETENTION_CONFIG,
};
