// Page table — maps loaded context entries to backing store
// Supplements eviction-controller.ts for T-VMEM-021, T-VMEM-022
// REQ-VMEM-018, REQ-VMEM-019

import type { PageEntry, PageFaultEvent } from './eviction-controller.js';
import type { ModelFamily } from './token-estimator.js';
import { estimateTokens } from './token-estimator.js';

/** Page table log entry for audit trail (design.md §8). */
export type PageTableLogEntry = {
  readonly _tag: 'PageTableLogEntry';
  readonly action: 'load' | 'evict' | 'fault' | 'pin';
  readonly path: string;
  readonly sizeTokens: number;
  readonly timestamp: number;
  readonly detail: string;
};

/** Page table with logging for audit trail. */
export type PageTable = {
  /** Log a page load. */
  logLoad(path: string, sizeTokens: number): void;
  /** Log an eviction. */
  logEviction(path: string, sizeTokens: number, reason: string): void;
  /** Log a page fault and reload (REQ-VMEM-019). */
  logPageFault(fault: PageFaultEvent): void;
  /** Log a pin operation. */
  logPin(path: string, sizeTokens: number): void;
  /** Get the full audit log. */
  auditLog(): readonly PageTableLogEntry[];
  /** Format audit log as markdown for state tracker. */
  formatLog(): string;
};

/**
 * Create a page table with audit logging.
 */
export function createPageTable(): PageTable {
  const log: PageTableLogEntry[] = [];

  return {
    logLoad(path: string, sizeTokens: number): void {
      log.push({
        _tag: 'PageTableLogEntry',
        action: 'load',
        path,
        sizeTokens,
        timestamp: Date.now(),
        detail: `Loaded ${path} (${String(sizeTokens)} tokens)`,
      });
    },

    logEviction(path: string, sizeTokens: number, reason: string): void {
      log.push({
        _tag: 'PageTableLogEntry',
        action: 'evict',
        path,
        sizeTokens,
        timestamp: Date.now(),
        detail: `Evicted ${path} (${String(sizeTokens)} tokens): ${reason}`,
      });
    },

    logPageFault(fault: PageFaultEvent): void {
      log.push({
        _tag: 'PageTableLogEntry',
        action: 'fault',
        path: fault.path,
        sizeTokens: fault.reloadCostTokens,
        timestamp: fault.timestamp,
        detail: `Page fault: ${fault.path} (${String(fault.reloadCostTokens)} tokens) — ${fault.reason}`,
      });
    },

    logPin(path: string, sizeTokens: number): void {
      log.push({
        _tag: 'PageTableLogEntry',
        action: 'pin',
        path,
        sizeTokens,
        timestamp: Date.now(),
        detail: `Pinned ${path} (${String(sizeTokens)} tokens)`,
      });
    },

    auditLog(): readonly PageTableLogEntry[] {
      return [...log];
    },

    formatLog(): string {
      if (log.length === 0) return '## Context Events\n\nNo events recorded.';

      const lines = ['## Context Events', ''];
      for (const entry of log) {
        const time = new Date(entry.timestamp).toISOString();
        lines.push(`- \`${time}\` [${entry.action}] ${entry.detail}`);
      }
      return lines.join('\n');
    },
  };
}

/**
 * Estimate reload cost for a page fault (REQ-VMEM-019).
 * Used when deciding whether to reload from disk or distilled summary.
 */
export function estimateReloadCost(
  content: string,
  model: ModelFamily,
): number {
  return estimateTokens(content, model);
}

/**
 * Summarize page table state for display.
 */
export function summarizePages(entries: readonly PageEntry[]): string {
  const pinned = entries.filter((e) => e.status === 'pinned');
  const loaded = entries.filter((e) => e.status === 'loaded');
  const evicted = entries.filter((e) => e.status === 'evicted');

  const pinnedTokens = pinned.reduce((s, e) => s + e.sizeTokens, 0);
  const loadedTokens = loaded.reduce((s, e) => s + e.sizeTokens, 0);

  return [
    `Pinned: ${String(pinned.length)} files (${String(pinnedTokens)} tokens)`,
    `Loaded: ${String(loaded.length)} files (${String(loadedTokens)} tokens)`,
    `Evicted: ${String(evicted.length)} files`,
    `Total active: ${String(pinnedTokens + loadedTokens)} tokens`,
  ].join('\n');
}
