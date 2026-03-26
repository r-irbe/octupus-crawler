// Priority mapping unit tests
// Validates: REQ-DIST-002 (BFS ordering via depth-to-priority)

import { describe, it, expect } from 'vitest';
import { depthToPriority } from './priority.js';

describe('depthToPriority', () => {
  // Validates REQ-DIST-002: seed URLs (depth 0) get highest priority
  it('maps depth 0 to priority 0 (highest)', () => {
    expect(depthToPriority(0)).toBe(0);
  });

  // Validates REQ-DIST-002: depth 1 gets lower priority than depth 0
  it('maps depth 1 to priority 1', () => {
    expect(depthToPriority(1)).toBe(1);
  });

  // Validates REQ-DIST-002: higher depth = higher priority number = lower queue priority
  it('maps increasing depth to increasing priority number', () => {
    const priorities = [0, 1, 2, 3, 4, 5].map(depthToPriority);
    for (let i = 1; i < priorities.length; i++) {
      const prev = priorities[i - 1];
      const curr = priorities[i];
      if (prev !== undefined && curr !== undefined) {
        expect(curr).toBeGreaterThan(prev);
      }
    }
  });

  // Validates REQ-DIST-002: large depth values handled
  it('handles large depth values', () => {
    expect(depthToPriority(100)).toBe(100);
    expect(depthToPriority(1000)).toBe(1000);
  });

  // Validates REQ-DIST-002: BFS invariant — shallower always higher priority
  it('BFS invariant: depth N has higher priority than depth N+1', () => {
    for (let n = 0; n < 10; n++) {
      expect(depthToPriority(n)).toBeLessThan(depthToPriority(n + 1));
    }
  });
});
