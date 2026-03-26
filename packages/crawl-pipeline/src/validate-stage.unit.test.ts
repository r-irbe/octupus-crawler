// Validate stage unit tests
// Validates: REQ-CRAWL-007 (depth guard), REQ-CRAWL-008 (domain allow-list)

import { describe, it, expect } from 'vitest';
import { createCrawlUrl } from '@ipf/core/domain/crawl-url';
import { validateEntry } from './validate-stage.js';
import type { CrawlFrontierEntry, ValidateConfig } from './crawl-types.js';

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

describe('validateEntry', () => {
  // Validates REQ-CRAWL-007: depth guard
  it('passes when depth is within limit', () => {
    const entry = makeEntry({ depth: 2 });
    const config: ValidateConfig = { maxDepth: 3, allowedDomains: null };
    const result = validateEntry(entry, config);
    expect(result.isOk()).toBe(true);
  });

  it('passes when depth equals maxDepth', () => {
    const entry = makeEntry({ depth: 3 });
    const config: ValidateConfig = { maxDepth: 3, allowedDomains: null };
    const result = validateEntry(entry, config);
    expect(result.isOk()).toBe(true);
  });

  // Validates REQ-CRAWL-007: depth_exceeded
  it('rejects when depth exceeds maxDepth', () => {
    const entry = makeEntry({ depth: 5 });
    const config: ValidateConfig = { maxDepth: 3, allowedDomains: null };
    const result = validateEntry(entry, config);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.kind).toBe('depth_exceeded');
    }
  });

  // Validates REQ-CRAWL-008: domain allow-list passes
  it('passes when domain is in allow-list', () => {
    const entry = makeEntry();
    const config: ValidateConfig = { maxDepth: 10, allowedDomains: ['example.com'] };
    const result = validateEntry(entry, config);
    expect(result.isOk()).toBe(true);
  });

  // Validates REQ-CRAWL-008: domain_not_allowed
  it('rejects when domain is not in allow-list', () => {
    const entry = makeEntry({
      url: createCrawlUrl({ raw: 'https://evil.com', normalized: 'https://evil.com', domain: 'evil.com' }),
    });
    const config: ValidateConfig = { maxDepth: 10, allowedDomains: ['example.com'] };
    const result = validateEntry(entry, config);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.kind).toBe('domain_not_allowed');
    }
  });

  // Validates REQ-CRAWL-008: null allow-list accepts all
  it('passes any domain when allow-list is null', () => {
    const entry = makeEntry({
      url: createCrawlUrl({ raw: 'https://anything.org', normalized: 'https://anything.org', domain: 'anything.org' }),
    });
    const config: ValidateConfig = { maxDepth: 10, allowedDomains: null };
    const result = validateEntry(entry, config);
    expect(result.isOk()).toBe(true);
  });

  it('domain comparison is case-insensitive', () => {
    const entry = makeEntry({
      url: createCrawlUrl({ raw: 'https://Example.COM', normalized: 'https://example.com', domain: 'example.com' }),
    });
    const config: ValidateConfig = { maxDepth: 10, allowedDomains: ['EXAMPLE.COM'] };
    const result = validateEntry(entry, config);
    expect(result.isOk()).toBe(true);
  });

  it('checks depth before domain', () => {
    const entry = makeEntry({
      url: createCrawlUrl({ raw: 'https://evil.com', normalized: 'https://evil.com', domain: 'evil.com' }),
      depth: 99,
    });
    const config: ValidateConfig = { maxDepth: 3, allowedDomains: ['example.com'] };
    const result = validateEntry(entry, config);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      // Depth is checked first
      expect(result.error.kind).toBe('depth_exceeded');
    }
  });
});
