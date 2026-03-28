// Unit tests for eviction controller
// Validates: T-VMEM-032 → REQ-VMEM-014, T-VMEM-033 → REQ-VMEM-015,
//            T-VMEM-034 → REQ-VMEM-018, REQ-VMEM-019

import { describe, it, expect } from 'vitest';
import {
  createEvictionController,
  classifyPriority,
} from './eviction-controller.js';

describe('eviction-controller', () => {
  // T-VMEM-032: Eviction priority ordering (REQ-VMEM-014)
  describe('priority-based eviction', () => {
    it('evicts P4 stale items first', () => {
      const ctrl = createEvictionController();
      ctrl.register({ path: 'stale.ts', status: 'loaded', priority: 4, backingStore: 'stale.ts', lastAccessed: 1, sizeTokens: 500 });
      ctrl.register({ path: 'ref.ts', status: 'loaded', priority: 3, backingStore: 'ref.ts', lastAccessed: 2, sizeTokens: 500 });
      ctrl.register({ path: 'recent.ts', status: 'loaded', priority: 2, backingStore: 'recent.ts', lastAccessed: 3, sizeTokens: 500 });

      const events = ctrl.evict(500, 75);
      expect(events).toHaveLength(1);
      expect(events[0]!.evictedPath).toBe('stale.ts');
    });

    it('evicts LRU within same priority', () => {
      const ctrl = createEvictionController();
      ctrl.register({ path: 'old.ts', status: 'loaded', priority: 3, backingStore: 'old.ts', lastAccessed: 1, sizeTokens: 500 });
      ctrl.register({ path: 'new.ts', status: 'loaded', priority: 3, backingStore: 'new.ts', lastAccessed: 5, sizeTokens: 500 });

      const events = ctrl.evict(500, 60);
      expect(events).toHaveLength(1);
      expect(events[0]!.evictedPath).toBe('old.ts');
    });

    it('evicts multiple items to reach target', () => {
      const ctrl = createEvictionController();
      ctrl.register({ path: 'a.ts', status: 'loaded', priority: 4, backingStore: 'a.ts', lastAccessed: 1, sizeTokens: 300 });
      ctrl.register({ path: 'b.ts', status: 'loaded', priority: 4, backingStore: 'b.ts', lastAccessed: 2, sizeTokens: 300 });

      const events = ctrl.evict(500, 80);
      expect(events).toHaveLength(2);
    });

    it('never evicts P0 or P1 items', () => {
      const ctrl = createEvictionController();
      ctrl.register({ path: 'pinned.ts', status: 'loaded', priority: 0, backingStore: 'p.ts', lastAccessed: 1, sizeTokens: 500 });
      ctrl.register({ path: 'current.ts', status: 'loaded', priority: 1, backingStore: 'c.ts', lastAccessed: 1, sizeTokens: 500 });

      const events = ctrl.evict(1000, 90);
      expect(events).toHaveLength(0);
    });
  });

  // T-VMEM-033: Eviction exclusion list (REQ-VMEM-015)
  describe('exclusion list', () => {
    it('excludes state tracker from eviction', () => {
      const ctrl = createEvictionController();
      ctrl.register({ path: 'state-tracker.md', status: 'loaded', priority: 3, backingStore: 'st.md', lastAccessed: 1, sizeTokens: 500 });
      ctrl.register({ path: 'other.ts', status: 'loaded', priority: 3, backingStore: 'o.ts', lastAccessed: 1, sizeTokens: 500 });

      const events = ctrl.evict(1000, 80);
      expect(events).toHaveLength(1);
      expect(events[0]!.evictedPath).toBe('other.ts');
    });

    it('excludes custom paths from eviction', () => {
      const ctrl = createEvictionController(['my-critical-file.ts']);
      ctrl.register({ path: 'my-critical-file.ts', status: 'loaded', priority: 4, backingStore: 'c.ts', lastAccessed: 1, sizeTokens: 500 });
      ctrl.register({ path: 'other.ts', status: 'loaded', priority: 4, backingStore: 'o.ts', lastAccessed: 1, sizeTokens: 500 });

      const events = ctrl.evict(1000, 80);
      expect(events).toHaveLength(1);
      expect(events[0]!.evictedPath).toBe('other.ts');
    });
  });

  // T-VMEM-034: Page fault reload and logging (REQ-VMEM-018, REQ-VMEM-019)
  describe('page fault', () => {
    it('records page fault with reason and reload cost', () => {
      const ctrl = createEvictionController();
      ctrl.register({ path: 'evicted.ts', status: 'evicted', priority: 3, backingStore: 'e.ts', lastAccessed: 1, sizeTokens: 0 });

      const fault = ctrl.pageFault('evicted.ts', 'Needed for cross-task dependency', 800);

      expect(fault._tag).toBe('PageFaultEvent');
      expect(fault.path).toBe('evicted.ts');
      expect(fault.reason).toBe('Needed for cross-task dependency');
      expect(fault.reloadCostTokens).toBe(800);
      expect(fault.timestamp).toBeGreaterThan(0);
    });

    it('restores evicted entry to loaded status', () => {
      const ctrl = createEvictionController();
      ctrl.register({ path: 'evicted.ts', status: 'evicted', priority: 3, backingStore: 'e.ts', lastAccessed: 1, sizeTokens: 0 });

      ctrl.pageFault('evicted.ts', 'needed', 800);

      const entry = ctrl.get('evicted.ts');
      expect(entry).toBeDefined();
      expect(entry!.status).toBe('loaded');
      expect(entry!.sizeTokens).toBe(800);
    });
  });

  describe('access tracking', () => {
    it('updates lastAccessed on access', () => {
      const ctrl = createEvictionController();
      ctrl.register({ path: 'a.ts', status: 'loaded', priority: 3, backingStore: 'a.ts', lastAccessed: 1, sizeTokens: 100 });

      ctrl.access('a.ts', 5);
      const entry = ctrl.get('a.ts');
      expect(entry!.lastAccessed).toBe(5);
    });
  });

  describe('loadedTokens', () => {
    it('counts only loaded and pinned tokens', () => {
      const ctrl = createEvictionController();
      ctrl.register({ path: 'a.ts', status: 'loaded', priority: 3, backingStore: 'a', lastAccessed: 1, sizeTokens: 100 });
      ctrl.register({ path: 'b.ts', status: 'pinned', priority: 0, backingStore: 'b', lastAccessed: 1, sizeTokens: 200 });
      ctrl.register({ path: 'c.ts', status: 'evicted', priority: 4, backingStore: 'c', lastAccessed: 1, sizeTokens: 300 });

      expect(ctrl.loadedTokens()).toBe(300);
    });
  });

  // classifyPriority
  describe('classifyPriority', () => {
    const currentFiles = new Set(['current.ts']);
    const recentFiles = new Set(['recent.ts']);

    it('classifies state tracker as P0', () => {
      expect(classifyPriority('state-tracker.md', currentFiles, recentFiles, 3, 5)).toBe(0);
    });

    it('classifies AGENTS.md as P0', () => {
      expect(classifyPriority('AGENTS.md', currentFiles, recentFiles, 3, 5)).toBe(0);
    });

    it('classifies current task files as P1', () => {
      expect(classifyPriority('current.ts', currentFiles, recentFiles, 3, 5)).toBe(1);
    });

    it('classifies recent task files as P2', () => {
      expect(classifyPriority('recent.ts', currentFiles, recentFiles, 3, 5)).toBe(2);
    });

    it('classifies old files as P4 (stale)', () => {
      expect(classifyPriority('old.ts', currentFiles, recentFiles, 5, 2)).toBe(4);
    });

    it('classifies reference files as P3', () => {
      expect(classifyPriority('adr.md', currentFiles, recentFiles, 3, 5)).toBe(3);
    });
  });
});
