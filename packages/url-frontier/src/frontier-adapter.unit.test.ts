// Frontier adapter unit tests — uses stub QueueBackend
// Validates: REQ-DIST-001 (dedup), REQ-DIST-002 (BFS), REQ-DIST-004 (batch),
//            REQ-DIST-009 (collision detection)

import { describe, it, expect } from 'vitest';
import { ok, err } from 'neverthrow';
import type { FrontierEntry } from '@ipf/core/contracts/frontier';
import { createQueueError } from '@ipf/core/errors/queue-error';
import type { QueueError } from '@ipf/core/errors/queue-error';
import { createFrontierAdapter } from './frontier-adapter.js';
import type { QueueBackend, JobSpec, BulkAddResult } from './queue-backend.js';
import type { CollisionMetrics } from './collision-detector.js';

// Stub QueueBackend that tracks calls
type AddBulkCall = readonly JobSpec[];

function createStubBackend(opts?: {
  addBulkResult?: BulkAddResult;
  addBulkError?: QueueError;
  queueSize?: { pending: number; active: number; total: number };
}): QueueBackend & { addBulkCalls: AddBulkCall[] } {
  const addBulkCalls: AddBulkCall[] = [];
  return {
    addBulkCalls,
    addBulk(jobs: readonly JobSpec[]) {
      addBulkCalls.push(jobs);
      if (opts?.addBulkError) {
        return Promise.resolve(err(opts.addBulkError));
      }
      const result = opts?.addBulkResult ?? { added: jobs.length, submitted: jobs.length };
      return Promise.resolve(ok(result));
    },
    getQueueSize() {
      const size = opts?.queueSize ?? { pending: 0, active: 0, total: 0 };
      return Promise.resolve(ok(size));
    },
    close() {
      return Promise.resolve();
    },
  };
}

function entry(url: string, depth: number): FrontierEntry {
  return { url, priority: 0, depth };
}

describe('createFrontierAdapter', () => {
  describe('enqueue', () => {
    // Validates REQ-DIST-004: empty batch returns 0
    it('returns 0 for empty entries', async () => {
      const backend = createStubBackend();
      const frontier = createFrontierAdapter({ backend });
      const result = await frontier.enqueue([]);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(0);
      }
      expect(backend.addBulkCalls).toHaveLength(0);
    });

    // Validates REQ-DIST-004: single entry batch
    it('enqueues a single entry', async () => {
      const backend = createStubBackend({ addBulkResult: { added: 1, submitted: 1 } });
      const frontier = createFrontierAdapter({ backend });
      const result = await frontier.enqueue([entry('https://example.com', 0)]);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(1);
      }
      expect(backend.addBulkCalls).toHaveLength(1);
      const jobs = backend.addBulkCalls[0];
      expect(jobs).toHaveLength(1);
    });

    // Validates REQ-DIST-002: depth maps to priority
    it('maps depth to BullMQ priority', async () => {
      const backend = createStubBackend({ addBulkResult: { added: 2, submitted: 2 } });
      const frontier = createFrontierAdapter({ backend });
      await frontier.enqueue([
        entry('https://example.com/a', 0),
        entry('https://example.com/b', 3),
      ]);
      const jobs = backend.addBulkCalls[0];
      if (jobs) {
        const jobA = jobs.find((j) => j.data.url === 'https://example.com/a');
        const jobB = jobs.find((j) => j.data.url === 'https://example.com/b');
        expect(jobA?.priority).toBe(0);
        expect(jobB?.priority).toBe(3);
      }
    });

    // Validates REQ-DIST-001: in-batch dedup via job ID
    it('deduplicates entries with the same URL within a batch', async () => {
      const backend = createStubBackend({ addBulkResult: { added: 1, submitted: 1 } });
      const frontier = createFrontierAdapter({ backend });
      await frontier.enqueue([
        entry('https://example.com/page', 1),
        entry('https://example.com/page', 2), // duplicate URL
      ]);
      const jobs = backend.addBulkCalls[0];
      expect(jobs).toHaveLength(1);
      // First occurrence wins
      if (jobs?.[0]) {
        expect(jobs[0].data.depth).toBe(1);
      }
    });

    // Validates REQ-DIST-001: job ID is deterministic hex string
    it('generates deterministic job IDs', async () => {
      const backend = createStubBackend({ addBulkResult: { added: 1, submitted: 1 } });
      const frontier = createFrontierAdapter({ backend });
      await frontier.enqueue([entry('https://example.com', 0)]);

      const backend2 = createStubBackend({ addBulkResult: { added: 1, submitted: 1 } });
      const frontier2 = createFrontierAdapter({ backend: backend2 });
      await frontier2.enqueue([entry('https://example.com', 0)]);

      const id1 = backend.addBulkCalls[0]?.[0]?.jobId;
      const id2 = backend2.addBulkCalls[0]?.[0]?.jobId;
      expect(id1).toBeDefined();
      expect(id1).toBe(id2);
    });

    // Validates REQ-DIST-003: retry config applied to job specs
    it('applies retry configuration to job specs', async () => {
      const backend = createStubBackend({ addBulkResult: { added: 1, submitted: 1 } });
      const frontier = createFrontierAdapter({ backend });
      await frontier.enqueue([entry('https://example.com', 0)]);
      const job = backend.addBulkCalls[0]?.[0];
      expect(job?.attempts).toBe(3);
      expect(job?.backoffType).toBe('exponential');
      expect(job?.backoffDelay).toBe(1000);
    });

    // Validates REQ-DIST-005: retention config applied to job specs
    it('applies retention configuration to job specs', async () => {
      const backend = createStubBackend({ addBulkResult: { added: 1, submitted: 1 } });
      const frontier = createFrontierAdapter({ backend });
      await frontier.enqueue([entry('https://example.com', 0)]);
      const job = backend.addBulkCalls[0]?.[0];
      expect(job?.removeOnComplete).toBe(10_000);
      expect(job?.removeOnFail).toBe(5_000);
    });

    // Validates: error propagation from backend
    it('propagates backend errors', async () => {
      const queueErr = createQueueError({ operation: 'addBulk', cause: new Error('connection lost') });
      const backend = createStubBackend({ addBulkError: queueErr });
      const frontier = createFrontierAdapter({ backend });
      const result = await frontier.enqueue([entry('https://example.com', 0)]);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.kind).toBe('queue_error');
      }
    });

    // Validates REQ-DIST-004: multiple entries in single batch
    it('submits multiple entries as a single addBulk call', async () => {
      const backend = createStubBackend({ addBulkResult: { added: 3, submitted: 3 } });
      const frontier = createFrontierAdapter({ backend });
      await frontier.enqueue([
        entry('https://example.com/a', 0),
        entry('https://example.com/b', 1),
        entry('https://example.com/c', 2),
      ]);
      // Exactly one addBulk call
      expect(backend.addBulkCalls).toHaveLength(1);
      expect(backend.addBulkCalls[0]).toHaveLength(3);
    });
  });

  describe('collision detection', () => {
    // Validates REQ-DIST-009: collision metrics reported
    it('reports collisions when backend discards unexpected jobs', async () => {
      const collisions: number[] = [];
      const metrics: CollisionMetrics = {
        incrementCollisions(count: number): void { collisions.push(count); },
      };
      // 2 unique URLs, 2 unique job IDs submitted, but only 1 added → 1 collision
      const backend = createStubBackend({ addBulkResult: { added: 1, submitted: 2 } });
      const frontier = createFrontierAdapter({ backend, metrics });
      await frontier.enqueue([
        entry('https://example.com/a', 0),
        entry('https://example.com/b', 1),
      ]);
      expect(collisions).toStrictEqual([1]);
    });

    // Validates REQ-DIST-009: no false positives from expected dedup
    it('does not report collisions for expected batch dedup', async () => {
      const collisions: number[] = [];
      const metrics: CollisionMetrics = {
        incrementCollisions(count: number): void { collisions.push(count); },
      };
      // 2 entries for same URL → 1 unique job ID → addBulk receives 1 → adds 1
      const backend = createStubBackend({ addBulkResult: { added: 1, submitted: 1 } });
      const frontier = createFrontierAdapter({ backend, metrics });
      await frontier.enqueue([
        entry('https://example.com/same', 0),
        entry('https://example.com/same', 1),
      ]);
      expect(collisions).toHaveLength(0);
    });
  });

  describe('size', () => {
    // Validates: size delegates to backend
    it('returns queue size from backend', async () => {
      const backend = createStubBackend({ queueSize: { pending: 5, active: 2, total: 7 } });
      const frontier = createFrontierAdapter({ backend });
      const result = await frontier.size();
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toStrictEqual({ pending: 5, active: 2, total: 7 });
      }
    });
  });

  describe('close', () => {
    // Validates: close delegates to backend
    it('delegates close to backend', async () => {
      let closed = false;
      const backend: QueueBackend = {
        addBulk(jobs: readonly JobSpec[]) {
          return Promise.resolve(ok({ added: jobs.length, submitted: jobs.length }));
        },
        getQueueSize() {
          return Promise.resolve(ok({ pending: 0, active: 0, total: 0 }));
        },
        close() {
          closed = true;
          return Promise.resolve();
        },
      };
      const frontier = createFrontierAdapter({ backend });
      await frontier.close();
      expect(closed).toBe(true);
    });
  });
});
