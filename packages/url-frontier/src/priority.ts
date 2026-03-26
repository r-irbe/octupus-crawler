// Depth-to-priority mapping — BFS ordering via BullMQ priority
// Implements: T-DIST-002, REQ-DIST-002

/**
 * Map crawl depth to queue priority for BFS traversal.
 * BullMQ: lower number = higher priority.
 * Depth 0 (seeds) → priority 0 (highest).
 */
export function depthToPriority(depth: number): number {
  return depth;
}
