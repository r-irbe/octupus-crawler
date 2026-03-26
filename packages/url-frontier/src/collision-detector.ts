// Collision detector — detect hash collisions via addBulk discrepancy
// Implements: T-DIST-018, REQ-DIST-009

/** Metrics reporter interface for collision counting. */
export interface CollisionMetrics {
  incrementCollisions(count: number): void;
}

/** Noop metrics reporter (for when metrics are not configured). */
export const NULL_COLLISION_METRICS: CollisionMetrics = {
  incrementCollisions: (): void => { /* nop */ },
};

/**
 * Detect potential hash collisions after a bulk add.
 * If the queue reports fewer additions than unique job IDs submitted,
 * the difference is either dedup (expected) or collision (unexpected).
 *
 * @param submitted  Number of unique job IDs submitted
 * @param added      Number actually added by the queue
 * @param uniqueUrls Number of unique pre-normalization URLs
 * @param metrics    Collision counter reporter
 *
 * REQ-DIST-009: If addBulk reports fewer added than submitted,
 * and the discarded URLs have different pre-normalization forms,
 * increment url_frontier_collisions_total.
 */
export function detectCollisions(
  submitted: number,
  added: number,
  uniqueUrls: number,
  metrics: CollisionMetrics,
): void {
  // If submitted > added, some were deduped by the queue
  const discarded = submitted - added;
  if (discarded <= 0) return;

  // If unique URLs > submitted unique job IDs, that's expected dedup
  // But if unique URLs === submitted, then discards are collisions
  // Heuristic: if uniqueUrls > added, the extra discards beyond
  // expected dedup (submitted - uniqueUrls) are potential collisions
  const expectedDedup = submitted - uniqueUrls;
  const unexpectedDiscards = discarded - expectedDedup;

  if (unexpectedDiscards > 0) {
    metrics.incrementCollisions(unexpectedDiscards);
  }
}
