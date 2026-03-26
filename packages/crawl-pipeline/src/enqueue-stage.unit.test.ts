// Enqueue stage unit tests
// Validates: REQ-CRAWL-014 (child depth), REQ-CRAWL-015 (queue_error)

import { describe, it, expect } from 'vitest';
import { ok, err } from 'neverthrow';
import { createCrawlUrl } from '@ipf/core/domain/crawl-url';
import type { Frontier, FrontierEntry, FrontierSize } from '@ipf/core/contracts/frontier';
import type { QueueError } from '@ipf/core/errors/queue-error';
import type { AsyncResult } from '@ipf/core/types/result';
import { enqueueUrls } from './enqueue-stage.js';
import type { CrawlFrontierEntry } from './crawl-types.js';

function makeParent(depth: number): CrawlFrontierEntry {
  return {
    url: createCrawlUrl({ raw: 'https://parent.com', normalized: 'https://parent.com', domain: 'parent.com' }),
    depth,
    discoveredBy: 'worker-1',
    discoveredAt: Date.now(),
    parentUrl: null,
  };
}

function makeFrontier(response: { isOk: boolean; value?: number; error?: QueueError }): Frontier {
  return {
    enqueue: (_entries: FrontierEntry[]): AsyncResult<number, QueueError> => {
      if (response.isOk && response.value !== undefined) {
        return Promise.resolve(ok(response.value));
      }
      if (response.error !== undefined) {
        return Promise.resolve(err(response.error));
      }
      return Promise.resolve(err({ kind: 'queue_error', operation: 'enqueue', cause: 'unknown', message: 'unknown' }));
    },
    size: (): AsyncResult<FrontierSize, QueueError> => Promise.resolve(ok({ pending: 0, active: 0, total: 0 })),
    close: (): Promise<void> => Promise.resolve(),
  };
}

describe('enqueueUrls', () => {
  // Validates REQ-CRAWL-014: child depth = parent + 1
  it('sets child depth to parent.depth + 1', async () => {
    let capturedEntries: FrontierEntry[] = [];
    const frontier: Frontier = {
      enqueue: (entries: FrontierEntry[]): AsyncResult<number, QueueError> => {
        capturedEntries = entries;
        return Promise.resolve(ok(entries.length));
      },
      size: (): AsyncResult<FrontierSize, QueueError> => Promise.resolve(ok({ pending: 0, active: 0, total: 0 })),
      close: (): Promise<void> => Promise.resolve(),
    };

    const parent = makeParent(2);
    const urls = [
      createCrawlUrl({ raw: 'https://child.com', normalized: 'https://child.com', domain: 'child.com' }),
    ];

    const result = await enqueueUrls(urls, parent, frontier, 'w1');
    expect(result.isOk()).toBe(true);
    expect(capturedEntries).toHaveLength(1);
    expect(capturedEntries[0]?.depth).toBe(3);
  });

  it('returns 0 for empty URL list', async () => {
    const frontier = makeFrontier({ isOk: true, value: 0 });
    const parent = makeParent(0);
    const result = await enqueueUrls([], parent, frontier, 'w1');
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBe(0);
    }
  });

  it('returns enqueued count on success', async () => {
    const frontier = makeFrontier({ isOk: true, value: 3 });
    const parent = makeParent(1);
    const urls = [
      createCrawlUrl({ raw: 'https://a.com', normalized: 'https://a.com', domain: 'a.com' }),
      createCrawlUrl({ raw: 'https://b.com', normalized: 'https://b.com', domain: 'b.com' }),
      createCrawlUrl({ raw: 'https://c.com', normalized: 'https://c.com', domain: 'c.com' }),
    ];
    const result = await enqueueUrls(urls, parent, frontier, 'w1');
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBe(3);
    }
  });

  // Validates REQ-CRAWL-015: queue_error on failure
  it('returns queue_error when frontier fails', async () => {
    const queueErr: QueueError = {
      kind: 'queue_error',
      operation: 'enqueue',
      cause: new Error('redis down'),
      message: 'Queue error during enqueue: redis down',
    };
    const frontier = makeFrontier({ isOk: false, error: queueErr });
    const parent = makeParent(0);
    const urls = [
      createCrawlUrl({ raw: 'https://a.com', normalized: 'https://a.com', domain: 'a.com' }),
    ];
    const result = await enqueueUrls(urls, parent, frontier, 'w1');
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.kind).toBe('queue_error');
    }
  });
});
