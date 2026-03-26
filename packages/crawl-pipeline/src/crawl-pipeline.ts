// Pipeline composition — validate → fetch → discover → enqueue
// Implements: T-CRAWL-012, REQ-CRAWL-005, REQ-CRAWL-006

import { ok, err } from 'neverthrow';
import type { CrawlUrl } from '@ipf/core/domain/crawl-url';
import type { Fetcher, FetchConfig } from '@ipf/core/contracts/fetcher';
import type { Frontier } from '@ipf/core/contracts/frontier';
import type { Logger } from '@ipf/core/contracts/logger';
import type { CrawlError } from '@ipf/core/errors/crawl-error';
import type { AsyncResult } from '@ipf/core/types/result';
import { parseCrawlUrl } from './crawl-url-factory.js';
import type {
  CrawlFrontierEntry,
  CrawlFetchResult,
  CrawlResult,
  PipelineConfig,
} from './crawl-types.js';
import { validateEntry } from './validate-stage.js';
import { discoverLinks, type ResultLinkExtractor } from './discover-stage.js';
import { enqueueUrls } from './enqueue-stage.js';

/** Dependencies injected into the pipeline (REQ-CRAWL-006). */
export type PipelineDeps = {
  readonly fetcher: Fetcher;
  readonly fetchConfig: FetchConfig;
  readonly frontier: Frontier;
  readonly extractor: ResultLinkExtractor;
  readonly logger: Logger;
};

/**
 * Execute the full crawl pipeline: validate → fetch → discover → enqueue.
 * Each stage failure short-circuits the remainder (REQ-CRAWL-005).
 */
export async function executePipeline(
  entry: CrawlFrontierEntry,
  config: PipelineConfig,
  deps: PipelineDeps,
): AsyncResult<CrawlResult, CrawlError> {
  // Stage 1: Validate
  const validated = validateEntry(entry, {
    maxDepth: config.maxDepth,
    allowedDomains: config.allowedDomains,
  });
  if (validated.isErr()) return err(validated.error);

  // Stage 2: Fetch
  const fetchResult = await deps.fetcher.fetch(entry.url, deps.fetchConfig);
  if (fetchResult.isErr()) return err(fetchResult.error);

  // Map core FetchResult → pipeline CrawlFetchResult
  const coreFetch = fetchResult.value;
  const crawlFetch = mapFetchResult(entry, coreFetch);

  // Stage 3: Discover
  const discovered = discoverLinks(crawlFetch, deps.extractor, deps.logger);
  if (discovered.isErr()) return err(discovered.error);

  // Stage 4: Enqueue
  const enqueued = await enqueueUrls(
    discovered.value,
    entry,
    deps.frontier,
    config.workerId,
  );
  if (enqueued.isErr()) return err(enqueued.error);

  return ok({
    fetchResult: crawlFetch,
    discoveredUrls: discovered.value,
    enqueuedCount: enqueued.value,
  });
}

/** Map core's FetchResult to pipeline's CrawlFetchResult (T-CRAWL-022). */
function mapFetchResult(
  entry: CrawlFrontierEntry,
  coreFetch: { statusCode: number; body: string; headers: Record<string, string>; url: string },
): CrawlFetchResult {
  // Determine finalUrl: if the returned URL differs from the requested, it was a redirect
  let finalUrl: CrawlUrl | null = null;
  if (coreFetch.url !== entry.url.normalized && coreFetch.url !== entry.url.raw) {
    const parsed = parseCrawlUrl(coreFetch.url);
    if (parsed.isOk()) {
      finalUrl = parsed.value;
    }
  }

  return {
    requestedUrl: entry.url,
    finalUrl,
    statusCode: coreFetch.statusCode,
    contentType: coreFetch.headers['content-type'] ?? null,
    body: coreFetch.body,
    fetchTimestamp: Date.now(),
    fetchDurationMs: 0, // Caller can measure externally if needed
  };
}
