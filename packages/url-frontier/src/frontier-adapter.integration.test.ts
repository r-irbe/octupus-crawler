// Frontier integration test — real Redis via Testcontainers
// Validates: REQ-TEST-005 (real infra), REQ-TEST-008 (frontier enqueue, dequeue, dedup)
// Implements: T-TEST-013

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type RedisClientType } from 'redis';
import { ok } from 'neverthrow';
import { startRedisContainer, type ManagedRedisContainer } from '@ipf/testing/containers/redis';
import type { QueueBackend, JobSpec, BulkAddResult } from './queue-backend.js';
import type { QueueError } from '@ipf/core/errors/queue-error';
import type { AsyncResult } from '@ipf/core/types/result';
import { createFrontierAdapter } from './frontier-adapter.js';
import type { FrontierEntry } from '@ipf/core/contracts/frontier';

/**
 * Redis-backed QueueBackend for integration testing.
 * Uses a Redis Set for dedup (like BullMQ's internal mechanism).
 */
function createRedisQueueBackend(client: RedisClientType, prefix: string): QueueBackend {
  const QUEUE_KEY = `${prefix}:queue`;
  const DEDUP_KEY = `${prefix}:dedup`;

  return {
    async addBulk(jobs: readonly JobSpec[]): AsyncResult<BulkAddResult, QueueError> {
      let added = 0;
      for (const job of jobs) {
        const isNew = await client.sAdd(DEDUP_KEY, job.jobId);
        if (isNew === 1) {
          await client.hSet(`${QUEUE_KEY}:${job.jobId}`, {
            url: job.data.url,
            depth: String(job.data.depth),
            priority: String(job.priority),
          });
          await client.zAdd(QUEUE_KEY, { score: job.priority, value: job.jobId });
          added++;
        }
      }
      return ok({ added, submitted: jobs.length });
    },

    async getQueueSize(): AsyncResult<{ pending: number; active: number; total: number }, QueueError> {
      const total = await client.zCard(QUEUE_KEY);
      return ok({ pending: total, active: 0, total });
    },

    async close(): Promise<void> {
      // test-only: KEYS is O(N), never use in production
      const keys = await client.keys(`${prefix}:*`);
      if (keys.length > 0) {
        await client.del(keys);
      }
    },
  };
}

function entry(url: string, depth: number): FrontierEntry {
  return { url, priority: 0, depth };
}

describe('Frontier with real Redis', () => {
  let container: ManagedRedisContainer;
  let client: RedisClientType;

  beforeAll(async () => {
    container = await startRedisContainer();
    client = createClient({ url: container.connection.url });
    await client.connect();
  }, 30_000);

  afterAll(async () => {
    // REQ-TEST-024: deterministic cleanup
    if (client.isOpen) {
      await client.quit();
    }
    await container.stop();
  });

  // Validates REQ-TEST-008: frontier enqueue with real Redis
  it('enqueues entries to real Redis', async () => {
    const backend = createRedisQueueBackend(client, 'test1');
    const frontier = createFrontierAdapter({ backend });

    const result = await frontier.enqueue([
      entry('https://example.com/page1', 0),
      entry('https://example.com/page2', 1),
    ]);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBe(2);
    }

    const sizeResult = await frontier.size();
    expect(sizeResult.isOk()).toBe(true);
    if (sizeResult.isOk()) {
      expect(sizeResult.value.total).toBe(2);
    }

    await backend.close();
  });

  // Validates REQ-TEST-008: frontier dedup with real Redis
  it('deduplicates entries across batches in real Redis', async () => {
    const backend = createRedisQueueBackend(client, 'test2');
    const frontier = createFrontierAdapter({ backend });

    const first = await frontier.enqueue([
      entry('https://example.com/unique1', 0),
      entry('https://example.com/shared', 0),
    ]);
    expect(first.isOk()).toBe(true);
    if (first.isOk()) {
      expect(first.value).toBe(2);
    }

    // 'shared' already in dedup set, only 'unique2' added
    const second = await frontier.enqueue([
      entry('https://example.com/shared', 1),
      entry('https://example.com/unique2', 1),
    ]);
    expect(second.isOk()).toBe(true);
    if (second.isOk()) {
      expect(second.value).toBe(1);
    }

    const sizeResult = await frontier.size();
    expect(sizeResult.isOk()).toBe(true);
    if (sizeResult.isOk()) {
      expect(sizeResult.value.total).toBe(3);
    }

    await backend.close();
  });

  // Validates REQ-TEST-008: within-batch dedup
  it('deduplicates within a single batch', async () => {
    const backend = createRedisQueueBackend(client, 'test3');
    const frontier = createFrontierAdapter({ backend });

    const result = await frontier.enqueue([
      entry('https://example.com/dup-test', 0),
      entry('https://example.com/dup-test', 1), // same URL, different depth
    ]);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBe(1);
    }

    await backend.close();
  });
});
