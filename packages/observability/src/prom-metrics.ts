// Prometheus-based CrawlMetrics adapter
// Implements: T-OBS-006..011, REQ-OBS-008..017

import {
  Registry,
  Counter,
  Histogram,
  Gauge,
} from 'prom-client';
import type { CrawlMetrics } from '@ipf/core/contracts/crawl-metrics';

export interface PromMetricsConfig {
  readonly prefix?: string;
  readonly durationBuckets?: readonly number[];
}

const DEFAULT_DURATION_BUCKETS = [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10] as const;

export interface PromMetricsHandle {
  readonly metrics: CrawlMetrics;
  readonly registry: Registry;
}

export function createPromMetrics(config?: PromMetricsConfig): PromMetricsHandle {
  // REQ-OBS-017: Per-process isolated registry
  const registry = new Registry();
  const prefix = config?.prefix ?? '';
  const buckets = config?.durationBuckets
    ? [...config.durationBuckets]
    : [...DEFAULT_DURATION_BUCKETS];

  // T-OBS-007: REQ-OBS-009 — fetches_total counter
  const fetchesTotal = new Counter({
    name: `${prefix}fetches_total`,
    help: 'Total number of fetch operations',
    labelNames: ['status', 'error_kind'] as const,
    registers: [registry],
  });

  // T-OBS-008: REQ-OBS-010 — fetch_duration_seconds histogram
  const fetchDuration = new Histogram({
    name: `${prefix}fetch_duration_seconds`,
    help: 'Duration of fetch operations in seconds',
    buckets,
    registers: [registry],
  });

  // T-OBS-009: REQ-OBS-011 — urls_discovered_total counter
  const urlsDiscovered = new Counter({
    name: `${prefix}urls_discovered_total`,
    help: 'Total number of URLs discovered during parsing',
    registers: [registry],
  });

  // T-OBS-010: REQ-OBS-012 — frontier_size gauge
  const frontierSize = new Gauge({
    name: `${prefix}frontier_size`,
    help: 'Current size of the URL frontier',
    registers: [registry],
  });

  // T-OBS-010: REQ-OBS-014 — active_jobs gauge
  const activeJobs = new Gauge({
    name: `${prefix}active_jobs`,
    help: 'Number of currently active jobs',
    registers: [registry],
  });

  // T-OBS-010: REQ-OBS-015 — worker_utilization_ratio gauge
  const workerUtilization = new Gauge({
    name: `${prefix}worker_utilization_ratio`,
    help: 'Worker utilization ratio (0.0 to 1.0)',
    registers: [registry],
  });

  // T-OBS-011: REQ-OBS-013 — stalled_jobs_total counter
  const stalledJobs = new Counter({
    name: `${prefix}stalled_jobs_total`,
    help: 'Total number of stalled jobs detected',
    registers: [registry],
  });

  // T-OBS-011: REQ-OBS-016 — coordinator_restarts_total counter
  const coordinatorRestarts = new Counter({
    name: `${prefix}coordinator_restarts_total`,
    help: 'Total number of coordinator restarts',
    registers: [registry],
  });

  const metrics: CrawlMetrics = {
    recordFetch(status: string, errorKind?: string): void {
      const labels: Record<string, string> = { status };
      if (errorKind !== undefined) {
        labels['error_kind'] = errorKind;
      }
      fetchesTotal.inc(labels);
    },

    recordFetchDuration(seconds: number): void {
      // REQ-OBS-010: Duration recorded only when > 0
      if (seconds > 0) {
        fetchDuration.observe(seconds);
      }
    },

    recordUrlsDiscovered(count: number): void {
      // REQ-OBS-011: Only increment when count > 0
      if (count > 0) {
        urlsDiscovered.inc(count);
      }
    },

    setFrontierSize(size: number): void {
      frontierSize.set(size);
    },

    setStalledJobs(count: number): void {
      stalledJobs.inc(count);
    },

    setActiveJobs(count: number): void {
      activeJobs.set(count);
    },

    setWorkerUtilization(ratio: number): void {
      workerUtilization.set(ratio);
    },

    incrementCoordinatorRestarts(): void {
      coordinatorRestarts.inc();
    },
  };

  return { metrics, registry };
}
