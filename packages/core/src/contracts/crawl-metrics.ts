// CrawlMetrics — observability metrics contract (synchronous)
// Implements: T-ARCH-008, REQ-ARCH-002, REQ-ARCH-010

export interface CrawlMetrics {
  recordFetch(status: string, errorKind?: string): void;
  recordFetchDuration(seconds: number): void;
  recordUrlsDiscovered(count: number): void;
  setFrontierSize(size: number): void;
  setStalledJobs(count: number): void;
  setActiveJobs(count: number): void;
  setWorkerUtilization(ratio: number): void;
  incrementCoordinatorRestarts(): void;
}
