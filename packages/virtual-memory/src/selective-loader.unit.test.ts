// Unit tests for selective-loader module
// Validates: T-TCH-010, REQ-TCH-011

import { describe, it, expect } from 'vitest';
import type { FileToLoad, LoadedFile } from './selective-loader.js';
import {
  selectiveLoad,
  filterTaskScoped,
  totalTokenCost,
  shouldLoadBySection,
} from './selective-loader.js';

const makeFile = (path: string, lineCount: number): FileToLoad => {
  const lines = Array.from({ length: lineCount }, (_, i) => `line ${String(i + 1)}`);
  return { path, content: lines.join('\n'), lineCount };
};

describe('selectiveLoad', () => {
  // Validates REQ-TCH-011: full load for small files
  it('loads full content when file is ≤200 lines', () => {
    const file = makeFile('small.ts', 100);
    const result = selectiveLoad(file, 'claude');

    expect(result._tag).toBe('LoadedFile');
    expect(result.isPartial).toBe(false);
    expect(result.lineRange).toBeUndefined();
    expect(result.content).toBe(file.content);
    expect(result.tokenCost).toBeGreaterThan(0);
  });

  // Validates REQ-TCH-011: partial load for large files
  it('loads first 200 lines when file is >200 lines and no section specified', () => {
    const file = makeFile('large.ts', 500);
    const result = selectiveLoad(file, 'claude');

    expect(result.isPartial).toBe(true);
    expect(result.lineRange).toEqual([1, 200]);
    const resultLines = result.content.split('\n');
    expect(resultLines).toHaveLength(200);
  });

  // Validates REQ-TCH-011: section-specific loading
  it('loads specified section range', () => {
    const file = makeFile('big.ts', 300);
    const result = selectiveLoad(file, 'claude', { startLine: 50, endLine: 100 });

    expect(result.isPartial).toBe(true);
    expect(result.lineRange).toEqual([50, 100]);
    const resultLines = result.content.split('\n');
    expect(resultLines).toHaveLength(51);
  });

  // Validates REQ-TCH-011: section on small file still triggers partial
  it('uses section on small file when explicitly provided', () => {
    const file = makeFile('small.ts', 50);
    const result = selectiveLoad(file, 'claude', { startLine: 10, endLine: 20 });

    expect(result.isPartial).toBe(true);
    expect(result.lineRange).toEqual([10, 20]);
  });
});

describe('filterTaskScoped', () => {
  // Validates REQ-TCH-011: filters to needed paths
  it('returns only files matching needed paths', () => {
    const all: FileToLoad[] = [
      makeFile('a.ts', 10),
      makeFile('b.ts', 10),
      makeFile('c.ts', 10),
    ];
    const result = filterTaskScoped(all, ['a.ts', 'c.ts']);

    expect(result).toHaveLength(2);
    expect(result.map((f) => f.path)).toEqual(['a.ts', 'c.ts']);
  });

  // Validates REQ-TCH-011: empty needed paths returns empty
  it('returns empty when no paths match', () => {
    const all: FileToLoad[] = [makeFile('x.ts', 10)];
    const result = filterTaskScoped(all, ['y.ts']);
    expect(result).toHaveLength(0);
  });
});

describe('totalTokenCost', () => {
  // Validates REQ-TCH-011: sums token costs
  it('sums token costs of loaded files', () => {
    const loaded: LoadedFile[] = [
      { _tag: 'LoadedFile', path: 'a.ts', content: '', tokenCost: 100, isPartial: false, lineRange: undefined },
      { _tag: 'LoadedFile', path: 'b.ts', content: '', tokenCost: 200, isPartial: true, lineRange: [1, 50] },
    ];
    expect(totalTokenCost(loaded)).toBe(300);
  });

  it('returns 0 for empty array', () => {
    expect(totalTokenCost([])).toBe(0);
  });
});

describe('shouldLoadBySection', () => {
  // Validates REQ-TCH-011: threshold at 200 lines
  it('returns false for ≤200 lines', () => {
    expect(shouldLoadBySection(200)).toBe(false);
    expect(shouldLoadBySection(100)).toBe(false);
  });

  it('returns true for >200 lines', () => {
    expect(shouldLoadBySection(201)).toBe(true);
    expect(shouldLoadBySection(500)).toBe(true);
  });
});
