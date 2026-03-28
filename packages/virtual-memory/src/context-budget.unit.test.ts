// Unit tests for context budget monitor
// Validates: T-VMEM-024 → REQ-VMEM-016, T-VMEM-025 → REQ-VMEM-017, T-VMEM-026 → REQ-VMEM-021

import { describe, it, expect } from 'vitest';
import { createContextBudget } from './context-budget.js';
import type { ThresholdEvent } from './context-budget.js';

describe('context-budget', () => {
  // T-VMEM-024: Effective window = 50% of declared (REQ-VMEM-016)
  describe('effective window calculation', () => {
    it('calculates effective window as 50% of declared for Claude', () => {
      const budget = createContextBudget('claude');
      const snap = budget.snapshot();
      // Claude declared = 200K, effective = 100K
      expect(snap.declaredWindow).toBe(200_000);
      expect(snap.effectiveWindow).toBe(100_000);
    });

    it('calculates effective window as 50% of declared for GPT-4', () => {
      const budget = createContextBudget('gpt4');
      const snap = budget.snapshot();
      expect(snap.declaredWindow).toBe(128_000);
      expect(snap.effectiveWindow).toBe(64_000);
    });

    it('starts with zero usage', () => {
      const budget = createContextBudget('claude');
      const snap = budget.snapshot();
      expect(snap.currentUsage).toBe(0);
      expect(snap.utilizationPct).toBe(0);
      expect(snap.loadedFileCount).toBe(0);
    });
  });

  describe('cumulative tracking', () => {
    it('tracks cumulative token additions', () => {
      const budget = createContextBudget('claude');
      budget.add(10_000);
      budget.add(5_000);
      const snap = budget.snapshot();
      expect(snap.currentUsage).toBe(15_000);
      expect(snap.loadedFileCount).toBe(2);
    });

    it('tracks token removals', () => {
      const budget = createContextBudget('claude');
      budget.add(10_000);
      budget.remove(3_000);
      const snap = budget.snapshot();
      expect(snap.currentUsage).toBe(7_000);
      expect(snap.loadedFileCount).toBe(0);
    });

    it('never goes below zero', () => {
      const budget = createContextBudget('claude');
      budget.add(1_000);
      budget.remove(5_000);
      const snap = budget.snapshot();
      expect(snap.currentUsage).toBe(0);
      expect(snap.loadedFileCount).toBe(0);
    });

    it('calculates utilization percentage', () => {
      const budget = createContextBudget('claude');
      // Effective = 100K, add 50K = 50%
      budget.add(50_000, 0);
      expect(budget.snapshot().utilizationPct).toBe(50);
    });
  });

  // T-VMEM-025: 70% threshold warning trigger (REQ-VMEM-017)
  describe('warning threshold', () => {
    it('triggers warning at 70% of effective window', () => {
      const budget = createContextBudget('claude');
      // Effective = 100K, warning = 70K
      const snap = budget.snapshot();
      expect(snap.warningThreshold).toBe(70_000);
    });

    it('shouldWarn returns true when above 70%', () => {
      const budget = createContextBudget('claude');
      budget.add(71_000, 0);
      expect(budget.shouldWarn()).toBe(true);
    });

    it('shouldWarn returns false when below 70%', () => {
      const budget = createContextBudget('claude');
      budget.add(30_000, 0);
      expect(budget.shouldWarn()).toBe(false);
    });
  });

  describe('eviction threshold', () => {
    it('sets eviction threshold at 50% of effective window', () => {
      const budget = createContextBudget('claude');
      const snap = budget.snapshot();
      // Effective = 100K, eviction = 50K
      expect(snap.evictionThreshold).toBe(50_000);
    });

    it('shouldEvict returns true when above 50%', () => {
      const budget = createContextBudget('claude');
      budget.add(51_000, 0);
      expect(budget.shouldEvict()).toBe(true);
    });
  });

  // T-VMEM-026: Threshold event log fields (REQ-VMEM-021)
  describe('threshold events', () => {
    it('emits warning event with required fields', () => {
      const budget = createContextBudget('claude');
      const events: ThresholdEvent[] = [];
      budget.onThreshold((e) => events.push(e));

      // Add enough to trigger both warning (70K+) and eviction (50K+)
      budget.add(75_000, 0);

      // Both thresholds fire independently
      expect(events.length).toBe(2);
      const warning = events.find((e) => e.threshold === 'warning');
      expect(warning).toBeDefined();
      expect(warning!._tag).toBe('ThresholdEvent');
      expect(warning!.threshold).toBe('warning');
      expect(warning!.utilizationPct).toBe(75);
      expect(warning!.totalTokens).toBe(75_000);
      expect(warning!.recommendedAction).toContain('Compress');
      expect(warning!.timestamp).toBeGreaterThan(0);

      const eviction = events.find((e) => e.threshold === 'eviction');
      expect(eviction).toBeDefined();
      expect(eviction!.recommendedAction).toContain('Evict');
    });

    it('emits eviction event below warning threshold', () => {
      const budget = createContextBudget('claude');
      const events: ThresholdEvent[] = [];
      budget.onThreshold((e) => events.push(e));

      // Add enough to trigger eviction but not warning (50K-70K)
      budget.add(55_000, 0);

      expect(events.length).toBeGreaterThan(0);
      const event = events[0];
      expect(event).toBeDefined();
      expect(event!.threshold).toBe('eviction');
      expect(event!.recommendedAction).toContain('Evict');
    });

    it('does not emit below eviction threshold', () => {
      const budget = createContextBudget('claude');
      const events: ThresholdEvent[] = [];
      budget.onThreshold((e) => events.push(e));

      budget.add(10_000, 0);
      expect(events).toHaveLength(0);
    });
  });
});
