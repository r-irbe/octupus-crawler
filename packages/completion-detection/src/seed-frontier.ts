// Idempotent seeding — add seed URLs to frontier with deduplication
// Implements: T-COORD-011, REQ-DIST-020

import { ok, err } from 'neverthrow';
import type { Frontier, FrontierEntry } from '@ipf/core/contracts/frontier';
import type { Logger } from '@ipf/core/contracts/logger';
import type { AsyncResult } from '@ipf/core/types/result';
import type { QueueError } from '@ipf/core/errors/queue-error';

export type SeedResult = {
  readonly enqueued: number;
  readonly skippedDuplicates: number;
};

/**
 * Seed the frontier with initial URLs. Idempotent via frontier's built-in dedup.
 * REQ-DIST-020: Duplicate seeds are silently dropped by the frontier's SHA-256 dedup.
 * Calling seed() multiple times with the same URLs is safe.
 */
export async function seedFrontier(
  frontier: Frontier,
  urls: readonly string[],
  logger: Logger,
): AsyncResult<SeedResult, QueueError> {
  if (urls.length === 0) {
    return ok({ enqueued: 0, skippedDuplicates: 0 });
  }

  const entries: FrontierEntry[] = urls.map((url) => ({
    url,
    priority: 0,
    depth: 0,
  }));

  const result = await frontier.enqueue(entries);
  if (result.isErr()) {
    return err(result.error);
  }

  const enqueued = result.value;
  const skipped = urls.length - enqueued;

  logger.info('Seed complete', { total: urls.length, enqueued, skippedDuplicates: skipped });

  return ok({ enqueued, skippedDuplicates: skipped });
}
