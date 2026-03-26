// Discover stage unit tests
// Validates: REQ-CRAWL-009, REQ-CRAWL-010, REQ-CRAWL-011, REQ-CRAWL-012, REQ-CRAWL-019

import { describe, it, expect } from 'vitest';
import { ok, err } from 'neverthrow';
import { createCrawlUrl } from '@ipf/core/domain/crawl-url';
import { discoverLinks, adaptLinkExtractor, type ResultLinkExtractor } from './discover-stage.js';
import type { CrawlFetchResult } from './crawl-types.js';
import type { Logger } from '@ipf/core/contracts/logger';

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

describe('discoverLinks', () => {
  // Validates REQ-CRAWL-009: non-HTML yields empty
  it('returns empty array for non-HTML content type', () => {
    const fetch = makeFetchResult({ contentType: 'application/json' });
    const result = discoverLinks(fetch, makeExtractor([]), nopLogger());
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toHaveLength(0);
    }
  });

  it('returns empty array for null content type', () => {
    const fetch = makeFetchResult({ contentType: null });
    const result = discoverLinks(fetch, makeExtractor([]), nopLogger());
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toHaveLength(0);
    }
  });

  // Validates REQ-CRAWL-009: text/html triggers extraction
  it('extracts links from text/html', () => {
    const fetch = makeFetchResult();
    const extractor = makeExtractor(['https://example.com/page1', 'https://example.com/page2']);
    const result = discoverLinks(fetch, extractor, nopLogger());
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toHaveLength(2);
    }
  });

  it('handles text/html; charset=utf-8', () => {
    const fetch = makeFetchResult({ contentType: 'text/html; charset=utf-8' });
    const extractor = makeExtractor(['https://example.com/a']);
    const result = discoverLinks(fetch, extractor, nopLogger());
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toHaveLength(1);
    }
  });

  // Validates REQ-CRAWL-010: resolve relative URLs against final URL
  it('resolves relative URLs against final URL', () => {
    const fetch = makeFetchResult({
      finalUrl: createCrawlUrl({
        raw: 'https://final.example.com/dir/',
        normalized: 'https://final.example.com/dir',
        domain: 'final.example.com',
      }),
    });
    const extractor = makeExtractor(['/child']);
    const result = discoverLinks(fetch, extractor, nopLogger());
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toHaveLength(1);
      const url = result.value[0];
      expect(url?.domain).toBe('final.example.com');
    }
  });

  // Validates REQ-CRAWL-011: dedup by normalized form
  it('deduplicates by normalized URL', () => {
    const fetch = makeFetchResult();
    const extractor = makeExtractor([
      'https://example.com/page',
      'https://example.com/page#fragment',
      'https://example.com/page/',
    ]);
    const result = discoverLinks(fetch, extractor, nopLogger());
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toHaveLength(1);
    }
  });

  // Validates REQ-CRAWL-012: skip javascript: URIs
  it('silently skips javascript: hrefs', () => {
    const fetch = makeFetchResult();
    const extractor = makeExtractor(['javascript:void(0)', 'https://example.com/ok']);
    const result = discoverLinks(fetch, extractor, nopLogger());
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toHaveLength(1);
    }
  });

  // Validates REQ-CRAWL-012: skip data: URIs
  it('silently skips data: and mailto: hrefs', () => {
    const fetch = makeFetchResult();
    const extractor = makeExtractor([
      'data:text/html,<h1>hi</h1>',
      'mailto:user@example.com',
      'tel:+1234567890',
    ]);
    const result = discoverLinks(fetch, extractor, nopLogger());
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toHaveLength(0);
    }
  });

  // Validates REQ-CRAWL-012: skip empty/hash-only
  it('silently skips empty and hash-only hrefs', () => {
    const fetch = makeFetchResult();
    const extractor = makeExtractor(['', '  ', '#']);
    const result = discoverLinks(fetch, extractor, nopLogger());
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toHaveLength(0);
    }
  });

  // Validates REQ-CRAWL-012: skip too-long URLs
  it('silently skips hrefs exceeding 2048 chars', () => {
    const fetch = makeFetchResult();
    const longHref = 'https://example.com/' + 'a'.repeat(2040);
    const extractor = makeExtractor([longHref]);
    const result = discoverLinks(fetch, extractor, nopLogger());
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toHaveLength(0);
    }
  });

  // Validates REQ-CRAWL-019: extractor returns Result with partial results
  it('uses partial results when extractor fails', () => {
    const fetch = makeFetchResult();
    const failExtractor: ResultLinkExtractor = {
      extract: () => err({
        kind: 'link_extract_error' as const,
        partialLinks: ['https://example.com/partial'],
        cause: new Error('parse error'),
        message: 'Link extraction failed: parse error',
      }),
    };
    const result = discoverLinks(fetch, failExtractor, nopLogger());
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toHaveLength(1);
    }
  });
});

describe('adaptLinkExtractor', () => {
  // Validates REQ-CRAWL-019: adapter wraps bare extractor
  it('wraps successful extraction in Result.ok', () => {
    const bare = { extract: (): string[] => ['https://example.com/a'] };
    const adapted = adaptLinkExtractor(bare);
    const result = adapted.extract('<html></html>', 'https://example.com');
    expect(result.isOk()).toBe(true);
  });

  it('wraps thrown error in Result.err with link_extract_error', () => {
    const bare = {
      extract: (): string[] => { throw new Error('parse bomb'); },
    };
    const adapted = adaptLinkExtractor(bare);
    const result = adapted.extract('<html></html>', 'https://example.com');
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.kind).toBe('link_extract_error');
    }
  });
});
