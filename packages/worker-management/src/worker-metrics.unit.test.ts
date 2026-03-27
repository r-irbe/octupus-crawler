// WorkerMetricsReporter unit tests
// Validates: REQ-DIST-013 (counter guard), REQ-DIST-014 (metrics)
// Tasks: T-WORK-015, T-WORK-013

import { describe, it, expect, vi } from 'vitest';
import { UtilizationTracker } from './utilization-tracker.js';
import { WorkerMetricsReporter } from './worker-metrics.js';
import type { CrawlMetrics } from '@ipf/core/contracts/crawl-metrics';

function createMockMetrics(): CrawlMetrics {
  return {
    recordFetch: vi.fn(),
    recordFetchDuration: vi.fn(),
    recordUrlsDiscovered: vi.fn(),
    setFrontierSize: vi.fn(),
    setStalledJobs: vi.fn(),
    setActiveJobs: vi.fn(),
    setWorkerUtilization: vi.fn(),
    incrementCoordinatorRestarts: vi.fn(),
  };
}

describe('WorkerMetricsReporter', () => {
  // T-WORK-013: metrics push
  describe('metrics reporting (REQ-DIST-014)', () => {
    it('pushes utilization metrics on tick', async () => {
      const tracker = new UtilizationTracker(4);
      tracker.onJobStarted();
      tracker.onJobStarted();
      const metrics = createMockMetrics();
      const reporter = new WorkerMetricsReporter({
        tracker,
        metrics,
        activeCountProvider: { getActiveCount: () => Promise.resolve(2) },
        logger: { warn: vi.fn() },
      });

      await reporter._tick();

      expect(metrics.setActiveJobs).toHaveBeenCalledWith(2);
      expect(metrics.setWorkerUtilization).toHaveBeenCalledWith(0.5);
    });
  });

  // T-WORK-015: counter inconsistency detection and reset
  describe('counter inconsistency guard (REQ-DIST-013)', () => {
    it('resets counter when activeJobs > maxConcurrency', async () => {
      const tracker = new UtilizationTracker(2);
      // Simulate inconsistency: 3 starts with max 2
      tracker.onJobStarted();
      tracker.onJobStarted();
      tracker.onJobStarted();
      expect(tracker.isInconsistent()).toBe(true);

      const metrics = createMockMetrics();
      const logger = { warn: vi.fn() };
      const reporter = new WorkerMetricsReporter({
        tracker,
        metrics,
        activeCountProvider: { getActiveCount: () => Promise.resolve(1) },
        logger,
      });

      await reporter._tick();

      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({ expected: 3, actual: 1, max: 2 }),
        expect.stringContaining('inconsistency'),
      );
      expect(tracker.activeJobs).toBe(1);
      expect(reporter.counterResetCount).toBe(1);
      expect(metrics.incrementCoordinatorRestarts).toHaveBeenCalled();
    });

    it('does not reset when counter is consistent', async () => {
      const tracker = new UtilizationTracker(4);
      tracker.onJobStarted();
      const metrics = createMockMetrics();
      const logger = { warn: vi.fn() };
      const reporter = new WorkerMetricsReporter({
        tracker,
        metrics,
        activeCountProvider: { getActiveCount: () => Promise.resolve(1) },
        logger,
      });

      await reporter._tick();

      expect(logger.warn).not.toHaveBeenCalled();
      expect(reporter.counterResetCount).toBe(0);
    });
  });
});
