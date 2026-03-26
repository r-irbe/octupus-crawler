// CrawlUrl factory — parse + validate + normalize raw URL strings
// Implements: T-CRAWL-003, T-CRAWL-004, REQ-CRAWL-001, REQ-CRAWL-003, REQ-CRAWL-004

import { ok, err, type Result } from 'neverthrow';
import { createCrawlUrl, type CrawlUrl } from '@ipf/core/domain/crawl-url';
import {
  createEmptyUrlError,
  createDisallowedSchemeError,
  createInvalidUrlError,
  type UrlError,
} from '@ipf/core/errors/url-error';
import { normalizeUrl } from './url-normalizer.js';

const ALLOWED_SCHEMES = new Set(['http:', 'https:']);

/**
 * Parse a raw URL string into a validated, normalized CrawlUrl.
 * Returns Result.err for empty, invalid, or disallowed-scheme URLs.
 */
export function parseCrawlUrl(raw: string): Result<CrawlUrl, UrlError> {
  // REQ-CRAWL-004: empty URL
  const trimmed = raw.trim();
  if (trimmed === '') {
    return err(createEmptyUrlError());
  }

  // Parse
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return err(createInvalidUrlError({ raw: trimmed, reason: 'URL parsing failed' }));
  }

  // REQ-CRAWL-001: scheme check
  if (!ALLOWED_SCHEMES.has(parsed.protocol)) {
    return err(
      createDisallowedSchemeError({ raw: trimmed, scheme: parsed.protocol.replace(':', '') }),
    );
  }

  // Normalize
  const normalized = normalizeUrl(parsed);
  const domain = parsed.hostname.toLowerCase();

  return ok(createCrawlUrl({ raw: trimmed, normalized, domain }));
}
