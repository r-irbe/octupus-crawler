// Job ID derivation — deterministic SHA-256 hash of normalized URL
// Implements: T-DIST-001, REQ-DIST-001, REQ-DIST-008

import { createHash } from 'node:crypto';

/**
 * Derive a deterministic job ID from a normalized URL.
 * Uses SHA-256 truncated to 128 bits (32 hex chars).
 *
 * Collision resistance: 128-bit hash gives birthday bound at ~2^64.
 * For ≤10^9 URLs, collision probability is <10^{-10} (negligible).
 * If corpus exceeds 10^9 URLs, extend to 48 hex chars (192 bits).
 *
 * @see REQ-DIST-008 for collision resistance documentation
 */
export function deriveJobId(normalizedUrl: string): string {
  return createHash('sha256')
    .update(normalizedUrl)
    .digest('hex')
    .slice(0, 32); // 128-bit = 32 hex chars
}
