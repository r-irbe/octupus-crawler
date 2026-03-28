// Context budget monitor — tracks cumulative context size and thresholds
// Implements: T-VMEM-001, T-VMEM-003, T-VMEM-004, T-VMEM-005
// REQ-VMEM-016, REQ-VMEM-017, REQ-VMEM-021

import type { ModelFamily } from './token-estimator.js';
import { getDeclaredWindow } from './token-estimator.js';

/** Threshold event logged when context budget thresholds are exceeded (REQ-VMEM-021). */
export type ThresholdEvent = {
  readonly _tag: 'ThresholdEvent';
  readonly threshold: 'eviction' | 'warning';
  readonly utilizationPct: number;
  readonly loadedFileCount: number;
  readonly totalTokens: number;
  readonly recommendedAction: string;
  readonly timestamp: number;
};

/** Current context budget snapshot (REQ-VMEM-016). */
export type ContextBudgetSnapshot = {
  readonly declaredWindow: number;
  readonly effectiveWindow: number;
  readonly currentUsage: number;
  readonly utilizationPct: number;
  readonly warningThreshold: number;
  readonly evictionThreshold: number;
  readonly loadedFileCount: number;
};

/** Listener for threshold events. */
export type ThresholdListener = (event: ThresholdEvent) => void;

/** Mutable context budget tracker. */
export type ContextBudgetTracker = {
  /** Add tokens to the budget. */
  add(tokens: number, fileCount?: number): void;
  /** Remove tokens from the budget. */
  remove(tokens: number, fileCount?: number): void;
  /** Get current budget snapshot. */
  snapshot(): ContextBudgetSnapshot;
  /** Check if eviction threshold is exceeded (REQ-VMEM-013). */
  shouldEvict(): boolean;
  /** Check if warning threshold is exceeded (REQ-VMEM-017). */
  shouldWarn(): boolean;
  /** Register a threshold event listener. */
  onThreshold(listener: ThresholdListener): void;
};

/** NoLiMa effective window multiplier (50% of declared). */
const EFFECTIVE_WINDOW_RATIO = 0.5;

/** Warning threshold as fraction of effective window (REQ-VMEM-017). */
const WARNING_THRESHOLD = 0.7;

/** Eviction trigger threshold as fraction of effective window (REQ-VMEM-013). */
const EVICTION_THRESHOLD = 0.5;

/**
 * Create a context budget tracker for a specific model.
 * Effective window is 50% of declared window per NoLiMa (T-VMEM-003).
 */
export function createContextBudget(model: ModelFamily): ContextBudgetTracker {
  const declaredWindow = getDeclaredWindow(model);
  const effectiveWindow = Math.floor(declaredWindow * EFFECTIVE_WINDOW_RATIO);
  const warningThreshold = Math.floor(effectiveWindow * WARNING_THRESHOLD);
  const evictionThreshold = Math.floor(effectiveWindow * EVICTION_THRESHOLD);

  let currentUsage = 0;
  let loadedFileCount = 0;
  const listeners: ThresholdListener[] = [];

  function utilizationPct(): number {
    if (effectiveWindow === 0) return 0;
    return Math.round((currentUsage / effectiveWindow) * 100);
  }

  function emitThreshold(threshold: 'eviction' | 'warning', action: string): void {
    const event: ThresholdEvent = {
      _tag: 'ThresholdEvent',
      threshold,
      utilizationPct: utilizationPct(),
      loadedFileCount,
      totalTokens: currentUsage,
      recommendedAction: action,
      timestamp: Date.now(),
    };
    for (const listener of listeners) {
      listener(event);
    }
  }

  function checkThresholds(): void {
    if (currentUsage >= warningThreshold) {
      emitThreshold('warning', 'Compress completed task context or restart session');
    }
    if (currentUsage >= evictionThreshold) {
      emitThreshold('eviction', 'Evict least-recently-referenced context');
    }
  }

  return {
    add(tokens: number, fileCount = 1): void {
      currentUsage += tokens;
      loadedFileCount += fileCount;
      checkThresholds();
    },

    remove(tokens: number, fileCount = 1): void {
      currentUsage = Math.max(0, currentUsage - tokens);
      loadedFileCount = Math.max(0, loadedFileCount - fileCount);
    },

    snapshot(): ContextBudgetSnapshot {
      return {
        declaredWindow,
        effectiveWindow,
        currentUsage,
        utilizationPct: utilizationPct(),
        warningThreshold,
        evictionThreshold,
        loadedFileCount,
      };
    },

    shouldEvict(): boolean {
      return currentUsage >= evictionThreshold;
    },

    shouldWarn(): boolean {
      return currentUsage >= warningThreshold;
    },

    onThreshold(listener: ThresholdListener): void {
      listeners.push(listener);
    },
  };
}
