// Enqueue stage — child entry construction + batch enqueue
// Implements: T-CRAWL-011, REQ-CRAWL-014, REQ-CRAWL-015

import { ok, err } from 'neverthrow';
import type { CrawlUrl } from '@ipf/core/domain/crawl-url';
import type { Frontier, FrontierEntry } from '@ipf/core/contracts/frontier';
import { createQueueError, type CrawlError } from '@ipf/core/errors/crawl-error';
import type { AsyncResult } from '@ipf/core/types/result';
import type { CrawlFrontierEntry } from './crawl-types.js';

/**
 * Enqueue discovered URLs as child frontier entries.
 * REQ-CRAWL-014: child depth = parent.depth + 1.
 * REQ-CRAWL-015: queue failures → CrawlError with kind queue_error.
 */
export async function enqueueUrls(
  urls: readonly CrawlUrl[],
  parentEntry: CrawlFrontierEntry,
  frontier: Frontier,
  _workerId: string,
): AsyncResult<number, CrawlError> {
  if (urls.length === 0) {
    return ok(0);
  }

  // REQ-CRAWL-014: child depth = parent + 1
  const childDepth = parentEntry.depth + 1;
  const entries: FrontierEntry[] = urls.map((url) => ({
    url: url.normalized,
    priority: 0,
    depth: childDepth,
  }));

  const result = await frontier.enqueue(entries);
  if (result.isErr()) {
    return err(
      createQueueError({ operation: 'enqueue', cause: result.error }),
    );
  }

  return result;
}
