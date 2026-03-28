// Pipeline composition — validate → fetch → discover → enqueue
// Implements: T-CRAWL-012, REQ-CRAWL-005, REQ-CRAWL-006

import { ok, err } from 'neverthrow';
import type { Fetcher, FetchConfig } from '@ipf/core/contracts/fetcher';
import type { Frontier } from '@ipf/core/contracts/frontier';
import type { Logger } from '@ipf/core/contracts/logger';
import type { CrawlError } from '@ipf/core/errors/crawl-error';
import type { AsyncResult } from '@ipf/core/types/result';
import type {
  CrawlFrontierEntry,
  CrawlResult,
  PipelineConfig,
} from './crawl-types.js';
import { validateEntry } from './validate-stage.js';
import { fetchEntry } from './fetch-stage.js';
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

  // Stage 2: Fetch (delegates to Fetcher contract — T-CRAWL-009)
  const fetched = await fetchEntry(entry, deps.fetcher, deps.fetchConfig);
  if (fetched.isErr()) return err(fetched.error);
  const crawlFetch = fetched.value;

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

