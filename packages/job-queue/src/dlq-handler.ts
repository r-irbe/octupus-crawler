// BullMQ Dead Letter Queue handler — moves failed jobs + emits events
// Implements: T-RES-014 (REQ-RES-016), T-RES-015 (REQ-RES-017)
// Design: docs/specs/resilience-patterns/design.md §Dead Letter Queue

import { Queue, type ConnectionOptions } from 'bullmq';
import { ok, err, type Result } from 'neverthrow';

export type DLQConfig = {
  /** Source queue name (where failed jobs come from). */
  readonly sourceQueue: string;
  /** DLQ queue name. Defaults to `${sourceQueue}-dlq`. */
  readonly dlqQueue: string;
  /** Max age (ms) for DLQ entries before cleanup. Default: 7 days. */
  readonly retentionMs: number;
};

export const DEFAULT_DLQ_CONFIG: Partial<DLQConfig> = {
  retentionMs: 7 * 24 * 60 * 60 * 1_000, // 7 days
} as const;

export type DLQJobData = {
  readonly originalJobId: string;
  readonly originalQueue: string;
  readonly failedAt: string;
  readonly attempts: number;
  readonly lastError: string;
  readonly payload: unknown;
};

export type DLQError =
  | { readonly _tag: 'ConnectionError'; readonly message: string }
  | { readonly _tag: 'QueueError'; readonly message: string };

/** Callback for DLQ events — metrics + alerting (REQ-RES-017). */
export type DLQEventHandler = (job: DLQJobData) => void;

export type DLQHandler = {
  /** Move a failed job to the DLQ. */
  readonly moveToDeadLetter: (
    jobId: string,
    payload: unknown,
    attempts: number,
    lastError: string,
  ) => Promise<Result<void, DLQError>>;
  /** Get count of jobs in DLQ. */
  readonly getCount: () => Promise<Result<number, DLQError>>;
  /** Close connections. */
  readonly close: () => Promise<void>;
};

/**
 * Creates a BullMQ Dead Letter Queue handler.
 * REQ-RES-016: Jobs moved to DLQ after retry exhaustion.
 * REQ-RES-017: Emit metric + alert-eligible event on DLQ move.
 */
export function createDLQHandler(
  connection: ConnectionOptions,
  sourceQueue: string,
  onDeadLetter: DLQEventHandler,
  config: Partial<DLQConfig> = {},
): DLQHandler {
  const dlqQueueName = config.dlqQueue ?? `${sourceQueue}-dlq`;
  const retentionMs = config.retentionMs ?? DEFAULT_DLQ_CONFIG.retentionMs ?? 604_800_000;

  const dlq = new Queue<DLQJobData>(dlqQueueName, {
    connection,
    defaultJobOptions: {
      removeOnComplete: {
        age: Math.floor(retentionMs / 1_000),
      },
      removeOnFail: false, // Keep DLQ jobs for investigation
      attempts: 1, // DLQ jobs don't retry
    },
  });

  async function moveToDeadLetter(
    jobId: string,
    payload: unknown,
    attempts: number,
    lastError: string,
  ): Promise<Result<void, DLQError>> {
    const dlqJob: DLQJobData = {
      originalJobId: jobId,
      originalQueue: sourceQueue,
      failedAt: new Date().toISOString(),
      attempts,
      lastError,
      payload,
    };

    try {
      await dlq.add('dead-letter', dlqJob, {
        jobId: `dlq-${jobId}`,
      });

      // REQ-RES-017: Emit event for metrics + alerting
      onDeadLetter(dlqJob);

      return ok(undefined);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return err({ _tag: 'QueueError', message });
    }
  }

  async function getCount(): Promise<Result<number, DLQError>> {
    try {
      const counts = await dlq.getJobCounts('waiting', 'delayed', 'completed', 'failed');
      return ok((counts.waiting ?? 0) + (counts.delayed ?? 0) + (counts.failed ?? 0));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return err({ _tag: 'ConnectionError', message });
    }
  }

  async function close(): Promise<void> {
    await dlq.close();
  }

  return { moveToDeadLetter, getCount, close };
}
