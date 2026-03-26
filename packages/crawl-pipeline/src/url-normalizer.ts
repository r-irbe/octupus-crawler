// URL normalizer — deterministic normalization per REQ-CRAWL-002, REQ-CRAWL-017
// Implements: T-CRAWL-001, T-CRAWL-021

import { domainToASCII } from 'node:url';
import { brandNormalizedUrl, type NormalizedUrl } from './normalized-url.js';

const CONTROL_CHAR_RE = /[\x00-\x1f\x7f]/;

/**
 * Normalize a parsed URL: strip fragment, trailing slash, sort query params,
 * handle IDN→Punycode, percent-encode non-ASCII path/query.
 */
export function normalizeUrl(parsed: URL): NormalizedUrl {
  // IDN → Punycode (IDNA 2008 via Node's ICU)
  const asciiHost = domainToASCII(parsed.hostname);
  const host = asciiHost === '' ? parsed.hostname : asciiHost;

  // Port: omit default ports
  const port = isDefaultPort(parsed.protocol, parsed.port) ? '' : `:${parsed.port}`;

  // Path: percent-encode non-ASCII, strip trailing slashes (but keep root)
  let path = encodeNonAsciiPath(parsed.pathname);
  while (path.length > 1 && path.endsWith('/')) {
    path = path.slice(0, -1);
  }
  // Remove bare "/" path → empty
  if (path === '/') {
    path = '';
  }

  // Query: sort params lexicographically by key, percent-encode non-ASCII values
  const sortedQuery = sortQueryParams(parsed.searchParams);

  // Fragment: always stripped (REQ-CRAWL-002)
  const normalized = `${parsed.protocol}//${host}${port}${path}${sortedQuery}`;
  return brandNormalizedUrl(normalized);
}

/** Check if the given port is the default for the protocol. */
function isDefaultPort(protocol: string, port: string): boolean {
  if (port === '') return true;
  if (protocol === 'https:' && port === '443') return true;
  if (protocol === 'http:' && port === '80') return true;
  return false;
}

/** Sort query params by key and rebuild query string. */
function sortQueryParams(params: URLSearchParams): string {
  const entries: Array<[string, string]> = [];
  params.forEach((value, key) => {
    entries.push([key, value]);
  });
  if (entries.length === 0) return '';

  entries.sort((a, b) => a[0].localeCompare(b[0]));
  const parts = entries.map(([k, v]) => {
    const ek = encodeURIComponent(k);
    const ev = encodeURIComponent(v);
    return `${ek}=${ev}`;
  });
  return `?${parts.join('&')}`;
}

/** Percent-encode non-ASCII characters in path segments per RFC 3986. */
function encodeNonAsciiPath(path: string): string {
  // Only encode non-ASCII; leave valid percent-encoded and ASCII as-is
  return path.replace(/[^\x20-\x7e]/g, (ch) => {
    const bytes = new TextEncoder().encode(ch);
    return Array.from(bytes)
      .map((b) => `%${b.toString(16).toUpperCase()}`)
      .join('');
  });
}

/** Check if a raw URL string contains control characters or null bytes. */
export function hasControlChars(raw: string): boolean {
  return CONTROL_CHAR_RE.test(raw);
}

const MAX_URL_LENGTH = 2048;

/** Check if a raw URL string is too long for safe processing. */
export function isTooLong(raw: string): boolean {
  return raw.length > MAX_URL_LENGTH;
}
