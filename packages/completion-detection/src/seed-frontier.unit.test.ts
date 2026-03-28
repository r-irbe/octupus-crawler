// Unit tests for idempotent seed frontier
// Validates: T-COORD-011, REQ-DIST-020

import { describe, it, expect } from 'vitest';
import { ok, err } from 'neverthrow';
import { seedFrontier } from './seed-frontier.js';
import type { Frontier, FrontierEntry } from '@ipf/core/contracts/frontier';
import type { Logger } from '@ipf/core/contracts/logger';
import { createQueueError } from '@ipf/core/errors/queue-error';

function stubFrontier(enqueueResult: number = 0): Frontier & { enqueueCalls: FrontierEntry[][] } {
  const enqueueCalls: FrontierEntry[][] = [];
  return {
    enqueueCalls,
    enqueue: (entries: FrontierEntry[]) => {
      enqueueCalls.push(entries);
      return Promise.resolve(ok(enqueueResult));
    },
    size: () => Promise.resolve(ok({ pending: 0, active: 0, total: 0 })),
    close: () => Promise.resolve(),
  };
}

const noop = (): void => { /* no-op */ };

function stubLogger(): Logger {
  return {
    info: noop,
    warn: noop,
    error: noop,
    debug: noop,
    fatal: noop,
    child: (): Logger => stubLogger(),
  };
}

describe('seedFrontier', () => {
  // Validates REQ-DIST-020: empty seed list returns zero
  it('returns zero counts for empty URL list', async () => {
    const frontier = stubFrontier();
    const result = await seedFrontier(frontier, [], stubLogger());

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.enqueued).toBe(0);
      expect(result.value.skippedDuplicates).toBe(0);
    }
    expect(frontier.enqueueCalls).toHaveLength(0);
  });

  // Validates REQ-DIST-020: seeds all provided URLs
  it('enqueues all URLs when none are duplicates', async () => {
    const frontier = stubFrontier(3);
    const urls = ['https://a.com', 'https://b.com', 'https://c.com'];
    const result = await seedFrontier(frontier, urls, stubLogger());

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.enqueued).toBe(3);
      expect(result.value.skippedDuplicates).toBe(0);
    }
  });

  // Validates REQ-DIST-020: dedup handled by frontier
  it('reports skipped duplicates from frontier dedup', async () => {
    const frontier = stubFrontier(1); // Only 1 of 3 accepted
    const urls = ['https://a.com', 'https://b.com', 'https://c.com'];
    const result = await seedFrontier(frontier, urls, stubLogger());

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.enqueued).toBe(1);
      expect(result.value.skippedDuplicates).toBe(2);
    }
  });

  // Validates REQ-DIST-020: entries use priority 0 and depth 0
  it('creates entries with priority 0 and depth 0', async () => {
    const frontier = stubFrontier(2);
    const urls = ['https://a.com', 'https://b.com'];
    await seedFrontier(frontier, urls, stubLogger());

    const entries = frontier.enqueueCalls[0];
    expect(entries).toHaveLength(2);
    expect(entries?.[0]).toEqual({ url: 'https://a.com', priority: 0, depth: 0 });
    expect(entries?.[1]).toEqual({ url: 'https://b.com', priority: 0, depth: 0 });
  });

  // Validates REQ-DIST-020: error propagation from frontier
  it('propagates frontier errors as Result.err', async () => {
    const queueErr = createQueueError({ operation: 'enqueue', cause: new Error('redis down') });
    const frontier: Frontier = {
      enqueue: () => Promise.resolve(err(queueErr)),
      size: () => Promise.resolve(ok({ pending: 0, active: 0, total: 0 })),
      close: () => Promise.resolve(),
    };
    const result = await seedFrontier(frontier, ['https://a.com'], stubLogger());

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.operation).toBe('enqueue');
    }
  });
});
