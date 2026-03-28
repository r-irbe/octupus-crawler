// Integration test for configurable concurrency and metrics exposure
// Validates: T-WORK-009 (REQ-DIST-007), T-WORK-016 (REQ-DIST-014)
// Tests the full adapter→tracker→metrics chain with concurrent job simulation

import { describe, it, expect, vi, afterEach } from 'vitest';
import type { JobConsumer } from '@ipf/core/contracts/job-consumer';
import type { JobEventSource } from '@ipf/core/contracts/job-event-source';
import type { CrawlMetrics } from '@ipf/core/contracts/crawl-metrics';
import { JobConsumerAdapter } from './job-consumer-adapter.js';
import { WorkerMetricsReporter } from './worker-metrics.js';
import { createStalledJobConfig } from './stalled-job-config.js';

// --- Concrete test implementations (not mocks — simulated behavior) ---

type Handler = (jobId: string) => void;
type ErrorHandler = (jobId: string, error: unknown) => void;

/** Concrete event source that allows programmatic event firing */
class TestEventSource implements JobEventSource {
  private readonly _activeHandlers: Handler[] = [];
  private readonly _completedHandlers: Handler[] = [];
  private readonly _failedHandlers: ErrorHandler[] = [];
  private readonly _stalledHandlers: Handler[] = [];

  onActive(h: Handler): void { this._activeHandlers.push(h); }
  onCompleted(h: Handler): void { this._completedHandlers.push(h); }
  onFailed(h: ErrorHandler): void { this._failedHandlers.push(h); }
  onStalled(h: Handler): void { this._stalledHandlers.push(h); }
  async close(): Promise<void> { /* cleanup */ }

  fireActive(id: string): void {
    this._activeHandlers.forEach((h) => { h(id); });
  }

  fireCompleted(id: string): void {
    this._completedHandlers.forEach((h) => { h(id); });
  }

  fireFailed(id: string, err: unknown): void {
    this._failedHandlers.forEach((h) => { h(id, err); });
  }

  fireStalled(id: string): void {
    this._stalledHandlers.forEach((h) => { h(id); });
  }
}

/** Concrete consumer that tracks start/close lifecycle */
class TestJobConsumer implements JobConsumer {
  started = false;
  start(): Promise<void> { this.started = true; return Promise.resolve(); }
  close(_timeout?: number): Promise<void> { this.started = false; return Promise.resolve(); }
}

/** Concrete metrics recorder that captures all calls for assertion */
class TestMetricsRecorder implements CrawlMetrics {
  readonly activeJobsHistory: number[] = [];
  readonly utilizationHistory: number[] = [];
  readonly fetchRecords: Array<{ status: string; errorKind: string | undefined }> = [];
  stalledJobs = 0;
  coordinatorRestarts = 0;

  recordFetch(status: string, errorKind?: string): void {
    this.fetchRecords.push({ status, errorKind: errorKind ?? undefined });
  }

  recordFetchDuration(_seconds: number): void { /* tracked elsewhere */ }
  recordUrlsDiscovered(_count: number): void { /* tracked elsewhere */ }
  setFrontierSize(_size: number): void { /* tracked elsewhere */ }

  setStalledJobs(count: number): void {
    this.stalledJobs = count;
  }

  setActiveJobs(count: number): void {
    this.activeJobsHistory.push(count);
  }

  setWorkerUtilization(ratio: number): void {
    this.utilizationHistory.push(ratio);
  }

  incrementCoordinatorRestarts(): void {
    this.coordinatorRestarts += 1;
  }
}

// --- T-WORK-009: Configurable concurrency tracking ---

describe('Concurrency tracking integration (REQ-DIST-007)', () => {
  let adapter: JobConsumerAdapter | undefined;

  afterEach(async () => {
    await adapter?.close();
    adapter = undefined;
  });

  // Validates REQ-DIST-007: at most N jobs processed simultaneously
  it('tracks up to maxConcurrency simultaneous jobs', async () => {
    const events = new TestEventSource();
    const metrics = new TestMetricsRecorder();
    const MAX_CONCURRENCY = 5;

    adapter = new JobConsumerAdapter({
      consumer: new TestJobConsumer(),
      events,
      metrics,
      maxConcurrency: MAX_CONCURRENCY,
      stalledConfig: createStalledJobConfig(),
    });
    await adapter.start();

    // Simulate 5 concurrent jobs starting (max concurrency)
    for (let i = 0; i < MAX_CONCURRENCY; i++) {
      events.fireActive(`job-${String(i)}`);
    }

    expect(adapter.tracker.activeJobs).toBe(MAX_CONCURRENCY);
    expect(adapter.tracker.ratio).toBe(1.0);

    // Verify metrics recorded all 5 jobs
    expect(metrics.activeJobsHistory).toContain(MAX_CONCURRENCY);
    expect(metrics.utilizationHistory).toContain(1.0);

    // Complete 2 jobs — utilization drops to 3/5
    events.fireCompleted('job-0');
    events.fireCompleted('job-1');

    expect(adapter.tracker.activeJobs).toBe(3);
    expect(adapter.tracker.ratio).toBeCloseTo(0.6);
  });

  // Validates REQ-DIST-007: interleaved lifecycle events correctly tracked
  it('handles concurrent start/complete interleaving', async () => {
    const events = new TestEventSource();
    const metrics = new TestMetricsRecorder();

    adapter = new JobConsumerAdapter({
      consumer: new TestJobConsumer(),
      events,
      metrics,
      maxConcurrency: 3,
      stalledConfig: createStalledJobConfig(),
    });
    await adapter.start();

    // Interleaved: start-start-complete-start-complete-complete
    events.fireActive('j1');
    events.fireActive('j2');
    expect(adapter.tracker.activeJobs).toBe(2);

    events.fireCompleted('j1');
    expect(adapter.tracker.activeJobs).toBe(1);

    events.fireActive('j3');
    expect(adapter.tracker.activeJobs).toBe(2);

    events.fireCompleted('j2');
    events.fireCompleted('j3');
    expect(adapter.tracker.activeJobs).toBe(0);
    expect(adapter.processedTotal).toBe(3);
  });

  // Validates REQ-DIST-007: utilization ratio updates at each concurrency level
  it('reports correct utilization at each concurrency level', async () => {
    const events = new TestEventSource();
    const metrics = new TestMetricsRecorder();

    adapter = new JobConsumerAdapter({
      consumer: new TestJobConsumer(),
      events,
      metrics,
      maxConcurrency: 4,
      stalledConfig: createStalledJobConfig(),
    });
    await adapter.start();

    events.fireActive('j1');
    expect(metrics.utilizationHistory).toContain(0.25);

    events.fireActive('j2');
    expect(metrics.utilizationHistory).toContain(0.5);

    events.fireActive('j3');
    expect(metrics.utilizationHistory).toContain(0.75);

    events.fireActive('j4');
    expect(metrics.utilizationHistory).toContain(1.0);
  });
});

// --- T-WORK-016: Worker metrics exposure integration ---

describe('Worker metrics exposure integration (REQ-DIST-014)', () => {
  // Validates REQ-DIST-014: worker_active_jobs, worker_utilization_ratio, worker_jobs_processed_total
  it('exposes all worker metrics through adapter→reporter chain', async () => {
    const events = new TestEventSource();
    const metrics = new TestMetricsRecorder();
    const MAX_CONCURRENCY = 4;

    const adapter = new JobConsumerAdapter({
      consumer: new TestJobConsumer(),
      events,
      metrics,
      maxConcurrency: MAX_CONCURRENCY,
      stalledConfig: createStalledJobConfig(),
    });
    await adapter.start();

    // Create reporter wired to the adapter's tracker
    const logger = { warn: vi.fn() };
    const reporter = new WorkerMetricsReporter({
      tracker: adapter.tracker,
      metrics,
      activeCountProvider: { getActiveCount: () => Promise.resolve(adapter.tracker.activeJobs) },
      logger,
    });

    // Simulate job lifecycle
    events.fireActive('j1');
    events.fireActive('j2');
    events.fireCompleted('j1');
    events.fireFailed('j2', new Error('timeout'));

    // Trigger reporter tick — pushes metrics
    await reporter._tick();

    // Validates REQ-DIST-014: worker_active_jobs exposed
    expect(metrics.activeJobsHistory.length).toBeGreaterThan(0);
    // Current state: 0 active (both completed/failed)
    const lastActive = metrics.activeJobsHistory[metrics.activeJobsHistory.length - 1];
    expect(lastActive).toBe(0);

    // Validates REQ-DIST-014: worker_utilization_ratio exposed
    expect(metrics.utilizationHistory.length).toBeGreaterThan(0);
    const lastUtil = metrics.utilizationHistory[metrics.utilizationHistory.length - 1];
    expect(lastUtil).toBe(0);

    // Validates REQ-DIST-014: worker_jobs_processed_total by status
    expect(adapter.processedTotal).toBe(1);
    expect(adapter.failedTotal).toBe(1);

    await adapter.close();
    reporter.stop();
  });

  // Validates REQ-DIST-014: stalled jobs metric exposure
  it('exposes stalled job metrics', async () => {
    const events = new TestEventSource();
    const metrics = new TestMetricsRecorder();

    const adapter = new JobConsumerAdapter({
      consumer: new TestJobConsumer(),
      events,
      metrics,
      maxConcurrency: 2,
      stalledConfig: createStalledJobConfig(),
    });

    events.fireActive('j1');
    events.fireStalled('j1');

    expect(adapter.stalledTotal).toBe(1);
    expect(metrics.stalledJobs).toBe(1);

    await adapter.close();
  });

  // Validates REQ-DIST-013, REQ-DIST-014: counter reset detection and metric
  it('reports counter reset metric on inconsistency', async () => {
    const events = new TestEventSource();
    const metrics = new TestMetricsRecorder();

    const adapter = new JobConsumerAdapter({
      consumer: new TestJobConsumer(),
      events,
      metrics,
      maxConcurrency: 2,
      stalledConfig: createStalledJobConfig(),
    });

    // Force inconsistency: 3 active with max 2
    events.fireActive('j1');
    events.fireActive('j2');
    events.fireActive('j3');
    expect(adapter.tracker.isInconsistent()).toBe(true);

    const logger = { warn: vi.fn() };
    const reporter = new WorkerMetricsReporter({
      tracker: adapter.tracker,
      metrics,
      activeCountProvider: { getActiveCount: () => Promise.resolve(1) },
      logger,
    });

    await reporter._tick();

    // Validates REQ-DIST-013 + REQ-DIST-014: utilization_counter_reset_total
    expect(reporter.counterResetCount).toBe(1);
    expect(metrics.coordinatorRestarts).toBe(1);
    expect(adapter.tracker.activeJobs).toBe(1);

    await adapter.close();
    reporter.stop();
  });
});
