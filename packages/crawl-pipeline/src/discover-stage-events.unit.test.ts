// Validates T-COMM-014 (REQ-COMM-013, REQ-COMM-014)
// Event-publishing discover stage tests

import { describe, it, expect, vi } from 'vitest';
import { ok, err } from 'neverthrow';
import { createCrawlUrl } from '@ipf/core/domain/crawl-url';
import type { Logger } from '@ipf/core/contracts/logger';
import {
  discoverLinksWithEvents,
  type DiscoveryEventPublisher,
  type DiscoverWithEventsConfig,
  type DiscoveryEvent,
} from './discover-stage-events.js';
import type { ResultLinkExtractor } from './discover-stage.js';
import type { CrawlFetchResult } from './crawl-types.js';

function nopLogger(): Logger {
  const nop = (): void => { /* nop */ };
  return { debug: nop, info: nop, warn: nop, error: nop, fatal: nop, child: () => nopLogger() };
}

function makeFetchResult(overrides: Partial<CrawlFetchResult> = {}): CrawlFetchResult {
  return {
    requestedUrl: createCrawlUrl({ raw: 'https://example.com', normalized: 'https://example.com', domain: 'example.com' }),
    finalUrl: null,
    statusCode: 200,
    contentType: 'text/html',
    body: '<html></html>',
    fetchTimestamp: Date.now(),
    fetchDurationMs: 100,
    ...overrides,
  };
}

function makeExtractor(links: string[]): ResultLinkExtractor {
  return { extract: () => ok(links) };
}

const CONFIG: DiscoverWithEventsConfig = {
  streamKey: 'url-discovered',
  source: 'test-worker',
};

function makePublisher(): DiscoveryEventPublisher & { batches: Array<{ streamKey: string; events: readonly DiscoveryEvent[] }> } {
  const batches: Array<{ streamKey: string; events: readonly DiscoveryEvent[] }> = [];
  return {
    batches,
    publishBatch: vi.fn((streamKey: string, events: readonly DiscoveryEvent[]) => {
      batches.push({ streamKey, events });
      return Promise.resolve(ok(['1-0']));
    }),
  };
}

describe('discoverLinksWithEvents', () => {
  it('publishes URLDiscovered events for discovered links', async () => {
    // Validates REQ-COMM-013: URLDiscovered events emitted
    const fetchResult = makeFetchResult();
    const extractor = makeExtractor([
      'https://example.com/page1',
      'https://example.com/page2',
    ]);
    const pub = makePublisher();

    const result = discoverLinksWithEvents(fetchResult, extractor, nopLogger(), pub, CONFIG);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toHaveLength(2);
    }

    // Allow microtask queue to flush (fire-and-forget publish)
    await new Promise((resolve) => { setTimeout(resolve, 10); });

    expect(pub.batches).toHaveLength(1);
    expect(pub.batches[0]?.streamKey).toBe('url-discovered');
    expect(pub.batches[0]?.events).toHaveLength(2);
    expect(pub.batches[0]?.events[0]).toMatchObject({
      type: 'URLDiscovered',
      version: 1,
      source: 'test-worker',
    });
  });

  it('does not publish events for non-HTML', async () => {
    // Validates: no events for non-HTML content
    const fetchResult = makeFetchResult({ contentType: 'application/json' });
    const pub = makePublisher();

    const result = discoverLinksWithEvents(
      fetchResult,
      makeExtractor([]),
      nopLogger(),
      pub,
      CONFIG,
    );

    expect(result.isOk()).toBe(true);
    await new Promise((resolve) => { setTimeout(resolve, 10); });
    expect(pub.batches).toHaveLength(0);
  });

  it('does not publish events when no links discovered', async () => {
    // Validates: no events for empty discovery
    const fetchResult = makeFetchResult();
    const pub = makePublisher();

    const result = discoverLinksWithEvents(
      fetchResult,
      makeExtractor([]),
      nopLogger(),
      pub,
      CONFIG,
    );

    expect(result.isOk()).toBe(true);
    await new Promise((resolve) => { setTimeout(resolve, 10); });
    expect(pub.batches).toHaveLength(0);
  });

  it('returns links even when publish fails', () => {
    // Validates REQ-COMM-014: fire-and-forget, discovery unaffected
    const fetchResult = makeFetchResult();
    const extractor = makeExtractor(['https://example.com/a']);
    const pub: DiscoveryEventPublisher = {
      publishBatch: vi.fn(() => Promise.resolve(
        err({ _tag: 'ConnectionError', message: 'Redis offline' }),
      )),
    };
    const logger = nopLogger();

    const result = discoverLinksWithEvents(fetchResult, extractor, logger, pub, CONFIG);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toHaveLength(1);
    }
  });
});
