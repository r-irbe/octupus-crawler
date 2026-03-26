// Pipeline data types — FrontierEntry, CrawlFetchResult, CrawlResult, LinkExtractError
// Implements: T-CRAWL-005, T-CRAWL-006, T-CRAWL-007, T-CRAWL-022, T-CRAWL-023

import type { CrawlUrl } from '@ipf/core/domain/crawl-url';
import type { NormalizedUrl } from './normalized-url.js';

// --- Frontier Entry (richer than core's minimal FrontierEntry) ---

export type CrawlFrontierEntry = {
  readonly url: CrawlUrl;
  readonly depth: number;
  readonly discoveredBy: string;
  readonly discoveredAt: number;
  readonly parentUrl: NormalizedUrl | null;
};

// --- Fetch Result (richer than core's FetchResult) ---
// REQ-CRAWL-016, REQ-CRAWL-018: finalUrl is a full CrawlUrl (not just string)

export type CrawlFetchResult = {
  readonly requestedUrl: CrawlUrl;
  readonly finalUrl: CrawlUrl | null;
  readonly statusCode: number;
  readonly contentType: string | null;
  readonly body: string;
  readonly fetchTimestamp: number;
  readonly fetchDurationMs: number;
};

// --- Crawl Result (output of full pipeline) ---

export type CrawlResult = {
  readonly fetchResult: CrawlFetchResult;
  readonly discoveredUrls: readonly CrawlUrl[];
  readonly enqueuedCount: number;
};

// --- Link Extract Error ---
// REQ-CRAWL-019: partial results on parse error

export type LinkExtractError = {
  readonly kind: 'link_extract_error';
  readonly partialLinks: readonly string[];
  readonly cause: unknown;
  readonly message: string;
};

export function createLinkExtractError(p: {
  partialLinks: readonly string[];
  cause: unknown;
}): LinkExtractError {
  const causeMsg = p.cause instanceof Error ? p.cause.message : String(p.cause);
  return {
    kind: 'link_extract_error',
    partialLinks: p.partialLinks,
    cause: p.cause,
    message: `Link extraction failed: ${causeMsg}`,
  };
}

// --- Validate Config ---

export type ValidateConfig = {
  readonly maxDepth: number;
  readonly allowedDomains: readonly string[] | null;
};

// --- Pipeline Config ---

export type PipelineConfig = {
  readonly maxDepth: number;
  readonly allowedDomains: readonly string[] | null;
  readonly workerId: string;
};
