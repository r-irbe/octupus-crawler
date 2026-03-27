// Seed frontier — validate and enqueue seed URLs
// Implements: T-LIFE-010 to 013, REQ-LIFE-007 to 010

import type { Result } from 'neverthrow';
import type { Logger } from '@ipf/core/contracts/logger';
import type { CrawlMetrics } from '@ipf/core/contracts/crawl-metrics';
import type { Frontier, FrontierEntry } from '@ipf/core/contracts/frontier';
import type { CrawlUrl } from '@ipf/core/domain/crawl-url';
import type { UrlError } from '@ipf/core/errors/url-error';

export type ParseCrawlUrlFn = (raw: string) => Result<CrawlUrl, UrlError>;

export type SeedDeps = {
  readonly frontier: Frontier;
  readonly logger: Logger;
  readonly metrics: CrawlMetrics;
  readonly parseCrawlUrl: ParseCrawlUrlFn;
};

export async function seedFrontier(
  seeds: readonly string[],
  deps: SeedDeps,
): Promise<void> {
  const entries: FrontierEntry[] = [];

  for (const raw of seeds) {
    const result = deps.parseCrawlUrl(raw);
    if (result.isErr()) {
      // REQ-LIFE-007: log warning and skip invalid seeds — don't abort
      deps.logger.warn('Invalid seed URL, skipping', { url: raw, error: result.error.message });
      continue;
    }
    // REQ-LIFE-008: enqueue at depth 0
    entries.push({
      url: result.value.normalized,
      priority: 0,
      depth: 0,
    });
  }

  if (entries.length === 0) {
    deps.logger.warn('No valid seed URLs to enqueue');
    return;
  }

  // REQ-LIFE-009: log enqueue failures
  const enqueueResult = await deps.frontier.enqueue(entries);
  if (enqueueResult.isErr()) {
    deps.logger.error('Seed enqueue failed', {
      error: enqueueResult.error.message,
      operation: enqueueResult.error.operation,
    });
    return;
  }

  deps.logger.info('Seeds enqueued', { count: enqueueResult.value });

  // REQ-LIFE-010: record frontier size metric after seeding
  const sizeResult = await deps.frontier.size();
  if (sizeResult.isOk()) {
    deps.metrics.setFrontierSize(sizeResult.value.total);
  }
}

export function parseSeedUrls(commaSeparated: string): string[] {
  return commaSeparated
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}
