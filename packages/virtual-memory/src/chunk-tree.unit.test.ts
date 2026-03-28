// Unit tests for chunk tree
// Validates: T-VMEM-027 → REQ-VMEM-004, T-VMEM-028 → REQ-VMEM-005

import { describe, it, expect } from 'vitest';
import {
  buildChunkTree,
  findChunk,
  calculateReduction,
  countFiles,
} from './chunk-tree.js';
import type { FileEntry } from './chunk-tree.js';

describe('chunk-tree', () => {
  function makeFiles(count: number, pkgCount = 3): FileEntry[] {
    const files: FileEntry[] = [];
    for (let i = 0; i < count; i++) {
      const pkg = `pkg${String(i % pkgCount)}`;
      const feature = `feat${String(Math.floor(i / pkgCount) % 5)}`;
      files.push({
        path: `${pkg}/${feature}/file${String(i)}.ts`,
        sizeChars: 500 + i * 10,
      });
    }
    return files;
  }

  // T-VMEM-027: Chunk tree generation for >50 files (REQ-VMEM-004)
  describe('buildChunkTree', () => {
    it('builds tree with package → feature → file hierarchy', () => {
      const files = makeFiles(60);
      const tree = buildChunkTree(files);

      expect(tree.level).toBe(0);
      expect(tree.name).toBe('workspace');
      expect(tree.children.length).toBeGreaterThan(0);

      // Check L1 packages exist
      const pkg0 = tree.children.find((c) => c.name === 'pkg0');
      expect(pkg0).toBeDefined();
      expect(pkg0!.level).toBe(1);

      // Check L2 features exist
      expect(pkg0!.children.length).toBeGreaterThan(0);
      const firstFeature = pkg0!.children[0];
      expect(firstFeature).toBeDefined();
      expect(firstFeature!.level).toBe(2);

      // Check L3 files exist
      expect(firstFeature!.children.length).toBeGreaterThan(0);
      expect(firstFeature!.children[0]!.level).toBe(3);
    });

    it('counts >50 files correctly', () => {
      const files = makeFiles(60);
      const tree = buildChunkTree(files);
      expect(countFiles(tree)).toBe(60);
    });

    it('sums sizes up the hierarchy', () => {
      const files: FileEntry[] = [
        { path: 'pkg/feat/a.ts', sizeChars: 100 },
        { path: 'pkg/feat/b.ts', sizeChars: 200 },
      ];
      const tree = buildChunkTree(files);
      expect(tree.sizeChars).toBe(300);
    });

    it('handles empty file list', () => {
      const tree = buildChunkTree([]);
      expect(tree.children).toHaveLength(0);
      expect(tree.sizeChars).toBe(0);
    });
  });

  // T-VMEM-028: Selective chunk loading — only chunk + parent (REQ-VMEM-005)
  describe('findChunk', () => {
    it('returns chunk with its parent', () => {
      const files: FileEntry[] = [
        { path: 'pkg/feat/a.ts', sizeChars: 1000 },
        { path: 'pkg/feat/b.ts', sizeChars: 2000 },
        { path: 'other/src/c.ts', sizeChars: 3000 },
      ];
      const tree = buildChunkTree(files);

      const result = findChunk(tree, 'pkg/feat/a.ts');
      expect(result).toBeDefined();
      expect(result!.node.path).toBe('pkg/feat/a.ts');
      expect(result!.parent).toBeDefined();
      expect(result!.parent!.name).toBe('feat');
    });

    it('loads only chunk + parent overhead, not entire workspace', () => {
      const files = makeFiles(60);
      const tree = buildChunkTree(files);
      const totalSize = tree.sizeChars;

      const result = findChunk(tree, files[0]!.path);
      expect(result).toBeDefined();
      expect(result!.totalSizeChars).toBeLessThan(totalSize);
    });

    it('returns undefined for missing path', () => {
      const files: FileEntry[] = [
        { path: 'pkg/feat/a.ts', sizeChars: 100 },
      ];
      const tree = buildChunkTree(files);
      expect(findChunk(tree, 'nonexistent')).toBeUndefined();
    });
  });

  describe('calculateReduction', () => {
    it('calculates context reduction ratio', () => {
      const files = makeFiles(60);
      const tree = buildChunkTree(files);
      const chunk = findChunk(tree, files[0]!.path);
      expect(chunk).toBeDefined();

      const reduction = calculateReduction(chunk!, tree.sizeChars);
      // Loading one file from 60 should yield significant reduction
      expect(reduction).toBeGreaterThan(0.3);
    });

    it('returns 0 for empty workspace', () => {
      const chunk = {
        node: { _tag: 'ChunkNode' as const, path: 'x', name: 'x', level: 3 as const, sizeChars: 0, children: [] },
        parent: undefined,
        totalSizeChars: 0,
      };
      expect(calculateReduction(chunk, 0)).toBe(0);
    });
  });
});
