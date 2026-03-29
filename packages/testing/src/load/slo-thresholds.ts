/**
 * SLO Thresholds — Shared constants for load test assertions.
 *
 * Derived from ADR-007 §Load and production SLO targets.
 * @see REQ-PROD-012, T-PROD-012, design.md §4.3
 */

/** p95 fetch latency must be under this value (ms) */
export const P95_LATENCY_MS = 5_000;

/** Error rate must be under this percentage (0-1 scale) */
export const ERROR_RATE_THRESHOLD = 0.05;

/** Worker RSS memory must stay under this value (bytes) */
export const MAX_RSS_BYTES = 512 * 1024 * 1024; // 512MB

/** Queue drain time for 10k URLs (ms) */
export const QUEUE_DRAIN_TIMEOUT_MS = 10 * 60 * 1_000; // 10 minutes

/** Worker startup to ready (ms) */
export const WORKER_STARTUP_MS = 30_000;

/** Sustained load rate (URLs/second) */
export const SUSTAINED_RATE = 100;

/** Sustained load duration (seconds) */
export const SUSTAINED_DURATION_S = 60;

/** Burst size for backpressure tests */
export const BURST_SIZE = 10_000;

/** Backpressure threshold — pending jobs count */
export const BACKPRESSURE_THRESHOLD = 1_000;
