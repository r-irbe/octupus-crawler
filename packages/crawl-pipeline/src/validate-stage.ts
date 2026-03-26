// Validate stage — depth guard + domain allow-list
// Implements: T-CRAWL-008, REQ-CRAWL-007, REQ-CRAWL-008

import { ok, err, type Result } from 'neverthrow';
import {
  createDepthExceededError,
  createDomainNotAllowedError,
  type CrawlError,
} from '@ipf/core/errors/crawl-error';
import type { CrawlFrontierEntry, ValidateConfig } from './crawl-types.js';

/**
 * Validate a frontier entry before fetching.
 * Checks depth limit and optional domain allow-list.
 * REQ-CRAWL-007: depth_exceeded before any HTTP request.
 * REQ-CRAWL-008: domain_not_allowed when allow-list configured.
 */
export function validateEntry(
  entry: CrawlFrontierEntry,
  config: ValidateConfig,
): Result<CrawlFrontierEntry, CrawlError> {
  // Depth guard
  if (entry.depth > config.maxDepth) {
    return err(
      createDepthExceededError({
        url: entry.url.raw,
        maxDepth: config.maxDepth,
        currentDepth: entry.depth,
      }),
    );
  }

  // Domain allow-list
  if (config.allowedDomains !== null) {
    const allowed = config.allowedDomains.some(
      (d) => d.toLowerCase() === entry.url.domain.toLowerCase(),
    );
    if (!allowed) {
      return err(
        createDomainNotAllowedError({
          url: entry.url.raw,
          domain: entry.url.domain,
        }),
      );
    }
  }

  return ok(entry);
}
