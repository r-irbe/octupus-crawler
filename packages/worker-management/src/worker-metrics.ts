// WorkerMetricsReporter — periodic metrics push and counter consistency guard
// Implements: T-WORK-012 (counter guard), T-WORK-013 (metrics), REQ-DIST-013, REQ-DIST-014

import type { CrawlMetrics } from '@ipf/core/contracts/crawl-metrics';
import type { UtilizationTracker } from './utilization-tracker.js';

export type ActiveJobCountProvider = {
  readonly getActiveCount: () => Promise<number>;
};

export type WorkerMetricsLogger = {
  readonly warn: (obj: Record<string, unknown>, msg: string) => void;
};

export type WorkerMetricsDeps = {
  readonly tracker: UtilizationTracker;
  readonly metrics: CrawlMetrics;
  readonly activeCountProvider: ActiveJobCountProvider;
  readonly logger: WorkerMetricsLogger;
  readonly checkIntervalMs?: number;
};

const DEFAULT_CHECK_INTERVAL_MS = 10_000;

/**
 * Periodically pushes worker metrics and detects counter inconsistencies.
 * - REQ-DIST-013: Reset counter via queue query when activeJobs > maxConcurrency
 * - REQ-DIST-014: Expose worker_active_jobs, worker_utilization_ratio, etc.
 */
export class WorkerMetricsReporter {
  private readonly _tracker: UtilizationTracker;
  private readonly _metrics: CrawlMetrics;
  private readonly _activeCountProvider: ActiveJobCountProvider;
  private readonly _logger: WorkerMetricsLogger;
  private readonly _intervalMs: number;
  private _timer: ReturnType<typeof setInterval> | undefined;
  private _resetCount = 0;

  constructor(deps: WorkerMetricsDeps) {
    this._tracker = deps.tracker;
    this._metrics = deps.metrics;
    this._activeCountProvider = deps.activeCountProvider;
    this._logger = deps.logger;
    this._intervalMs = deps.checkIntervalMs ?? DEFAULT_CHECK_INTERVAL_MS;
  }

  get counterResetCount(): number {
    return this._resetCount;
  }

  start(): void {
    this._timer = setInterval(() => {
      void this._tick();
    }, this._intervalMs);
  }

  stop(): void {
    if (this._timer !== undefined) {
      clearInterval(this._timer);
      this._timer = undefined;
    }
  }

  /** Single tick: push metrics + check consistency */
  async _tick(): Promise<void> {
    const snap = this._tracker.snapshot();
    this._metrics.setActiveJobs(snap.activeJobs);
    this._metrics.setWorkerUtilization(snap.ratio);

    // T-WORK-012: Counter inconsistency guard (REQ-DIST-013)
    if (this._tracker.isInconsistent()) {
      const actual = await this._activeCountProvider.getActiveCount();
      this._logger.warn(
        { expected: snap.activeJobs, actual, max: snap.maxConcurrency },
        'Counter inconsistency detected — resetting to actual queue count',
      );
      this._tracker.reset(actual);
      this._resetCount += 1;
      this._metrics.incrementCoordinatorRestarts();
    }
  }
}
