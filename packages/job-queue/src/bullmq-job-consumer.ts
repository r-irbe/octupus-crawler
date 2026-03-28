// BullMQ adapter for JobConsumer port interface — wraps BullMQ Worker
// Implements: T-ARCH-009, ADR-002 (BullMQ Worker), ADR-015 (hexagonal)

import { Worker, type ConnectionOptions, type Job } from 'bullmq';
import type { JobConsumer } from '@ipf/core/contracts/job-consumer';
import type { BullMQConnection, QueueConfig } from './connection-config.js';

/** Job data shape that flows through the queue. */
export type CrawlJobData = {
  readonly url: string;
  readonly depth: number;
};

/** Processor function that handles each job — provided by the consumer. */
export type JobProcessor = (job: Job<CrawlJobData>) => Promise<void>;

export type JobConsumerDeps = {
  readonly connection: BullMQConnection;
  readonly config: QueueConfig;
  readonly processor: JobProcessor;
};

/** ADR-002: concurrency 10, per-domain rate limiting via limiter groupKey. */
export function createBullMQJobConsumer(deps: JobConsumerDeps): JobConsumer {
  let worker: Worker<CrawlJobData> | undefined;

  async function start(): Promise<void> {
    if (worker !== undefined) return; // idempotent
    worker = new Worker<CrawlJobData>(
      deps.config.queueName,
      deps.processor,
      {
        connection: deps.connection as ConnectionOptions,
        concurrency: deps.config.concurrency,
        autorun: true,
      },
    );
    // Wait for the worker to be ready (connected to Redis)
    await worker.waitUntilReady();
  }

  async function close(timeout?: number): Promise<void> {
    if (worker === undefined) return; // idempotent
    const force = timeout !== undefined && timeout <= 0;
    await worker.close(force);
    worker = undefined;
  }

  return { start, close };
}
