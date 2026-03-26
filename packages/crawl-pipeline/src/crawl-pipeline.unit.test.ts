// Pipeline composition unit tests — full pipeline scenario test
// Validates: REQ-CRAWL-005 (pipeline composition), REQ-CRAWL-006 (DI)

import { describe, it, expect } from 'vitest';
import { ok, err } from 'neverthrow';
import { createCrawlUrl } from '@ipf/core/domain/crawl-url';
import type { Fetcher, FetchConfig, FetchResult } from '@ipf/core/contracts/fetcher';
import type { Frontier, FrontierEntry, FrontierSize } from '@ipf/core/contracts/frontier';
import type { Logger } from '@ipf/core/contracts/logger';
import type { QueueError } from '@ipf/core/errors/queue-error';
import type { CrawlUrl } from '@ipf/core/domain/crawl-url';
import type { FetchError } from '@ipf/core/errors/fetch-error';
import type { AsyncResult } from '@ipf/core/types/result';
import { executePipeline, type PipelineDeps } from './crawl-pipeline.js';
import type { CrawlFrontierEntry, PipelineConfig } from './crawl-types.js';
import type { ResultLinkExtractor } from './discover-stage.js';

function nopLogger(): Logger {
  const nop = (): void => { /* nop */ };
  return { debug: nop, info: nop, warn: nop, error: nop, fatal: nop, child: () => nopLogger() };
}

function makeEntry(overrides: Partial<CrawlFrontierEntry> = {}): CrawlFrontierEntry {
  return {
    url: createCrawlUrl({ raw: 'https://example.com', normalized: 'https://example.com', domain: 'example.com' }),
    depth: 0,
    discoveredBy: 'worker-1',
    discoveredAt: Date.now(),
    parentUrl: null,
    ...overrides,
  };
}

function makeFetcher(response: FetchResult): Fetcher {
  return {
    fetch: (_url: CrawlUrl, _config: FetchConfig): AsyncResult<FetchResult, FetchError> => Promise.resolve(ok(response)),
  };
}

function makeExtractor(links: string[]): ResultLinkExtractor {
  return { extract: () => ok(links) };
}

function makeFrontier(): Frontier {
  return {
    enqueue: (entries: FrontierEntry[]): AsyncResult<number, QueueError> =>
      Promise.resolve(ok(entries.length)),
    size: (): AsyncResult<FrontierSize, QueueError> =>
      Promise.resolve(ok({ pending: 0, active: 0, total: 0 })),
    close: (): Promise<void> => Promise.resolve(),
  };
}

const defaultFetchConfig: FetchConfig = { timeoutMs: 5000, maxRedirects: 5, maxBodyBytes: 1_000_000 };

describe('executePipeline', () => {
  // Validates REQ-CRAWL-005: full pipeline success
  it('runs validate → fetch → discover → enqueue successfully', async () => {
    const config: PipelineConfig = { maxDepth: 10, allowedDomains: null, workerId: 'w1' };
    const deps: PipelineDeps = {
      fetcher: makeFetcher({
        statusCode: 200,
        body: '<html><a href="/child">link</a></html>',
        headers: { 'content-type': 'text/html' },
        url: 'https://example.com',
      }),
      fetchConfig: defaultFetchConfig,
      frontier: makeFrontier(),
      extractor: makeExtractor(['https://example.com/child']),
      logger: nopLogger(),
    };

    const result = await executePipeline(makeEntry(), config, deps);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.fetchResult.statusCode).toBe(200);
      expect(result.value.discoveredUrls).toHaveLength(1);
      expect(result.value.enqueuedCount).toBe(1);
    }
  });

  // Validates REQ-CRAWL-005: validate stage short-circuits
  it('short-circuits on validate failure (depth exceeded)', async () => {
    const entry = makeEntry({ depth: 99 });
    const config: PipelineConfig = { maxDepth: 3, allowedDomains: null, workerId: 'w1' };
    const deps: PipelineDeps = {
      fetcher: makeFetcher({ statusCode: 200, body: '', headers: {}, url: '' }),
      fetchConfig: defaultFetchConfig,
      frontier: makeFrontier(),
      extractor: makeExtractor([]),
      logger: nopLogger(),
    };

    const result = await executePipeline(entry, config, deps);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.kind).toBe('depth_exceeded');
    }
  });

  // Validates REQ-CRAWL-005: fetch failure short-circuits
  it('short-circuits on fetch failure', async () => {
    const config: PipelineConfig = { maxDepth: 10, allowedDomains: null, workerId: 'w1' };
    const failFetcher: Fetcher = {
      fetch: (): AsyncResult<FetchResult, FetchError> =>
        Promise.resolve(err({ kind: 'timeout', url: 'https://example.com', timeoutMs: 5000, message: 'timeout' })),
    };
    const deps: PipelineDeps = {
      fetcher: failFetcher,
      fetchConfig: defaultFetchConfig,
      frontier: makeFrontier(),
      extractor: makeExtractor([]),
      logger: nopLogger(),
    };

    const result = await executePipeline(makeEntry(), config, deps);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.kind).toBe('timeout');
    }
  });

  // Validates REQ-CRAWL-009: non-HTML yields 0 discovered
  it('yields 0 discovered URLs for non-HTML content', async () => {
    const config: PipelineConfig = { maxDepth: 10, allowedDomains: null, workerId: 'w1' };
    const deps: PipelineDeps = {
      fetcher: makeFetcher({
        statusCode: 200,
        body: '{"data": true}',
        headers: { 'content-type': 'application/json' },
        url: 'https://example.com',
      }),
      fetchConfig: defaultFetchConfig,
      frontier: makeFrontier(),
      extractor: makeExtractor([]),
      logger: nopLogger(),
    };

    const result = await executePipeline(makeEntry(), config, deps);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.discoveredUrls).toHaveLength(0);
      expect(result.value.enqueuedCount).toBe(0);
    }
  });

  // Validates REQ-CRAWL-006: dependencies injected (test by DI)
  it('accepts all dependencies via PipelineDeps', async () => {
    // This test validates that the pipeline uses injected deps
    let fetchCalled = false;
    let enqueueCalled = false;

    const config: PipelineConfig = { maxDepth: 10, allowedDomains: null, workerId: 'w1' };
    const deps: PipelineDeps = {
      fetcher: {
        fetch: (): AsyncResult<FetchResult, FetchError> => {
          fetchCalled = true;
          return Promise.resolve(ok({ statusCode: 200, body: '<html></html>', headers: { 'content-type': 'text/html' }, url: 'https://example.com' }));
        },
      },
      fetchConfig: defaultFetchConfig,
      frontier: {
        enqueue: (entries: FrontierEntry[]): AsyncResult<number, QueueError> => {
          enqueueCalled = true;
          return Promise.resolve(ok(entries.length));
        },
        size: (): AsyncResult<FrontierSize, QueueError> => Promise.resolve(ok({ pending: 0, active: 0, total: 0 })),
        close: (): Promise<void> => Promise.resolve(),
      },
      extractor: makeExtractor(['https://example.com/a']),
      logger: nopLogger(),
    };

    await executePipeline(makeEntry(), config, deps);
    expect(fetchCalled).toBe(true);
    expect(enqueueCalled).toBe(true);
  });
});
