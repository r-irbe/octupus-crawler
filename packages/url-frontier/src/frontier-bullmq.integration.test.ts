// BullMQ integration tests for frontier adapter
// Validates: T-DIST-013 (retry backoff), T-DIST-014 (batch round-trip), T-DIST-015 (retention)
// ADR-002: BullMQ, ADR-007: Testcontainers

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Queue, Worker, type ConnectionOptions } from 'bullmq';
import { startRedisContainer, type ManagedRedisContainer } from '@ipf/testing/containers/redis';
import { BullMQConnectionSchema, QueueConfigSchema } from '@ipf/job-queue/connection-config';
import { createBullMQQueueBackend } from '@ipf/job-queue/bullmq-queue-backend';
import { createFrontierAdapter } from './frontier-adapter.js';
import type { FrontierEntry } from '@ipf/core/contracts/frontier';
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

// Validates T-DIST-014: batch enqueue round-trip count → REQ-DIST-004
describe('T-DIST-014: batch enqueue round-trip', () => {
  it('enqueue N entries and verify count', async () => {
    const config = QueueConfigSchema.parse({ queueName: 'test-roundtrip' });
    const backend = createBullMQQueueBackend({ connection, config });
    const frontier = createFrontierAdapter({ backend });

    const entries: FrontierEntry[] = [
      { url: 'https://example.com/a', priority: 0, depth: 0 },
      { url: 'https://example.com/b', priority: 0, depth: 1 },
      { url: 'https://example.com/c', priority: 0, depth: 2 },
    ];

    const result = await frontier.enqueue(entries);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBe(3);
    }

    const size = await frontier.size();
    expect(size.isOk()).toBe(true);
    if (size.isOk()) {
      expect(size.value.total).toBeGreaterThanOrEqual(3);
    }

    await frontier.close();
  });

  it('deduplicates entries with same URL', async () => {
    const config = QueueConfigSchema.parse({ queueName: 'test-dedup-bullmq' });
    const backend = createBullMQQueueBackend({ connection, config });
    const frontier = createFrontierAdapter({ backend });

    const entries: FrontierEntry[] = [
      { url: 'https://example.com/same', priority: 0, depth: 0 },
      { url: 'https://example.com/same', priority: 0, depth: 1 },
    ];

    const result = await frontier.enqueue(entries);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBe(1);
    }

    await frontier.close();
  });
});

// Validates T-DIST-013: retry with backoff timing → REQ-DIST-003
describe('T-DIST-013: retry with backoff', () => {
  it('failed job is retried and ends in failed state', async () => {
    const queueName = 'test-retry-backoff';
    const backend = createBullMQQueueBackend({
      connection,
      config: QueueConfigSchema.parse({
        queueName,
        defaultAttempts: 2,
        backoffDelay: 100,
      }),
    });
    const frontier = createFrontierAdapter({ backend });

    let attemptCount = 0;
    const worker = new Worker(
      queueName,
      (): Promise<void> => {
        attemptCount++;
        throw new Error('deliberate failure');
      },
      { connection: connection as ConnectionOptions, autorun: true },
    );
    await worker.waitUntilReady();

    await frontier.enqueue([{ url: 'https://fail.test/page', priority: 0, depth: 0 }]);

    // Wait for retries (2 attempts * 100ms backoff + buffer)
    await new Promise((resolve) => { setTimeout(resolve, 2_000); });

    expect(attemptCount).toBeGreaterThanOrEqual(2);

    const queue = new Queue(queueName, { connection: connection as ConnectionOptions });
    const failedCount = await queue.getJobCountByTypes('failed');
    expect(failedCount).toBeGreaterThanOrEqual(1);

    await worker.close();
    await queue.close();
    await frontier.close();
  });
});

// Validates T-DIST-015: retention window eviction → REQ-DIST-005
describe('T-DIST-015: retention eviction', () => {
  it('completed jobs respect count-based retention', async () => {
    const queueName = 'test-retention';
    const backend = createBullMQQueueBackend({
      connection,
      config: QueueConfigSchema.parse({
        queueName,
        removeOnCompleteAge: 1,
        removeOnCompleteCount: 1,
      }),
    });
    const frontier = createFrontierAdapter({
      backend,
      config: {
        retry: { attempts: 1, backoffType: 'exponential', backoffDelay: 100 },
        retention: { completedLimit: 1, failedLimit: 1 },
      },
    });

    let processed = 0;
    const worker = new Worker(
      queueName,
      (): Promise<void> => { processed++; return Promise.resolve(); },
      { connection: connection as ConnectionOptions, autorun: true },
    );
    await worker.waitUntilReady();

    await frontier.enqueue([
      { url: 'https://retain.test/1', priority: 0, depth: 0 },
      { url: 'https://retain.test/2', priority: 0, depth: 0 },
      { url: 'https://retain.test/3', priority: 0, depth: 0 },
    ]);

    // Wait for processing + eviction
    await new Promise((resolve) => { setTimeout(resolve, 3_000); });

    expect(processed).toBe(3);

    const queue = new Queue(queueName, { connection: connection as ConnectionOptions });
    const completedCount = await queue.getJobCountByTypes('completed');
    // removeOnCompleteCount: 1 — retained completed jobs should be ≤1.
    // BullMQ eviction is async, but 3s wait gives ample time to settle.
    expect(completedCount).toBeLessThanOrEqual(1);

    await worker.close();
    await queue.close();
    await frontier.close();
  });
});
