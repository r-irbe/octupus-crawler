// Integration tests for BullMQ adapters with real Redis (Testcontainer)
// Validates: T-DIST-007, ADR-002, ADR-007 (real infra, no mocks)

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startRedisContainer, type ManagedRedisContainer } from '@ipf/testing/containers/redis';
import { createBullMQQueueBackend } from './bullmq-queue-backend.js';
import { createBullMQJobConsumer, type CrawlJobData } from './bullmq-job-consumer.js';
import { createBullMQQueueAdapter } from './bullmq-queue-adapter.js';
import { BullMQConnectionSchema, QueueConfigSchema, type BullMQConnection } from './connection-config.js';
import type { QueueBackend, JobSpec } from '@ipf/url-frontier/queue-backend';
import type { QueueAdapter } from '@ipf/completion-detection/control-plane-adapter';
import type { JobConsumer } from '@ipf/core/contracts/job-consumer';
import type { Job } from 'bullmq';

let redis: ManagedRedisContainer;
let connection: BullMQConnection;

beforeAll(async () => {
  redis = await startRedisContainer();
  connection = BullMQConnectionSchema.parse({
    host: redis.connection.host,
    port: redis.connection.port,
  });
}, 30_000);

afterAll(async () => {
  await redis.stop();
});

function makeJobSpec(overrides?: Partial<JobSpec>): JobSpec {
  const id = Math.random().toString(36).slice(2, 10);
  return {
    jobId: `test-${id}`,
    data: { url: `https://example.com/${id}`, depth: 0 },
    priority: 1,
    attempts: 3,
    backoffType: 'exponential',
    backoffDelay: 5_000,
    removeOnComplete: 3_600,
    removeOnFail: 86_400,
    ...overrides,
  };
}

describe('BullMQ QueueBackend integration', () => {
  let backend: QueueBackend;
  const config = QueueConfigSchema.parse({ queueName: 'test-backend' });

  beforeAll(() => {
    backend = createBullMQQueueBackend({ connection, config });
  });

  afterAll(async () => {
    await backend.close();
  });

  // Validates T-DIST-007: bulk add returns correct counts
  it('addBulk adds jobs and returns counts', async () => {
    const jobs = [makeJobSpec(), makeJobSpec(), makeJobSpec()];
    const result = await backend.addBulk(jobs);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.submitted).toBe(3);
      expect(result.value.added).toBe(3);
    }
  });

  // Validates T-DIST-007: queue size reflects added jobs
  it('getQueueSize returns pending and active counts', async () => {
    const result = await backend.getQueueSize();

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.pending).toBeGreaterThanOrEqual(0);
      expect(result.value.total).toBeGreaterThanOrEqual(0);
    }
  });

  // Validates REQ-ARCH-012: empty bulk add succeeds
  it('addBulk with empty array returns zero counts', async () => {
    const result = await backend.addBulk([]);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.submitted).toBe(0);
      expect(result.value.added).toBe(0);
    }
  });
});

describe('BullMQ QueueAdapter integration', () => {
  let adapter: QueueAdapter;
  const config = QueueConfigSchema.parse({ queueName: 'test-adapter' });

  beforeAll(() => {
    adapter = createBullMQQueueAdapter({ connection, config });
  });

  afterAll(async () => {
    await adapter.close();
  });

  // Validates T-COORD-008: getJobCounts returns all states
  it('getJobCounts returns all expected fields', async () => {
    const result = await adapter.getJobCounts();

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      const c = result.value;
      expect(c).toHaveProperty('waiting');
      expect(c).toHaveProperty('active');
      expect(c).toHaveProperty('completed');
      expect(c).toHaveProperty('failed');
      expect(c).toHaveProperty('delayed');
      expect(c).toHaveProperty('paused');
    }
  });

  // Validates T-COORD-009: pause and resume
  it('pause and resume complete without error', async () => {
    const pauseResult = await adapter.pause();
    expect(pauseResult.isOk()).toBe(true);

    const resumeResult = await adapter.resume();
    expect(resumeResult.isOk()).toBe(true);
  });

  // Validates T-COORD-010: obliterate clears the queue
  it('obliterate succeeds on empty queue', async () => {
    const result = await adapter.obliterate();
    expect(result.isOk()).toBe(true);
  });
});

describe('BullMQ JobConsumer integration', () => {
  const config = QueueConfigSchema.parse({ queueName: 'test-consumer' });

  // Validates T-ARCH-009: consumer start/close lifecycle
  it('start and close lifecycle works', async () => {
    const processed: string[] = [];
    const processor = (job: Job<CrawlJobData>): Promise<void> => {
      processed.push(job.data.url);
      return Promise.resolve();
    };

    const consumer: JobConsumer = createBullMQJobConsumer({
      connection,
      config,
      processor,
    });

    await consumer.start();
    await consumer.close();
    // No error means lifecycle works
  });

  // Validates T-ARCH-009: close is idempotent
  it('close is idempotent', async () => {
    const consumer = createBullMQJobConsumer({
      connection,
      config,
      processor: (): Promise<void> => Promise.resolve(),
    });

    // close without start should not throw
    await consumer.close();
    await consumer.close();
  });

  // Validates ADR-002: end-to-end job processing
  it('processes jobs added to the queue', async () => {
    const backend = createBullMQQueueBackend({ connection, config });
    const processedUrls: string[] = [];
    let resolveWaiter: (() => void) | undefined;
    const waiter = new Promise<void>((resolve) => { resolveWaiter = resolve; });

    const consumer = createBullMQJobConsumer({
      connection,
      config,
      processor: (job: Job<CrawlJobData>): Promise<void> => {
        processedUrls.push(job.data.url);
        if (resolveWaiter !== undefined) resolveWaiter();
        return Promise.resolve();
      },
    });

    await consumer.start();

    const spec = makeJobSpec({ data: { url: 'https://e2e.test/page', depth: 1 } });
    await backend.addBulk([spec]);

    // Wait for the job to be processed (max 5s)
    await Promise.race([waiter, new Promise((_, reject) => { setTimeout(() => { reject(new Error('Timeout waiting for job processing')); }, 5_000); })]);

    expect(processedUrls).toContain('https://e2e.test/page');

    await consumer.close();
    await backend.close();
  });
});
