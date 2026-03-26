// QueueBackend — port interface for hexagonal architecture
// Implements: T-DIST-007, ADR-015 (hexagonal, dependency inversion)

import type { AsyncResult } from '@ipf/core/types/result';
import type { QueueError } from '@ipf/core/errors/queue-error';

/** A single job to be added to the queue. */
export type JobSpec = {
  readonly jobId: string;
  readonly data: JobData;
  readonly priority: number;
  readonly attempts: number;
  readonly backoffType: 'exponential';
  readonly backoffDelay: number;
  readonly removeOnComplete: number;
  readonly removeOnFail: number;
};

/** Data payload stored in each job. */
export type JobData = {
  readonly url: string;
  readonly depth: number;
};

/** Result of a bulk add operation. */
export type BulkAddResult = {
  /** Number of jobs successfully added (excludes duplicates). */
  readonly added: number;
  /** Total number of jobs submitted. */
  readonly submitted: number;
};

/**
 * Port interface for the queue backend.
 * Production: implemented by BullMQ adapter.
 * Test: implemented by in-memory stub.
 */
export interface QueueBackend {
  addBulk(jobs: readonly JobSpec[]): AsyncResult<BulkAddResult, QueueError>;
  getQueueSize(): AsyncResult<{ pending: number; active: number; total: number }, QueueError>;
  close(): Promise<void>;
}
