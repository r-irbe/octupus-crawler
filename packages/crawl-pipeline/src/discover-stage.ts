// Discover stage — content-type gate, link extraction, relative resolution, dedup
// Implements: T-CRAWL-010, REQ-CRAWL-009, REQ-CRAWL-010, REQ-CRAWL-011, REQ-CRAWL-012

import { ok, err, type Result } from 'neverthrow';
import type { CrawlUrl } from '@ipf/core/domain/crawl-url';
import type { CrawlError } from '@ipf/core/errors/crawl-error';
import type { Logger } from '@ipf/core/contracts/logger';
import { parseCrawlUrl } from './crawl-url-factory.js';
import { createLinkExtractError, type CrawlFetchResult, type LinkExtractError } from './crawl-types.js';
import { hasControlChars, isTooLong } from './url-normalizer.js';

// REQ-CRAWL-012: Schemes to silently skip
const SKIP_SCHEMES = new Set(['javascript:', 'data:', 'mailto:', 'tel:']);

/** Contract for link extraction (enhanced: returns Result per REQ-CRAWL-019). */
export type ResultLinkExtractor = {
  extract(html: string, baseUrl: string): Result<string[], LinkExtractError>;
};

/**
 * Adapt a bare LinkExtractor (core contract) into a ResultLinkExtractor.
 * Wraps the synchronous call in a try/catch to capture parse errors.
 */
export function adaptLinkExtractor(
  extractor: { extract(html: string, baseUrl: string): string[] },
): ResultLinkExtractor {
  return {
    extract(html: string, baseUrl: string): Result<string[], LinkExtractError> {
      try {
        return ok(extractor.extract(html, baseUrl));
      } catch (cause: unknown) {
        return err(createLinkExtractError({ partialLinks: [], cause }));
      }
    },
  };
}

/**
 * Discover links from a fetch result.
 * REQ-CRAWL-009: only text/html triggers extraction.
 * REQ-CRAWL-010: resolve relative URLs against finalUrl.
 * REQ-CRAWL-011: dedup by normalized form.
 * REQ-CRAWL-012: silently skip malformed hrefs.
 */
export function discoverLinks(
  fetchResult: CrawlFetchResult,
  extractor: ResultLinkExtractor,
  logger: Logger,
): Result<CrawlUrl[], CrawlError> {
  // Content-type gate
  const ct = fetchResult.contentType ?? '';
  if (!ct.toLowerCase().startsWith('text/html')) {
    return ok([]);
  }

  // Base URL: final URL after redirects, or requested URL
  const baseUrl = fetchResult.finalUrl ?? fetchResult.requestedUrl;

  // Extract raw hrefs
  const extractResult = extractor.extract(fetchResult.body, baseUrl.normalized);
  if (extractResult.isErr()) {
    logger.warn('Link extraction failed, using partial results', {
      url: baseUrl.normalized,
      error: extractResult.error.message,
    });
    // Use partial results from the error
    return resolveAndDedup(extractResult.error.partialLinks, baseUrl, logger);
  }

  return resolveAndDedup(extractResult.value, baseUrl, logger);
}

/** Resolve relative URLs, filter malformed, normalize, deduplicate. */
function resolveAndDedup(
  rawHrefs: readonly string[],
  baseUrl: CrawlUrl,
  logger: Logger,
): Result<CrawlUrl[], CrawlError> {
  const seen = new Set<string>();
  const results: CrawlUrl[] = [];

  for (const href of rawHrefs) {
    // REQ-CRAWL-012: skip malformed hrefs
    if (shouldSkipHref(href)) continue;

    // Resolve relative URL against base
    let absoluteUrl: string;
    try {
      absoluteUrl = new URL(href, baseUrl.normalized).href;
    } catch {
      logger.debug('Skipping unresolvable href', { href });
      continue;
    }

    // Parse + normalize via factory (validates scheme, etc.)
    const parsed = parseCrawlUrl(absoluteUrl);
    if (parsed.isErr()) continue; // silently skip invalid/disallowed

    // REQ-CRAWL-011: dedup by normalized form
    if (seen.has(parsed.value.normalized)) continue;
    seen.add(parsed.value.normalized);
    results.push(parsed.value);
  }

  return ok(results);
}

/** REQ-CRAWL-012: check if an href should be silently skipped. */
function shouldSkipHref(href: string): boolean {
  const trimmed = href.trim();
  if (trimmed === '' || trimmed === '#') return true;
  if (hasControlChars(trimmed)) return true;
  if (isTooLong(trimmed)) return true;

  // Check skip schemes (case-insensitive)
  const lower = trimmed.toLowerCase();
  for (const scheme of SKIP_SCHEMES) {
    if (lower.startsWith(scheme)) return true;
  }

  return false;
}
