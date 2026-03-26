// NormalizedUrl — Branded newtype for compile-time safety
// Implements: T-CRAWL-002, REQ-CRAWL-003

/** Branded string preventing accidental interchange with raw URLs. */
export type NormalizedUrl = string & { readonly __brand: 'NormalizedUrl' };

/**
 * Cast a validated, normalized string to NormalizedUrl. Only call after normalization.
 * @internal — not part of the public package API.
 */
export function brandNormalizedUrl(url: string): NormalizedUrl {
  return url as NormalizedUrl;
}
