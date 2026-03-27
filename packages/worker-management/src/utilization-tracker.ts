// UtilizationTracker — in-process worker utilization counter with floor guard
// Implements: T-WORK-001, T-WORK-002, REQ-DIST-011, REQ-DIST-013

export type UtilizationSnapshot = {
  readonly activeJobs: number;
  readonly maxConcurrency: number;
  readonly ratio: number;
};

export class UtilizationTracker {
  private _activeJobs: number = 0;
  private readonly _maxConcurrency: number;

  constructor(maxConcurrency: number) {
    if (maxConcurrency < 1 || !Number.isInteger(maxConcurrency)) {
      throw new Error(`maxConcurrency must be a positive integer, got ${String(maxConcurrency)}`);
    }
    this._maxConcurrency = maxConcurrency;
  }

  get activeJobs(): number {
    return this._activeJobs;
  }

  get maxConcurrency(): number {
    return this._maxConcurrency;
  }

  get ratio(): number {
    return this._activeJobs / this._maxConcurrency;
  }

  /** Increment on job start (T-WORK-002) */
  onJobStarted(): void {
    this._activeJobs += 1;
  }

  /** Decrement on job complete with floor guard (T-WORK-001) */
  onJobCompleted(): void {
    this._activeJobs = Math.max(0, this._activeJobs - 1);
  }

  /** Decrement on job failure with floor guard (T-WORK-001) */
  onJobFailed(): void {
    this._activeJobs = Math.max(0, this._activeJobs - 1);
  }

  /** Decrement on stalled job with floor guard */
  onJobStalled(): void {
    this._activeJobs = Math.max(0, this._activeJobs - 1);
  }

  /** Reset counter to known value (REQ-DIST-013 — counter inconsistency guard) */
  reset(actualActiveCount: number): void {
    this._activeJobs = Math.max(0, actualActiveCount);
  }

  /** Check if counter is inconsistent (activeJobs > maxConcurrency) */
  isInconsistent(): boolean {
    return this._activeJobs > this._maxConcurrency;
  }

  snapshot(): UtilizationSnapshot {
    return {
      activeJobs: this._activeJobs,
      maxConcurrency: this._maxConcurrency,
      ratio: this.ratio,
    };
  }
}
