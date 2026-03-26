// CrawlUrl factory unit tests
// Validates: REQ-CRAWL-001 (scheme check), REQ-CRAWL-003 (CrawlUrl), REQ-CRAWL-004 (errors)

import { describe, it, expect } from 'vitest';
import { parseCrawlUrl } from './crawl-url-factory.js';

describe('parseCrawlUrl', () => {
  // Validates REQ-CRAWL-001: http scheme allowed
  it('accepts http URLs', () => {
    const result = parseCrawlUrl('http://example.com');
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.domain).toBe('example.com');
    }
  });

  // Validates REQ-CRAWL-001: https scheme allowed
  it('accepts https URLs', () => {
    const result = parseCrawlUrl('https://example.com/path');
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.raw).toBe('https://example.com/path');
    }
  });

  // Validates REQ-CRAWL-001: disallowed scheme
  it('rejects ftp URLs with disallowed_scheme', () => {
    const result = parseCrawlUrl('ftp://example.com');
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.kind).toBe('disallowed_scheme');
    }
  });

  // Validates REQ-CRAWL-001: disallowed scheme
  it('rejects file URLs', () => {
    const result = parseCrawlUrl('file:///etc/passwd');
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.kind).toBe('disallowed_scheme');
    }
  });

  // Validates REQ-CRAWL-004: empty URL
  it('rejects empty string with empty_url', () => {
    const result = parseCrawlUrl('');
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.kind).toBe('empty_url');
    }
  });

  // Validates REQ-CRAWL-004: whitespace-only
  it('rejects whitespace-only string with empty_url', () => {
    const result = parseCrawlUrl('   ');
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.kind).toBe('empty_url');
    }
  });

  // Validates REQ-CRAWL-004: invalid URL
  it('rejects invalid syntax with invalid_url', () => {
    const result = parseCrawlUrl('not-a-url');
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.kind).toBe('invalid_url');
    }
  });

  // Validates REQ-CRAWL-003: CrawlUrl structure
  it('produces CrawlUrl with raw, normalized, and domain', () => {
    const result = parseCrawlUrl('https://example.com/path?b=2&a=1#frag');
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.raw).toBe('https://example.com/path?b=2&a=1#frag');
      expect(result.value.normalized).toBe('https://example.com/path?a=1&b=2');
      expect(result.value.domain).toBe('example.com');
    }
  });

  // Validates REQ-CRAWL-003: domain is lowercased
  it('lowercases domain', () => {
    const result = parseCrawlUrl('https://EXAMPLE.COM/');
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.domain).toBe('example.com');
    }
  });

  it('trims whitespace before parsing', () => {
    const result = parseCrawlUrl('  https://example.com  ');
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.raw).toBe('https://example.com');
    }
  });
});
