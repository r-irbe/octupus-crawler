// Collision detector unit tests
// Validates: REQ-DIST-009 (collision detection + metrics)

import { describe, it, expect } from 'vitest';
import { detectCollisions, NULL_COLLISION_METRICS } from './collision-detector.js';
import type { CollisionMetrics } from './collision-detector.js';

function createMockMetrics(): CollisionMetrics & { calls: number[] } {
  const calls: number[] = [];
  return {
    calls,
    incrementCollisions(count: number): void {
      calls.push(count);
    },
  };
}

describe('detectCollisions', () => {
  // Validates REQ-DIST-009: no collision when added matches submitted
  it('does not report collisions when all jobs were added', () => {
    const metrics = createMockMetrics();
    detectCollisions(10, 10, 10, metrics);
    expect(metrics.calls).toHaveLength(0);
  });

  // Validates REQ-DIST-009: expected dedup is not flagged as collision
  it('does not report collisions for expected dedup', () => {
    const metrics = createMockMetrics();
    // 10 submitted from 8 unique URLs → 2 expected dedup
    // Queue added 8 → 2 discarded = 2 expected dedup → 0 collisions
    detectCollisions(10, 8, 8, metrics);
    expect(metrics.calls).toHaveLength(0);
  });

  // Validates REQ-DIST-009: unexpected discards flagged as collisions
  it('reports collisions when discards exceed expected dedup', () => {
    const metrics = createMockMetrics();
    // 10 submitted from 10 unique URLs → 0 expected dedup
    // Queue added 8 → 2 discarded - 0 expected = 2 collisions
    detectCollisions(10, 8, 10, metrics);
    expect(metrics.calls).toStrictEqual([2]);
  });

  // Validates REQ-DIST-009: partial collision detection
  it('reports only the unexpected portion as collisions', () => {
    const metrics = createMockMetrics();
    // 10 submitted from 9 unique URLs → 1 expected dedup
    // Queue added 7 → 3 discarded - 1 expected = 2 collisions
    detectCollisions(10, 7, 9, metrics);
    expect(metrics.calls).toStrictEqual([2]);
  });

  // Validates REQ-DIST-009: added > submitted is not a collision
  it('does not report when added exceeds submitted', () => {
    const metrics = createMockMetrics();
    detectCollisions(5, 6, 5, metrics);
    expect(metrics.calls).toHaveLength(0);
  });

  // Validates REQ-DIST-009: zero submitted
  it('handles zero submitted gracefully', () => {
    const metrics = createMockMetrics();
    detectCollisions(0, 0, 0, metrics);
    expect(metrics.calls).toHaveLength(0);
  });

  // Validates REQ-DIST-009: single collision
  it('reports single collision correctly', () => {
    const metrics = createMockMetrics();
    // 5 submitted from 5 unique → 0 expected dedup
    // Queue added 4 → 1 discarded - 0 expected = 1 collision
    detectCollisions(5, 4, 5, metrics);
    expect(metrics.calls).toStrictEqual([1]);
  });
});

describe('NULL_COLLISION_METRICS', () => {
  // Validates: noop metrics does not throw
  it('accepts calls without throwing', () => {
    expect(() => { NULL_COLLISION_METRICS.incrementCollisions(5); }).not.toThrow();
  });
});
