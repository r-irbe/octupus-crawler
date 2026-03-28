// BullMQ integration tests for worker management
// Validates: T-WORK-010 (stalled job recovery), T-WORK-014 (crash recovery)
// ADR-002: BullMQ, ADR-007: Testcontainers

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Queue, Worker, type ConnectionOptions, type Job } from 'bullmq';
import { startRedisContainer, type ManagedRedisContainer } from '@ipf/testing/containers/redis';
import { BullMQConnectionSchema } from '@ipf/job-queue/connection-config';
import type { BullMQConnection } from '@ipf/job-queue/connection-config';

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

// Validates T-WORK-014: worker crash recovery and re-registration → REQ-DIST-012
describe('T-WORK-014: worker crash recovery', () => {
  it('new worker picks up pending jobs after old worker close', async () => {
    const queueName = 'test-crash-recovery';
    const queue = new Queue(queueName, { connection: connection as ConnectionOptions });

    // Add jobs
    await queue.add('crawl', { url: 'https://recover.test/1' });
    await queue.add('crawl', { url: 'https://recover.test/2' });

    // First worker processes one job then "crashes"
    const firstProcessed: string[] = [];
    const worker1 = new Worker<{ url: string }>(
      queueName,
      (job: Job<{ url: string }>): Promise<void> => {
        firstProcessed.push(job.data.url);
        return Promise.resolve();
      },
      { connection: connection as ConnectionOptions, concurrency: 1, autorun: true },
    );
    await worker1.waitUntilReady();

    // Wait for first worker to process
    await new Promise((resolve) => { setTimeout(resolve, 500); });

    // "Crash" the first worker
    await worker1.close();

    // Add more jobs after crash
    await queue.add('crawl', { url: 'https://recover.test/3' });

    // Second worker picks up remaining work
    const secondProcessed: string[] = [];
    const worker2 = new Worker<{ url: string }>(
      queueName,
      (job: Job<{ url: string }>): Promise<void> => {
        secondProcessed.push(job.data.url);
        return Promise.resolve();
      },
      { connection: connection as ConnectionOptions, concurrency: 1, autorun: true },
    );
    await worker2.waitUntilReady();

    // Wait for second worker
    await new Promise((resolve) => { setTimeout(resolve, 1_000); });

    // Total processed should cover all jobs
    const total = firstProcessed.length + secondProcessed.length;
    expect(total).toBeGreaterThanOrEqual(3);

    // Second worker should have processed at least the new job
    expect(secondProcessed.length).toBeGreaterThanOrEqual(1);

    await worker2.close();
    await queue.close();
  });
});

// Validates T-WORK-010: stalled job recovery → REQ-DIST-008
describe('T-WORK-010: stalled job recovery', () => {
  it('crashed worker job is reprocessed by recovery worker', async () => {
    const queueName = 'test-stalled-recovery';
    const queue = new Queue(queueName, { connection: connection as ConnectionOptions });

    await queue.add('crawl', { url: 'https://stalled.test/page' });

    // Worker 1: picks up the job, then we force-close to simulate crash.
    // The job stays active in Redis with an expiring lock.
    let w1Active = false;
    const worker1 = new Worker<{ url: string }>(
      queueName,
      async (): Promise<void> => {
        w1Active = true;
        // Hold the job indefinitely — simulates long processing before crash
        await new Promise<void>(() => { /* never resolves */ });
      },
      {
        connection: connection as ConnectionOptions,
        lockDuration: 500,
        // stalledInterval must be short so the stalled-check key in Redis
        // expires before worker2 starts (key TTL = stalledInterval)
        stalledInterval: 500,
        autorun: true,
      },
    );
    await worker1.waitUntilReady();

    // Wait for worker1 to pick up the job
    const waitForActive = async (): Promise<void> => {
      for (let i = 0; i < 40; i++) {
        if (w1Active) return;
        await new Promise((r) => { setTimeout(r, 50); });
      }
    };
    await waitForActive();
    expect(w1Active).toBe(true);

    // Sever worker1's Redis connection — simulates crash.
    // Unlike close(), disconnect() does NOT clean up active jobs.
    // The job remains active in Redis with an expiring lock.
    await worker1.disconnect();

    // Wait for worker1's lock + stalled-check key to expire
    await new Promise((resolve) => { setTimeout(resolve, 1_000); });

    // Worker 2: recovery worker with stalled detection.
    // When worker2 runs its stalled check, it finds the orphaned job
    // (lock expired) and moves it back to waiting for reprocessing.
    let reprocessed = false;

    const worker2 = new Worker<{ url: string }>(
      queueName,
      (): Promise<void> => {
        reprocessed = true;
        return Promise.resolve();
      },
      {
        connection: connection as ConnectionOptions,
        stalledInterval: 300,
        maxStalledCount: 2,
        autorun: true,
      },
    );
    await worker2.waitUntilReady();

    // Wait for stalled detection + reprocessing
    await new Promise((resolve) => { setTimeout(resolve, 3_000); });

    // The job must have been reprocessed by worker2 via stalled detection
    expect(reprocessed).toBe(true);

    // worker1 was disconnected (crash simulation) — its internal timers
    // are orphaned but harmless; container teardown reclaims everything.
    await worker2.close();
    await queue.close();
  }, 15_000);
});
