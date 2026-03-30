// Event-publishing discover stage — emits URLDiscovered events for each link
// Implements: T-COMM-014 (REQ-COMM-013, REQ-COMM-014)
// Wraps discoverLinks and publishes URLDiscovered events via batch

import type { Result } from 'neverthrow';
import type { CrawlUrl } from '@ipf/core/domain/crawl-url';
import type { CrawlError } from '@ipf/core/errors/crawl-error';
import type { Logger } from '@ipf/core/contracts/logger';
import { discoverLinks, type ResultLinkExtractor } from './discover-stage.js';
import type { CrawlFetchResult } from './crawl-types.js';

// --- Minimal event types (structural, avoids coupling to @ipf/redis) ---

export type DiscoveryEvent = {
  readonly type: string;
  readonly version: number;
  readonly payload: Record<string, unknown>;
  readonly id: string;
  readonly timestamp: string;
  readonly source: string;
};

export type DiscoveryEventPublisher = {
  readonly publishBatch: (
    streamKey: string,
    events: readonly DiscoveryEvent[],
  ) => Promise<Result<readonly string[], { readonly _tag: string; readonly message: string }>>;
};

export type DiscoverWithEventsConfig = {
  readonly streamKey: string;
  readonly source: string;
};

// --- Wrapper ---

/**
 * Discover links and publish URLDiscovered events for each.
 * REQ-COMM-013: URLDiscovered events emitted during discovery.
 * REQ-COMM-014: Batch publishing for efficiency.
 *
 * Event publishing is fire-and-forget: discovery results are returned
 * even if event publishing fails.
 */
export function discoverLinksWithEvents(
  fetchResult: CrawlFetchResult,
  extractor: ResultLinkExtractor,
  logger: Logger,
  publisher: DiscoveryEventPublisher,
  config: DiscoverWithEventsConfig,
): Result<CrawlUrl[], CrawlError> {
  const result = discoverLinks(fetchResult, extractor, logger);

  if (result.isOk() && result.value.length > 0) {
    const sourceUrl = (fetchResult.finalUrl ?? fetchResult.requestedUrl).normalized;
    const now = new Date().toISOString();
    const events: DiscoveryEvent[] = result.value.map((url, i) => ({
      type: 'URLDiscovered',
      version: 1,
      payload: {
        sourceUrl,
        discoveredUrl: url.normalized,
        depth: 0,
      },
      id: `discover-${now}-${String(i)}`,
      timestamp: now,
      source: config.source,
    }));

    // Fire-and-forget — we don't await or propagate publish errors
    publisher.publishBatch(config.streamKey, events).then((pubResult) => {
      if (pubResult.isErr()) {
        logger.warn('Failed to publish URLDiscovered events', {
          source: sourceUrl,
          count: events.length,
          error: pubResult.error.message,
        });
      }
    }).catch((cause: unknown) => {
      logger.warn('URLDiscovered event publishing threw', {
        source: sourceUrl,
        error: cause instanceof Error ? cause.message : String(cause),
      });
    });
  }

  return result;
}
