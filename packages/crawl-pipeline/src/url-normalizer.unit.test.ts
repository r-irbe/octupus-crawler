// URL normalizer unit tests
// Validates: REQ-CRAWL-002 (normalization rules), REQ-CRAWL-017 (IDN)

import { describe, it, expect } from 'vitest';
import { normalizeUrl, hasControlChars, isTooLong } from './url-normalizer.js';

describe('normalizeUrl', () => {
  // Validates REQ-CRAWL-002: strip fragment
  it('strips hash fragments', () => {
    const url = new URL('https://example.com/path#section');
    expect(normalizeUrl(url)).toBe('https://example.com/path');
  });

  // Validates REQ-CRAWL-002: preserve www
  it('preserves www prefix', () => {
    const url = new URL('https://www.example.com');
    expect(normalizeUrl(url)).toBe('https://www.example.com');
  });

  // Validates REQ-CRAWL-002: strip trailing slash
  it('strips trailing slash from path', () => {
    const url = new URL('https://example.com/path/');
    expect(normalizeUrl(url)).toBe('https://example.com/path');
  });

  // Validates REQ-CRAWL-002: remove bare / path
  it('removes bare root path', () => {
    const url = new URL('https://example.com/');
    expect(normalizeUrl(url)).toBe('https://example.com');
  });

  // Validates REQ-CRAWL-002: sort query params
  it('sorts query parameters by key', () => {
    const url = new URL('https://example.com/path?b=2&a=1');
    expect(normalizeUrl(url)).toBe('https://example.com/path?a=1&b=2');
  });

  // Validates REQ-CRAWL-002: combined normalization
  it('applies all rules together', () => {
    const url = new URL('https://example.com/path?b=2&a=1#section');
    expect(normalizeUrl(url)).toBe('https://example.com/path?a=1&b=2');
  });

  // Validates REQ-CRAWL-002: keep index files
  it('keeps index files in path', () => {
    const url = new URL('https://example.com/index.html');
    expect(normalizeUrl(url)).toBe('https://example.com/index.html');
  });

  // Validates REQ-CRAWL-002: deterministic output
  it('produces deterministic output for same input', () => {
    const url1 = new URL('https://example.com/path?b=2&a=1');
    const url2 = new URL('https://example.com/path?b=2&a=1');
    expect(normalizeUrl(url1)).toBe(normalizeUrl(url2));
  });

  // Validates REQ-CRAWL-017: IDN → Punycode
  it('converts IDN hostname to Punycode', () => {
    const url = new URL('https://münchen.de/page');
    const result = normalizeUrl(url);
    expect(result).toContain('xn--');
    expect(result).not.toContain('münchen');
  });

  // Validates REQ-CRAWL-017: non-ASCII path percent-encoding
  it('percent-encodes non-ASCII in path', () => {
    const url = new URL('https://example.com/café');
    const result = normalizeUrl(url);
    // café should have é percent-encoded
    expect(result).not.toContain('é');
    expect(result).toContain('%');
  });

  it('removes default port 443 for https', () => {
    const url = new URL('https://example.com:443/path');
    expect(normalizeUrl(url)).toBe('https://example.com/path');
  });

  it('removes default port 80 for http', () => {
    const url = new URL('http://example.com:80/path');
    expect(normalizeUrl(url)).toBe('http://example.com/path');
  });

  it('preserves non-default ports', () => {
    const url = new URL('https://example.com:8080/path');
    expect(normalizeUrl(url)).toBe('https://example.com:8080/path');
  });

  it('handles URL with no path', () => {
    const url = new URL('https://example.com');
    expect(normalizeUrl(url)).toBe('https://example.com');
  });

  it('handles URL with empty query', () => {
    const url = new URL('https://example.com/path');
    expect(normalizeUrl(url)).toBe('https://example.com/path');
  });
});

describe('hasControlChars', () => {
  // Validates REQ-CRAWL-012: control character detection
  it('returns true for null bytes', () => {
    expect(hasControlChars('https://example.com/\x00')).toBe(true);
  });

  it('returns true for tab characters', () => {
    expect(hasControlChars('https://example.com/\t')).toBe(true);
  });

  it('returns false for clean URLs', () => {
    expect(hasControlChars('https://example.com/path')).toBe(false);
  });
});

describe('isTooLong', () => {
  // Validates REQ-CRAWL-012: length limit
  it('returns false for normal URLs', () => {
    expect(isTooLong('https://example.com')).toBe(false);
  });

  it('returns true for URLs exceeding 2048 chars', () => {
    const longUrl = 'https://example.com/' + 'a'.repeat(2040);
    expect(isTooLong(longUrl)).toBe(true);
  });
});
