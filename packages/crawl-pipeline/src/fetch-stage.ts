// Fetch stage — delegates to Fetcher contract with timing + result mapping
// Implements: T-CRAWL-009, REQ-CRAWL-005, REQ-CRAWL-006

import { ok, err } from 'neverthrow';
import type { Fetcher, FetchConfig } from '@ipf/core/contracts/fetcher';
import type { CrawlUrl } from '@ipf/core/domain/crawl-url';
import type { CrawlError } from '@ipf/core/errors/crawl-error';
import type { AsyncResult } from '@ipf/core/types/result';
import { parseCrawlUrl } from './crawl-url-factory.js';
import type { CrawlFrontierEntry, CrawlFetchResult } from './crawl-types.js';

/**
 * Execute the fetch stage: delegate to Fetcher, measure timing, map result.
 * REQ-CRAWL-006: dependencies injected via parameters.
 */
export async function fetchEntry(
  entry: CrawlFrontierEntry,
  fetcher: Fetcher,
  fetchConfig: FetchConfig,
): AsyncResult<CrawlFetchResult, CrawlError> {
  const fetchStart = performance.now();
  const fetchResult = await fetcher.fetch(entry.url, fetchConfig);
  const fetchDurationMs = performance.now() - fetchStart;

  if (fetchResult.isErr()) return err(fetchResult.error);

  return ok(mapFetchResult(entry, fetchResult.value, fetchDurationMs));
}

/** Map core's FetchResult to pipeline's CrawlFetchResult (T-CRAWL-022). */
export function mapFetchResult(
  entry: CrawlFrontierEntry,
  coreFetch: { statusCode: number; body: string; headers: Record<string, string>; url: string },
  durationMs: number,
): CrawlFetchResult {
  let finalUrl: CrawlUrl | null = null;
  if (coreFetch.url !== entry.url.normalized && coreFetch.url !== entry.url.raw) {
    const parsed = parseCrawlUrl(coreFetch.url);
    if (parsed.isOk()) {
      finalUrl = parsed.value;
    }
  }

  const contentType = findHeaderCaseInsensitive(coreFetch.headers, 'content-type');

  return {
    requestedUrl: entry.url,
    finalUrl,
    statusCode: coreFetch.statusCode,
    contentType,
    body: coreFetch.body,
    fetchTimestamp: Date.now(),
    fetchDurationMs: durationMs,
  };
}

/** Case-insensitive header lookup. */
function findHeaderCaseInsensitive(
  headers: Record<string, string>,
  target: string,
): string | null {
  const lower = target.toLowerCase();
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === lower) {
      const val = headers[key];
      if (val !== undefined) return val;
    }
  }
  return null;
}
