// Event-publishing CrawlURLRepository decorator
// Implements: T-COMM-013 (REQ-COMM-012), T-DATA-023 (REQ-DATA-027)
// Publishes CrawlCompleted/CrawlFailed events after updateStatus succeeds

import type { Result } from 'neverthrow';
import type { DataError } from '../errors.js';
import type { CrawlURLStatus, FetchResult } from '../types.js';
import type { CrawlURLRepository } from './crawl-url-repository.js';

// --- Minimal event port (structural, avoids coupling to @ipf/redis) ---

export type StatusChangeEvent = {
  readonly type: string;
  readonly version: number;
  readonly payload: Record<string, unknown>;
  readonly id: string;
  readonly timestamp: string;
  readonly source: string;
};

export type StatusEventPublisher = {
  readonly publish: (
    streamKey: string,
    event: StatusChangeEvent,
  ) => Promise<Result<string, { readonly _tag: string; readonly message: string }>>;
};

export type EventPublishingConfig = {
  readonly streamKey: string;
  readonly source: string;
};

// --- Decorator factory ---

/**
 * Wraps a CrawlURLRepository to publish domain events on status changes.
 * REQ-COMM-012: CrawlCompleted/CrawlFailed events published to Redis Streams.
 * REQ-DATA-027: Repository operations emit domain events on state changes.
 *
 * Event publishing is fire-and-forget: DB write succeeds even if event fails.
 * Failed publishes are logged but do not propagate errors to callers.
 */
export function createEventPublishingCrawlURLRepository(
  repo: CrawlURLRepository,
  publisher: StatusEventPublisher,
  config: EventPublishingConfig,
  logger: { readonly warn: (msg: string, ctx: Record<string, unknown>) => void },
): CrawlURLRepository {
  return {
    findById: repo.findById,
    findByHash: repo.findByHash,
    save: repo.save,
    saveBatch: repo.saveBatch,
    findPendingByDomain: repo.findPendingByDomain,

    async updateStatus(
      id: bigint,
      status: CrawlURLStatus,
      result?: FetchResult,
    ): Promise<Result<void, DataError>> {
      const dbResult = await repo.updateStatus(id, status, result);
      if (dbResult.isErr()) return dbResult;

      // Fire-and-forget event publishing
      const event = buildStatusEvent(id, status, result, config.source);
      if (event !== undefined) {
        const publishResult = await publisher.publish(config.streamKey, event);
        if (publishResult.isErr()) {
          logger.warn('Event publish failed after updateStatus', {
            id: String(id),
            status,
            error: publishResult.error.message,
          });
        }
      }

      return dbResult;
    },
  };
}

// --- Helpers ---

function buildStatusEvent(
  id: bigint,
  status: CrawlURLStatus,
  result: FetchResult | undefined,
  source: string,
): StatusChangeEvent | undefined {
  const now = new Date().toISOString();
  const eventId = `${String(id)}-${now}`;

  if (status === 'fetched' && result) {
    return {
      type: 'CrawlCompleted',
      version: 1,
      payload: {
        jobId: String(id),
        url: '',
        statusCode: result.statusCode,
        contentLength: 0,
        fetchDurationMs: 0,
      },
      id: eventId,
      timestamp: now,
      source,
    };
  }

  if (status === 'failed') {
    return {
      type: 'CrawlFailed',
      version: 1,
      payload: {
        jobId: String(id),
        url: '',
        errorKind: 'unknown',
        message: 'Status updated to failed',
        attempt: 1,
      },
      id: eventId,
      timestamp: now,
      source,
    };
  }

  return undefined;
}
