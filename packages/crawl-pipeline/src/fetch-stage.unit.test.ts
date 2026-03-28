// Fetch stage unit tests — validates delegation to Fetcher contract
// Validates: T-CRAWL-009 (REQ-CRAWL-005), REQ-CRAWL-006 (dependency injection)

import { describe, it, expect } from 'vitest';
import { ok, err } from 'neverthrow';
import type { Fetcher, FetchConfig, FetchResult } from '@ipf/core/contracts/fetcher';
import type { CrawlUrl } from '@ipf/core/domain/crawl-url';
import type { FetchError } from '@ipf/core/errors/fetch-error';
import type { AsyncResult } from '@ipf/core/types/result';
import { fetchEntry, mapFetchResult } from './fetch-stage.js';
import type { CrawlFrontierEntry } from './crawl-types.js';
import { createCrawlUrl } from '@ipf/core/domain/crawl-url';

function makeUrl(raw: string): CrawlUrl {
  return createCrawlUrl({ raw, normalized: raw, domain: 'example.com' });
}

function makeEntry(url: string, depth = 0): CrawlFrontierEntry {
  return {
    url: makeUrl(url),
    depth,
    discoveredBy: 'seed',
    discoveredAt: Date.now(),
    parentUrl: null,
  };
}

const defaultConfig: FetchConfig = {
  timeoutMs: 5_000,
  maxRedirects: 5,
  maxBodyBytes: 1_048_576,
};

function makeFetcher(response: FetchResult): Fetcher {
  return {
    fetch: (_url: CrawlUrl, _config: FetchConfig): AsyncResult<FetchResult, FetchError> =>
      Promise.resolve(ok(response)),
  };
}

describe('fetchEntry', () => {
  // Validates T-CRAWL-009: delegates to Fetcher contract
  it('delegates to fetcher and returns mapped CrawlFetchResult', async () => {
    const entry = makeEntry('https://example.com/page');
    const fetcher = makeFetcher({
      statusCode: 200,
      body: '<html></html>',
      headers: { 'Content-Type': 'text/html' },
      url: 'https://example.com/page',
    });

    const result = await fetchEntry(entry, fetcher, defaultConfig);

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.statusCode).toBe(200);
    expect(result.value.body).toBe('<html></html>');
    expect(result.value.contentType).toBe('text/html');
    expect(result.value.requestedUrl).toEqual(entry.url);
    expect(result.value.fetchDurationMs).toBeGreaterThanOrEqual(0);
  });

  // Validates REQ-CRAWL-005: fetch failure short-circuits
  it('propagates fetcher error as-is', async () => {
    const entry = makeEntry('https://example.com/timeout');
    const fetcher: Fetcher = {
      fetch: (): AsyncResult<FetchResult, FetchError> =>
        Promise.resolve(err({ kind: 'timeout', url: 'https://example.com/timeout', timeoutMs: 5000, message: 'timed out' })),
    };

    const result = await fetchEntry(entry, fetcher, defaultConfig);

    expect(result.isErr()).toBe(true);
    if (!result.isErr()) return;
    expect(result.error.kind).toBe('timeout');
  });

  // Validates REQ-CRAWL-006: dependencies are injected
  it('passes correct url and config to fetcher', async () => {
    const entry = makeEntry('https://test.com/check');
    let capturedUrl: CrawlUrl | undefined;
    let capturedConfig: FetchConfig | undefined;
    const fetcher: Fetcher = {
      fetch: (url: CrawlUrl, config: FetchConfig): AsyncResult<FetchResult, FetchError> => {
        capturedUrl = url;
        capturedConfig = config;
        return Promise.resolve(ok({
          statusCode: 200, body: '', headers: {}, url: url.raw,
        }));
      },
    };

    await fetchEntry(entry, fetcher, defaultConfig);

    expect(capturedUrl).toEqual(entry.url);
    expect(capturedConfig).toEqual(defaultConfig);
  });

  it('detects redirect when returned URL differs from requested', async () => {
    const entry = makeEntry('https://example.com/old');
    const fetcher = makeFetcher({
      statusCode: 200,
      body: 'redirected',
      headers: {},
      url: 'https://example.com/new',
    });

    const result = await fetchEntry(entry, fetcher, defaultConfig);

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.finalUrl).not.toBeNull();
    expect(result.value.finalUrl?.raw).toBe('https://example.com/new');
  });
});

describe('mapFetchResult', () => {
  it('maps core FetchResult to CrawlFetchResult with case-insensitive headers', () => {
    const entry = makeEntry('https://example.com/');
    const result = mapFetchResult(
      entry,
      { statusCode: 200, body: 'ok', headers: { 'CONTENT-TYPE': 'text/plain' }, url: 'https://example.com/' },
      42,
    );

    expect(result.statusCode).toBe(200);
    expect(result.contentType).toBe('text/plain');
    expect(result.fetchDurationMs).toBe(42);
    expect(result.finalUrl).toBeNull();
  });

  it('returns null contentType when header is missing', () => {
    const entry = makeEntry('https://example.com/');
    const result = mapFetchResult(
      entry,
      { statusCode: 204, body: '', headers: {}, url: 'https://example.com/' },
      10,
    );

    expect(result.contentType).toBeNull();
  });
});
