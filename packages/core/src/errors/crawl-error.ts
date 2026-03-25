// CrawlError — Superset of FetchError | UrlError + 3 crawl-specific variants
// Implements: REQ-ARCH-012, REQ-ARCH-013

import type { FetchError } from './fetch-error.js';
import type { UrlError } from './url-error.js';

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

type QueueErrorVariant = {
  readonly kind: 'queue_error';
  readonly operation: string;
  readonly cause: Error;
  readonly message: string;
};

// --- Union type (superset) ---

export type CrawlError =
  | FetchError
  | UrlError
  | DepthExceededError
  | DomainNotAllowedError
  | QueueErrorVariant;

// --- Constructors ---

export function createDepthExceededError(p: { url: string; maxDepth: number; currentDepth: number }): DepthExceededError {
  return { kind: 'depth_exceeded', url: p.url, maxDepth: p.maxDepth, currentDepth: p.currentDepth, message: `Crawl depth exceeded (${String(p.currentDepth)} > max ${String(p.maxDepth)}) for ${p.url}` };
}

export function createDomainNotAllowedError(p: { url: string; domain: string }): DomainNotAllowedError {
  return { kind: 'domain_not_allowed', url: p.url, domain: p.domain, message: `domain not allowed: ${p.domain} for ${p.url}` };
}

export function createQueueError(p: { operation: string; cause: Error }): QueueErrorVariant {
  return { kind: 'queue_error', operation: p.operation, cause: p.cause, message: `Queue error during ${p.operation}: ${p.cause.message}` };
}
