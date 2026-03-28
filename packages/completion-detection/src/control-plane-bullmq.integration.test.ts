// BullMQ integration test for control plane pause/resume with in-flight jobs
// Validates: T-COORD-023 (pause/resume) → REQ-DIST-018
// ADR-002: BullMQ, ADR-007: Testcontainers

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Queue, Worker, type ConnectionOptions, type Job } from 'bullmq';
import { startRedisContainer, type ManagedRedisContainer } from '@ipf/testing/containers/redis';
import { BullMQConnectionSchema, QueueConfigSchema } from '@ipf/job-queue/connection-config';
import { createBullMQQueueAdapter } from '@ipf/job-queue/bullmq-queue-adapter';
import type { BullMQConnection } from '@ipf/job-queue/connection-config';
import type { QueueAdapter } from './control-plane-adapter.js';

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

// Validates T-COORD-023: pause/resume with in-flight jobs → REQ-DIST-018
describe('T-COORD-023: pause/resume with in-flight jobs', () => {
  it('pause stops new job pickup, resume continues', async () => {
    const queueName = 'test-pause-resume';
    const config = QueueConfigSchema.parse({ queueName });
    const adapter: QueueAdapter = createBullMQQueueAdapter({ connection, config });

    const processed: string[] = [];
    const queue = new Queue(queueName, { connection: connection as ConnectionOptions });

    const worker = new Worker<{ url: string }>(
      queueName,
      (job: Job<{ url: string }>): Promise<void> => {
        processed.push(job.data.url);
        return Promise.resolve();
      },
      { connection: connection as ConnectionOptions, autorun: true },
    );
    await worker.waitUntilReady();

    // Add initial jobs
    await queue.addBulk([
      { name: 'crawl', data: { url: 'https://a.test' } },
      { name: 'crawl', data: { url: 'https://b.test' } },
    ]);

    // Wait for initial processing
    await new Promise((resolve) => { setTimeout(resolve, 500); });
    expect(processed.length).toBeGreaterThanOrEqual(1);

    // Pause the queue
    const pauseResult = await adapter.pause();
    expect(pauseResult.isOk()).toBe(true);

    const beforePauseCount = processed.length;

    // Add a job while paused — it should NOT be processed
    await queue.add('crawl', { url: 'https://paused.test' });
    await new Promise((resolve) => { setTimeout(resolve, 500); });

    // Jobs added during pause should not be processed
    const afterPauseCount = processed.length;
    expect(afterPauseCount).toBe(beforePauseCount);

    // Verify paused state via getJobCounts
    const countsResult = await adapter.getJobCounts();
    expect(countsResult.isOk()).toBe(true);
    if (countsResult.isOk()) {
      expect(countsResult.value.paused).toBeGreaterThanOrEqual(1);
    }

    // Resume the queue
    const resumeResult = await adapter.resume();
    expect(resumeResult.isOk()).toBe(true);

    // Wait for resumed processing
    await new Promise((resolve) => { setTimeout(resolve, 1_000); });

    // After resume, the paused job should be processed
    expect(processed.length).toBeGreaterThan(afterPauseCount);

    await worker.close();
    await queue.close();
    await adapter.close();
  });

  it('getJobCounts reflects paused state', async () => {
    const queueName = 'test-paused-counts';
    const config = QueueConfigSchema.parse({ queueName });
    const adapter: QueueAdapter = createBullMQQueueAdapter({ connection, config });
    const queue = new Queue(queueName, { connection: connection as ConnectionOptions });

    // Add jobs, then pause before processing
    await adapter.pause();
    await queue.add('crawl', { url: 'https://counted.test' });

    const counts = await adapter.getJobCounts();
    expect(counts.isOk()).toBe(true);
    if (counts.isOk()) {
      expect(counts.value.paused).toBeGreaterThanOrEqual(1);
    }

    await adapter.resume();
    await queue.obliterate({ force: true });
    await queue.close();
    await adapter.close();
  });
});
