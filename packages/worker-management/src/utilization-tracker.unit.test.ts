// UtilizationTracker unit tests
// Validates: REQ-DIST-011 (utilization tracking), REQ-DIST-013 (counter guard)
// Tasks: T-WORK-007, T-WORK-015

import { describe, it, expect } from 'vitest';
import { UtilizationTracker } from './utilization-tracker.js';

describe('UtilizationTracker', () => {
  // T-WORK-007: utilization ratio calculation
  describe('ratio calculation (REQ-DIST-011)', () => {
    it('returns 0 when no active jobs', () => {
      const tracker = new UtilizationTracker(4);
      expect(tracker.ratio).toBe(0);
      expect(tracker.activeJobs).toBe(0);
    });

    it('returns correct ratio with active jobs', () => {
      const tracker = new UtilizationTracker(4);
      tracker.onJobStarted();
      tracker.onJobStarted();
      expect(tracker.ratio).toBe(0.5);
      expect(tracker.activeJobs).toBe(2);
    });

    it('returns 1.0 at full capacity', () => {
      const tracker = new UtilizationTracker(2);
      tracker.onJobStarted();
      tracker.onJobStarted();
      expect(tracker.ratio).toBe(1.0);
    });

    it('tracks maxConcurrency', () => {
      const tracker = new UtilizationTracker(8);
      expect(tracker.maxConcurrency).toBe(8);
    });
  });

  // T-WORK-007: floor guard
  describe('floor guard (REQ-DIST-011)', () => {
    it('does not go below 0 on completed when already at 0', () => {
      const tracker = new UtilizationTracker(4);
      tracker.onJobCompleted();
      expect(tracker.activeJobs).toBe(0);
      expect(tracker.ratio).toBe(0);
    });

    it('does not go below 0 on failed when already at 0', () => {
      const tracker = new UtilizationTracker(4);
      tracker.onJobFailed();
      expect(tracker.activeJobs).toBe(0);
    });

    it('does not go below 0 on stalled when already at 0', () => {
      const tracker = new UtilizationTracker(4);
      tracker.onJobStalled();
      expect(tracker.activeJobs).toBe(0);
    });

    it('handles double-decrement after single start', () => {
      const tracker = new UtilizationTracker(4);
      tracker.onJobStarted();
      tracker.onJobCompleted();
      tracker.onJobCompleted(); // double-decrement
      expect(tracker.activeJobs).toBe(0);
    });
  });

  describe('lifecycle events (T-WORK-002)', () => {
    it('increments on start, decrements on complete', () => {
      const tracker = new UtilizationTracker(4);
      tracker.onJobStarted();
      expect(tracker.activeJobs).toBe(1);
      tracker.onJobCompleted();
      expect(tracker.activeJobs).toBe(0);
    });

    it('increments on start, decrements on failed', () => {
      const tracker = new UtilizationTracker(4);
      tracker.onJobStarted();
      tracker.onJobFailed();
      expect(tracker.activeJobs).toBe(0);
    });

    it('increments on start, decrements on stalled', () => {
      const tracker = new UtilizationTracker(4);
      tracker.onJobStarted();
      tracker.onJobStalled();
      expect(tracker.activeJobs).toBe(0);
    });
  });

  // T-WORK-015: counter inconsistency detection and reset
  describe('counter inconsistency guard (REQ-DIST-013)', () => {
    it('detects inconsistency when activeJobs > maxConcurrency', () => {
      const tracker = new UtilizationTracker(2);
      tracker.onJobStarted();
      tracker.onJobStarted();
      tracker.onJobStarted(); // over max
      expect(tracker.isInconsistent()).toBe(true);
    });

    it('is consistent when activeJobs <= maxConcurrency', () => {
      const tracker = new UtilizationTracker(2);
      tracker.onJobStarted();
      tracker.onJobStarted();
      expect(tracker.isInconsistent()).toBe(false);
    });

    it('resets counter to actual value', () => {
      const tracker = new UtilizationTracker(2);
      tracker.onJobStarted();
      tracker.onJobStarted();
      tracker.onJobStarted();
      tracker.reset(1);
      expect(tracker.activeJobs).toBe(1);
      expect(tracker.isInconsistent()).toBe(false);
    });

    it('reset clamps negative values to 0', () => {
      const tracker = new UtilizationTracker(2);
      tracker.reset(-5);
      expect(tracker.activeJobs).toBe(0);
    });
  });

  describe('snapshot', () => {
    it('returns frozen snapshot of current state', () => {
      const tracker = new UtilizationTracker(4);
      tracker.onJobStarted();
      const snap = tracker.snapshot();
      expect(snap).toEqual({
        activeJobs: 1,
        maxConcurrency: 4,
        ratio: 0.25,
      });
    });
  });

  describe('constructor validation', () => {
    it('throws on zero maxConcurrency', () => {
      expect(() => new UtilizationTracker(0)).toThrow('positive integer');
    });

    it('throws on negative maxConcurrency', () => {
      expect(() => new UtilizationTracker(-1)).toThrow('positive integer');
    });

    it('throws on non-integer maxConcurrency', () => {
      expect(() => new UtilizationTracker(1.5)).toThrow('positive integer');
    });
  });
});
