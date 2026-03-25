// CrawlError — Superset of FetchError | UrlError + 3 crawl-specific variants
// Implements: REQ-ARCH-012, REQ-ARCH-013

import type { FetchError } from './fetch-error.js';
import type { QueueError } from './queue-error.js';
import type { UrlError } from './url-error.js';
import { stripUrlCredentials } from './strip-url-credentials.js';

// --- Crawl-specific variant types ---

type DepthExceededError = {
  readonly kind: 'depth_exceeded';
  readonly url: string;
  readonly maxDepth: number;
  readonly currentDepth: number;
  readonly message: string;
};

type DomainNotAllowedError = {
  readonly kind: 'domain_not_allowed';
  readonly url: string;
  readonly domain: string;
  readonly message: string;
};

// --- Union type (superset) ---

export type CrawlError =
  | FetchError
  | UrlError
  | DepthExceededError
  | DomainNotAllowedError
  | QueueError;

// --- Constructors ---

export { createQueueError } from './queue-error.js';

export function createDepthExceededError(p: { url: string; maxDepth: number; currentDepth: number }): DepthExceededError {
  const safeUrl = stripUrlCredentials(p.url);
  return { kind: 'depth_exceeded', url: p.url, maxDepth: p.maxDepth, currentDepth: p.currentDepth, message: `Crawl depth exceeded (${String(p.currentDepth)} > max ${String(p.maxDepth)}) for ${safeUrl}` };
}

export function createDomainNotAllowedError(p: { url: string; domain: string }): DomainNotAllowedError {
  const safeUrl = stripUrlCredentials(p.url);
  return { kind: 'domain_not_allowed', url: p.url, domain: p.domain, message: `domain not allowed: ${p.domain} for ${safeUrl}` };
}
