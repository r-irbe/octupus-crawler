// BullMQ adapter for QueueBackend port interface
// Implements: T-DIST-007, ADR-002 (BullMQ), ADR-015 (hexagonal)

import { Queue, type ConnectionOptions } from 'bullmq';
import { ok, err } from 'neverthrow';
import type { AsyncResult } from '@ipf/core/types/result';
import type { QueueError } from '@ipf/core/errors/queue-error';
import { createQueueError } from '@ipf/core/errors/queue-error';
import type { QueueConfig, BullMQConnection } from './connection-config.js';

// SYNC: must match @ipf/url-frontier/src/queue-backend.ts types.
// Mirrored here to avoid circular dependency (job-queue → url-frontier → job-queue).
// Integration tests in url-frontier verify structural compatibility at compile time.
export type JobData = { readonly url: string; readonly depth: number };
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
export type BulkAddResult = { readonly added: number; readonly submitted: number };
export type QueueBackend = {
  addBulk(jobs: readonly JobSpec[]): AsyncResult<BulkAddResult, QueueError>;
  getQueueSize(): AsyncResult<{ pending: number; active: number; total: number }, QueueError>;
  close(): Promise<void>;
};

export type QueueBackendDeps = {
  readonly connection: BullMQConnection;
  readonly config: QueueConfig;
};

/** Map a JobSpec to BullMQ's bulk add format. */
function toBullMQJob(spec: JobSpec): {
  name: string;
  data: { url: string; depth: number };
  opts: {
    jobId: string;
    priority: number;
    attempts: number;
    backoff: { type: 'exponential'; delay: number };
    removeOnComplete: { age: number };
    removeOnFail: { age: number };
  };
} {
  return {
    name: 'crawl',
    data: spec.data,
    opts: {
      jobId: spec.jobId,
      priority: spec.priority,
      attempts: spec.attempts,
      backoff: { type: spec.backoffType, delay: spec.backoffDelay },
      removeOnComplete: { age: spec.removeOnComplete },
      removeOnFail: { age: spec.removeOnFail },
    },
  };
}

export function createBullMQQueueBackend(deps: QueueBackendDeps): QueueBackend {
  const queue = new Queue(deps.config.queueName, {
    connection: deps.connection as ConnectionOptions,
    defaultJobOptions: {
      attempts: deps.config.defaultAttempts,
      backoff: { type: deps.config.backoffType, delay: deps.config.backoffDelay },
      removeOnComplete: { age: deps.config.removeOnCompleteAge, count: deps.config.removeOnCompleteCount },
      removeOnFail: { age: deps.config.removeOnFailAge },
    },
  });

  async function addBulk(
    jobs: readonly JobSpec[],
  ): AsyncResult<BulkAddResult, QueueError> {
    try {
      const bullmqJobs = jobs.map(toBullMQJob);
      const results = await queue.addBulk(bullmqJobs);
      return ok({ added: results.length, submitted: jobs.length });
    } catch (cause: unknown) {
      return err(createQueueError({ operation: 'addBulk', cause }));
    }
  }

  async function getQueueSize(): AsyncResult<
    { pending: number; active: number; total: number },
    QueueError
  > {
    try {
      const counts = await queue.getJobCounts(
        'waiting', 'active', 'delayed', 'completed', 'failed',
      );
      const pending = (counts['waiting'] ?? 0) + (counts['delayed'] ?? 0);
      const active = counts['active'] ?? 0;
      return ok({ pending, active, total: pending + active });
    } catch (cause: unknown) {
      return err(createQueueError({ operation: 'getQueueSize', cause }));
    }
  }

  async function close(): Promise<void> {
    await queue.close();
  }

  return { addBulk, getQueueSize, close };
}
