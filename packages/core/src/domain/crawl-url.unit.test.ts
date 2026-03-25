// Validates REQ-CRAWL-003 (cross-ref): CrawlUrl branded type with raw, normalized, domain
// Validates REQ-ARCH-012: Branded/opaque type prevents accidental string mixing
import { describe, it, expect } from 'vitest';
import { createCrawlUrl, type CrawlUrl } from '../domain/crawl-url.js';

describe('CrawlUrl branded type', () => {
  it('creates a CrawlUrl with raw, normalized, and domain fields', () => {
    const url: CrawlUrl = createCrawlUrl({
      raw: 'https://Example.COM/Path?b=2&a=1',
      normalized: 'https://example.com/path?a=1&b=2',
      domain: 'example.com',
    });
    expect(url.raw).toBe('https://Example.COM/Path?b=2&a=1');
    expect(url.normalized).toBe('https://example.com/path?a=1&b=2');
    expect(url.domain).toBe('example.com');
  });

  it('carries the brand to prevent plain string assignment', () => {
    const url = createCrawlUrl({
      raw: 'https://example.com',
      normalized: 'https://example.com/',
      domain: 'example.com',
    });
    // CrawlUrl should have a brand field that distinguishes it from plain objects
    expect(url).toHaveProperty('_brand');
  });

  it('is immutable (readonly fields)', () => {
    const url = createCrawlUrl({
      raw: 'https://example.com',
      normalized: 'https://example.com/',
      domain: 'example.com',
    });
    // Verify the object is frozen or readonly
    expect(Object.isFrozen(url)).toBe(true);
  });
});
