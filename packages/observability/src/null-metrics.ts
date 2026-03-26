// NullMetrics — no-op CrawlMetrics implementation for tests
// Implements: T-OBS-012, REQ-OBS-018

import type { CrawlMetrics } from '@ipf/core/contracts/crawl-metrics';

export class NullMetrics implements CrawlMetrics {
  recordFetch(_status: string, _errorKind?: string): void {
    // no-op
  }

  recordFetchDuration(_seconds: number): void {
    // no-op
  }

  recordUrlsDiscovered(_count: number): void {
    // no-op
  }

  setFrontierSize(_size: number): void {
    // no-op
  }

  setStalledJobs(_count: number): void {
    // no-op
  }

  setActiveJobs(_count: number): void {
    // no-op
  }

  setWorkerUtilization(_ratio: number): void {
    // no-op
  }

  incrementCoordinatorRestarts(): void {
    // no-op
  }
}
