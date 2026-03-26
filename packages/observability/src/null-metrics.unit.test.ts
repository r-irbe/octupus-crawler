// NullMetrics unit tests
// Validates: T-OBS-012, REQ-OBS-018

import { describe, it, expect } from 'vitest';
import { NullMetrics } from './null-metrics.js';

describe('NullMetrics', () => {
  // Validates REQ-OBS-018: no-op metrics implementation for tests
  it('should implement all CrawlMetrics methods without throwing', () => {
    const metrics = new NullMetrics();

    expect(() => {
      metrics.recordFetch('success');
      metrics.recordFetch('error', 'timeout');
      metrics.recordFetchDuration(0.5);
      metrics.recordUrlsDiscovered(10);
      metrics.setFrontierSize(1000);
      metrics.setStalledJobs(2);
      metrics.setActiveJobs(5);
      metrics.setWorkerUtilization(0.8);
      metrics.incrementCoordinatorRestarts();
    }).not.toThrow();
  });
});
