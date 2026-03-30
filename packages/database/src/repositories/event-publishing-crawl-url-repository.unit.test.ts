// Validates T-COMM-013 (REQ-COMM-012), T-DATA-023 (REQ-DATA-027)
// Event-publishing CrawlURLRepository decorator tests

import { describe, it, expect, vi } from 'vitest';
import { ok, err } from 'neverthrow';
import {
  createEventPublishingCrawlURLRepository,
  type StatusEventPublisher,
  type EventPublishingConfig,
} from './event-publishing-crawl-url-repository.js';
import type { CrawlURLRepository } from './crawl-url-repository.js';
import type { FetchResult } from '../types.js';

// --- Test helpers ---

function makeRepo(overrides: Partial<CrawlURLRepository> = {}): CrawlURLRepository {
  return {
    findById: vi.fn(() => Promise.resolve(ok(undefined))),
    findByHash: vi.fn(() => Promise.resolve(ok(undefined))),
    save: vi.fn(() => Promise.resolve(err({ _tag: 'QueryFailed' as const, query: 'save', operation: 'save', message: 'stub', cause: undefined }))),
    saveBatch: vi.fn(() => Promise.resolve(ok(0))),
    findPendingByDomain: vi.fn(() => Promise.resolve(ok([]))),
    updateStatus: vi.fn(() => Promise.resolve(ok(undefined))),
    ...overrides,
  };
}

function makePublisher(): StatusEventPublisher & { publishCalls: Array<{ streamKey: string; event: unknown }> } {
  const publishCalls: Array<{ streamKey: string; event: unknown }> = [];
  return {
    publishCalls,
    publish: vi.fn((streamKey: string, event: unknown) => {
      publishCalls.push({ streamKey, event });
      return Promise.resolve(ok('1-0'));
    }),
  };
}

const CONFIG: EventPublishingConfig = {
  streamKey: 'crawl-events',
  source: 'test-worker',
};

function makeLogger(): { warn: (msg: string, ctx: Record<string, unknown>) => void; calls: Array<{ msg: string; ctx: Record<string, unknown> }> } {
  const calls: Array<{ msg: string; ctx: Record<string, unknown> }> = [];
  return {
    calls,
    warn: (msg: string, ctx: Record<string, unknown>): void => { calls.push({ msg, ctx }); },
  };
}

describe('createEventPublishingCrawlURLRepository', () => {
  it('publishes CrawlCompleted event when status is fetched', async () => {
    // Validates REQ-COMM-012: CrawlCompleted event on successful fetch
    const repo = makeRepo();
    const pub = makePublisher();
    const logger = makeLogger();
    const decorated = createEventPublishingCrawlURLRepository(repo, pub, CONFIG, logger);

    const fetchResult: FetchResult = { statusCode: 200, contentType: 'text/html', s3Key: 'abc' };
    const result = await decorated.updateStatus(1n, 'fetched', fetchResult);

    expect(result.isOk()).toBe(true);
    expect(pub.publishCalls).toHaveLength(1);
    expect(pub.publishCalls[0]?.streamKey).toBe('crawl-events');
    expect(pub.publishCalls[0]?.event).toMatchObject({
      type: 'CrawlCompleted',
      version: 1,
      source: 'test-worker',
    });
  });

  it('publishes CrawlFailed event when status is failed', async () => {
    // Validates REQ-COMM-012: CrawlFailed event on fetch failure
    const repo = makeRepo();
    const pub = makePublisher();
    const logger = makeLogger();
    const decorated = createEventPublishingCrawlURLRepository(repo, pub, CONFIG, logger);

    const result = await decorated.updateStatus(2n, 'failed');

    expect(result.isOk()).toBe(true);
    expect(pub.publishCalls).toHaveLength(1);
    expect(pub.publishCalls[0]?.event).toMatchObject({
      type: 'CrawlFailed',
      version: 1,
    });
  });

  it('does not publish events for pending status', async () => {
    // Validates: only terminal states emit events
    const repo = makeRepo();
    const pub = makePublisher();
    const logger = makeLogger();
    const decorated = createEventPublishingCrawlURLRepository(repo, pub, CONFIG, logger);

    await decorated.updateStatus(3n, 'pending');

    expect(pub.publishCalls).toHaveLength(0);
  });

  it('does not publish events when DB write fails', async () => {
    // Validates: events only fire on successful DB writes
    const repo = makeRepo({
      updateStatus: vi.fn(() => Promise.resolve(
        err({ _tag: 'QueryFailed' as const, query: 'updateStatus', message: 'db down', cause: undefined }),
      )),
    });
    const pub = makePublisher();
    const logger = makeLogger();
    const decorated = createEventPublishingCrawlURLRepository(repo, pub, CONFIG, logger);

    const result = await decorated.updateStatus(4n, 'fetched', { statusCode: 200, contentType: 'text/html', s3Key: null });

    expect(result.isErr()).toBe(true);
    expect(pub.publishCalls).toHaveLength(0);
  });

  it('logs warning but does not fail when event publish fails', async () => {
    // Validates REQ-DATA-027: fire-and-forget event publishing
    const repo = makeRepo();
    const pub: StatusEventPublisher = {
      publish: vi.fn(() => Promise.resolve(
        err({ _tag: 'ConnectionError', message: 'Redis down' }),
      )),
    };
    const logger = makeLogger();
    const decorated = createEventPublishingCrawlURLRepository(repo, pub, CONFIG, logger);

    const result = await decorated.updateStatus(5n, 'fetched', { statusCode: 200, contentType: 'text/html', s3Key: null });

    expect(result.isOk()).toBe(true);
    expect(logger.calls).toHaveLength(1);
    expect(logger.calls[0]?.msg).toContain('Event publish failed');
  });

  it('delegates non-updateStatus methods directly to inner repo', async () => {
    // Validates: decorator is transparent for read operations
    const innerFindById = vi.fn(() => Promise.resolve(ok(undefined)));
    const repo = makeRepo({ findById: innerFindById });
    const pub = makePublisher();
    const logger = makeLogger();
    const decorated = createEventPublishingCrawlURLRepository(repo, pub, CONFIG, logger);

    await decorated.findById(99n);

    expect(innerFindById).toHaveBeenCalledWith(99n);
    expect(pub.publishCalls).toHaveLength(0);
  });
});
