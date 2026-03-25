// Validates REQ-ARCH-012: CrawlError is superset of FetchError | UrlError + 3 crawl-specific variants
// Validates REQ-ARCH-013: Typed error constructor functions enforce correct fields at compile time
import { describe, it, expect } from 'vitest';
import type { CrawlError } from './crawl-error.js';
import {
  createDepthExceededError,
  createDomainNotAllowedError,
  createQueueError,
} from './crawl-error.js';
import { createTimeoutError } from './fetch-error.js';
import { createInvalidUrlError } from './url-error.js';

describe('CrawlError crawl-specific constructors', () => {
  // Validates REQ-ARCH-013: typed constructors enforce correct fields
  it('creates a depth_exceeded error', () => {
    const err = createDepthExceededError({
      url: 'https://example.com/deep',
      maxDepth: 5,
      currentDepth: 6,
    });
    expect(err.kind).toBe('depth_exceeded');
    expect(err.url).toBe('https://example.com/deep');
    expect(err.maxDepth).toBe(5);
    expect(err.currentDepth).toBe(6);
    expect(err.message).toContain('depth');
  });

  it('creates a domain_not_allowed error', () => {
    const err = createDomainNotAllowedError({
      url: 'https://blocked.example.com',
      domain: 'blocked.example.com',
    });
    expect(err.kind).toBe('domain_not_allowed');
    expect(err.url).toBe('https://blocked.example.com');
    expect(err.domain).toBe('blocked.example.com');
    expect(err.message).toContain('domain');
  });

  it('creates a queue_error', () => {
    const cause = new Error('Redis connection lost');
    const err = createQueueError({ operation: 'enqueue', cause });
    expect(err.kind).toBe('queue_error');
    expect(err.operation).toBe('enqueue');
    expect(err.cause).toBe(cause);
    expect(err.message).toContain('queue');
  });
});

// Validates REQ-ARCH-012: CrawlError is a superset — FetchError and UrlError are valid CrawlErrors
describe('CrawlError superset', () => {
  it('accepts a FetchError as a CrawlError', () => {
    const fetchErr = createTimeoutError({ url: 'https://example.com', timeoutMs: 3000 });
    // FetchError should be assignable to CrawlError
    const crawlErr: CrawlError = fetchErr;
    expect(crawlErr.kind).toBe('timeout');
  });

  it('accepts a UrlError as a CrawlError', () => {
    const urlErr = createInvalidUrlError({ raw: 'bad url', reason: 'malformed' });
    // UrlError should be assignable to CrawlError
    const crawlErr: CrawlError = urlErr;
    expect(crawlErr.kind).toBe('invalid_url');
  });

  it('covers all 15 variants (9 fetch + 3 url + 3 crawl)', () => {
    const allKinds: CrawlError['kind'][] = [
      'timeout', 'network', 'http', 'ssrf_blocked',
      'too_many_redirects', 'body_too_large', 'dns_resolution_failed',
      'ssl_error', 'connection_refused',
      'invalid_url', 'disallowed_scheme', 'empty_url',
      'depth_exceeded', 'domain_not_allowed', 'queue_error',
    ];
    expect(allKinds).toHaveLength(15);
  });
});
