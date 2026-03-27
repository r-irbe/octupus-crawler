// JobConsumerAdapter — hexagonal adapter wiring job lifecycle to utilization tracking
// Implements: T-WORK-003 (concurrency), T-WORK-004 (start guard), T-WORK-005 (event registration)
// Covers: REQ-DIST-007, REQ-DIST-009, REQ-DIST-010, REQ-DIST-011

import type { JobConsumer } from '@ipf/core/contracts/job-consumer';
import type { JobEventSource } from '@ipf/core/contracts/job-event-source';
import type { CrawlMetrics } from '@ipf/core/contracts/crawl-metrics';
import { UtilizationTracker } from './utilization-tracker.js';
import type { StalledJobConfig } from './stalled-job-config.js';

export type JobConsumerAdapterDeps = {
  readonly consumer: JobConsumer;
  readonly events: JobEventSource;
  readonly metrics: CrawlMetrics;
  readonly maxConcurrency: number;
  readonly stalledConfig: StalledJobConfig;
};

type ConsumerState = 'created' | 'started' | 'closed';

/**
 * Orchestrates the job consumer lifecycle:
 * - Registers event listeners before start (REQ-DIST-009)
 * - Enforces single-start guard (REQ-DIST-010)
 * - Tracks utilization via UtilizationTracker (REQ-DIST-011)
 * - Pushes metrics to CrawlMetrics contract (REQ-DIST-014)
 */
export class JobConsumerAdapter {
  private readonly _tracker: UtilizationTracker;
  private readonly _consumer: JobConsumer;
  private readonly _events: JobEventSource;
  private readonly _metrics: CrawlMetrics;
  private _state: ConsumerState = 'created';
  private _processedTotal = 0;
  private _failedTotal = 0;
  private _stalledTotal = 0;

  constructor(deps: JobConsumerAdapterDeps) {
    this._consumer = deps.consumer;
    this._events = deps.events;
    this._metrics = deps.metrics;
    this._tracker = new UtilizationTracker(deps.maxConcurrency);

    // T-WORK-005: Register ALL listeners BEFORE start() is callable (REQ-DIST-009)
    this._registerEventListeners();
  }

  get tracker(): UtilizationTracker {
    return this._tracker;
  }

  get state(): ConsumerState {
    return this._state;
  }

  get processedTotal(): number {
    return this._processedTotal;
  }

  get failedTotal(): number {
    return this._failedTotal;
  }

  get stalledTotal(): number {
    return this._stalledTotal;
  }

  /** T-WORK-004: Start guard — callable exactly once (REQ-DIST-010) */
  async start(): Promise<void> {
    if (this._state === 'started') {
      throw new Error('JobConsumerAdapter already started — start() is callable exactly once');
    }
    if (this._state === 'closed') {
      throw new Error('JobConsumerAdapter is closed — cannot restart');
    }
    this._state = 'started';
    await this._consumer.start();
  }

  async close(timeout?: number): Promise<void> {
    if (this._state === 'closed') {
      return;
    }
    this._state = 'closed';
    await this._consumer.close(timeout);
    await this._events.close();
  }

  /** Push current metrics to the CrawlMetrics contract (REQ-DIST-014) */
  reportMetrics(): void {
    const snap = this._tracker.snapshot();
    this._metrics.setActiveJobs(snap.activeJobs);
    this._metrics.setWorkerUtilization(snap.ratio);
  }

  /** T-WORK-005: Wire lifecycle events to tracker (REQ-DIST-009, REQ-DIST-011) */
  private _registerEventListeners(): void {
    this._events.onActive((_jobId: string) => {
      this._tracker.onJobStarted();
      this.reportMetrics();
    });

    this._events.onCompleted((_jobId: string) => {
      this._tracker.onJobCompleted();
      this._processedTotal += 1;
      this.reportMetrics();
    });

    this._events.onFailed((_jobId: string, _error: unknown) => {
      this._tracker.onJobFailed();
      this._failedTotal += 1;
      this.reportMetrics();
    });

    this._events.onStalled((_jobId: string) => {
      this._tracker.onJobStalled();
      this._stalledTotal += 1;
      this._metrics.setStalledJobs(this._stalledTotal);
      this.reportMetrics();
    });
  }
}
