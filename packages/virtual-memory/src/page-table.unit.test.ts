// Unit tests for page-table module
// Validates: T-TCH-009, REQ-TCH-010

import { describe, it, expect } from 'vitest';
import type { PageFaultEvent } from './eviction-controller.js';
import type { PageEntry } from './eviction-controller.js';
import { createPageTable, estimateReloadCost, summarizePages } from './page-table.js';

describe('createPageTable', () => {
  // Validates REQ-TCH-010: logLoad records entry
  it('logLoad adds an entry with action "load"', () => {
    const pt = createPageTable();
    pt.logLoad('file.ts', 120);

    const log = pt.auditLog();
    expect(log).toHaveLength(1);
    expect(log[0]?._tag).toBe('PageTableLogEntry');
    expect(log[0]?.action).toBe('load');
    expect(log[0]?.path).toBe('file.ts');
    expect(log[0]?.sizeTokens).toBe(120);
    expect(log[0]?.detail).toContain('Loaded');
  });

  // Validates REQ-TCH-010: logEviction records entry
  it('logEviction adds an entry with action "evict"', () => {
    const pt = createPageTable();
    pt.logEviction('old.ts', 80, 'over budget');

    const log = pt.auditLog();
    expect(log).toHaveLength(1);
    expect(log[0]?.action).toBe('evict');
    expect(log[0]?.detail).toContain('over budget');
  });

  // Validates REQ-TCH-010: logPageFault records page fault event
  it('logPageFault adds an entry with action "fault"', () => {
    const fault: PageFaultEvent = {
      _tag: 'PageFaultEvent',
      path: 'missing.ts',
      reason: 'not in cache',
      reloadCostTokens: 200,
      timestamp: Date.now(),
    };
    const pt = createPageTable();
    pt.logPageFault(fault);

    const log = pt.auditLog();
    expect(log).toHaveLength(1);
    expect(log[0]?.action).toBe('fault');
    expect(log[0]?.path).toBe('missing.ts');
    expect(log[0]?.sizeTokens).toBe(200);
  });

  // Validates REQ-TCH-010: logPin records pin
  it('logPin adds an entry with action "pin"', () => {
    const pt = createPageTable();
    pt.logPin('critical.ts', 50);

    const log = pt.auditLog();
    expect(log).toHaveLength(1);
    expect(log[0]?.action).toBe('pin');
    expect(log[0]?.detail).toContain('Pinned');
  });

  // Validates REQ-TCH-010: auditLog returns immutable snapshot
  it('auditLog returns a copy (not the internal array)', () => {
    const pt = createPageTable();
    pt.logLoad('a.ts', 10);
    const firstLog = pt.auditLog();
    pt.logLoad('b.ts', 20);
    const secondLog = pt.auditLog();

    expect(firstLog).toHaveLength(1);
    expect(secondLog).toHaveLength(2);
  });

  // Validates REQ-TCH-010: formatLog produces markdown
  it('formatLog returns "No events recorded" when empty', () => {
    const pt = createPageTable();
    const formatted = pt.formatLog();
    expect(formatted).toContain('No events recorded');
  });

  it('formatLog produces markdown with entries', () => {
    const pt = createPageTable();
    pt.logLoad('src/main.ts', 300);

    const formatted = pt.formatLog();
    expect(formatted).toContain('## Context Events');
    expect(formatted).toContain('[load]');
    expect(formatted).toContain('src/main.ts');
  });
});

describe('estimateReloadCost', () => {
  // Validates REQ-TCH-010: delegates to estimateTokens
  it('returns a positive number for non-empty content', () => {
    const cost = estimateReloadCost('const x = 1;\nconst y = 2;', 'claude');
    expect(cost).toBeGreaterThan(0);
  });

  it('returns 0 for empty content', () => {
    const cost = estimateReloadCost('', 'claude');
    expect(cost).toBe(0);
  });
});

describe('summarizePages', () => {
  const makeEntry = (
    path: string,
    status: 'pinned' | 'loaded' | 'evicted',
    sizeTokens: number,
  ): PageEntry => ({
    _tag: 'PageEntry',
    path,
    status,
    priority: 0,
    backingStore: 'disk',
    lastAccessed: Date.now(),
    sizeTokens,
  });

  // Validates REQ-TCH-010: summary counts
  it('summarizes pinned, loaded, and evicted counts', () => {
    const entries = [
      makeEntry('a.ts', 'pinned', 100),
      makeEntry('b.ts', 'loaded', 200),
      makeEntry('c.ts', 'evicted', 50),
    ];

    const summary = summarizePages(entries);
    expect(summary).toContain('Pinned: 1 files (100 tokens)');
    expect(summary).toContain('Loaded: 1 files (200 tokens)');
    expect(summary).toContain('Evicted: 1 files');
    expect(summary).toContain('Total active: 300 tokens');
  });

  // Validates REQ-TCH-010: empty entries
  it('summarizes empty entry list', () => {
    const summary = summarizePages([]);
    expect(summary).toContain('Pinned: 0 files (0 tokens)');
    expect(summary).toContain('Total active: 0 tokens');
  });
});
