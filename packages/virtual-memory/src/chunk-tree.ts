// Hierarchical chunk tree — organizes codebase into navigable hierarchy
// Implements: T-VMEM-006, T-VMEM-007, T-VMEM-008
// REQ-VMEM-004, REQ-VMEM-005, REQ-VMEM-006

/** Chunk levels in the hierarchy (design.md §2). */
export type ChunkLevel = 0 | 1 | 2 | 3 | 4;

/** A node in the hierarchical chunk tree. */
export type ChunkNode = {
  readonly _tag: 'ChunkNode';
  readonly path: string;
  readonly name: string;
  readonly level: ChunkLevel;
  readonly sizeChars: number;
  readonly children: readonly ChunkNode[];
};

/** Result of selective chunk loading (REQ-VMEM-005). */
export type LoadedChunk = {
  readonly node: ChunkNode;
  readonly parent: ChunkNode | undefined;
  readonly totalSizeChars: number;
};

/** File entry used to build the chunk tree. */
export type FileEntry = {
  readonly path: string;
  readonly sizeChars: number;
};

/**
 * Build a chunk tree from a flat list of file entries (REQ-VMEM-004).
 * Organizes: workspace root → package → feature → file.
 * Section-level (L4) chunking deferred to selective loading.
 */
export function buildChunkTree(files: readonly FileEntry[]): ChunkNode {
  const root: ChunkNode = {
    _tag: 'ChunkNode',
    path: '/',
    name: 'workspace',
    level: 0,
    sizeChars: 0,
    children: [],
  };

  const packageMap = new Map<string, FileEntry[]>();

  for (const file of files) {
    const parts = file.path.split('/').filter((p) => p.length > 0);
    const packageName = parts[0] ?? 'root';
    const existing = packageMap.get(packageName);
    if (existing) {
      existing.push(file);
    } else {
      packageMap.set(packageName, [file]);
    }
  }

  const packageNodes: ChunkNode[] = [];

  for (const [pkgName, pkgFiles] of packageMap) {
    const featureMap = new Map<string, FileEntry[]>();

    for (const file of pkgFiles) {
      const parts = file.path.split('/').filter((p) => p.length > 0);
      // Feature = second path segment (e.g., src/features/X or src/)
      const featureName = parts[1] ?? 'root';
      const existing = featureMap.get(featureName);
      if (existing) {
        existing.push(file);
      } else {
        featureMap.set(featureName, [file]);
      }
    }

    const featureNodes: ChunkNode[] = [];
    let pkgSize = 0;

    for (const [featName, featFiles] of featureMap) {
      const fileNodes: ChunkNode[] = featFiles.map((f) => ({
        _tag: 'ChunkNode' as const,
        path: f.path,
        name: f.path.split('/').pop() ?? f.path,
        level: 3 as ChunkLevel,
        sizeChars: f.sizeChars,
        children: [],
      }));

      const featSize = featFiles.reduce((sum, f) => sum + f.sizeChars, 0);
      pkgSize += featSize;

      featureNodes.push({
        _tag: 'ChunkNode',
        path: `${pkgName}/${featName}`,
        name: featName,
        level: 2,
        sizeChars: featSize,
        children: fileNodes,
      });
    }

    packageNodes.push({
      _tag: 'ChunkNode',
      path: pkgName,
      name: pkgName,
      level: 1,
      sizeChars: pkgSize,
      children: featureNodes,
    });
  }

  const totalSize = packageNodes.reduce((sum, p) => sum + p.sizeChars, 0);

  return {
    ...root,
    sizeChars: totalSize,
    children: packageNodes,
  };
}

/**
 * Find a node by path in the chunk tree.
 * Returns the node and its parent, or undefined if not found.
 */
export function findChunk(
  root: ChunkNode,
  targetPath: string,
): LoadedChunk | undefined {
  return findChunkRecursive(root, targetPath, undefined);
}

function findChunkRecursive(
  node: ChunkNode,
  targetPath: string,
  parent: ChunkNode | undefined,
): LoadedChunk | undefined {
  if (node.path === targetPath) {
    const parentSize = parent?.sizeChars ?? 0;
    // Only count directory listing size for parent, not full content
    const parentOverhead = parent ? Math.min(parentSize, 200) : 0;
    return {
      node,
      parent,
      totalSizeChars: node.sizeChars + parentOverhead,
    };
  }

  for (const child of node.children) {
    const result = findChunkRecursive(child, targetPath, node);
    if (result) {
      return result;
    }
  }

  return undefined;
}

/**
 * Calculate context reduction from selective loading vs loading all files.
 * Returns a ratio (0-1) where 0.3 means 30% reduction (REQ-VMEM-006).
 */
export function calculateReduction(
  loaded: LoadedChunk,
  totalWorkspaceChars: number,
): number {
  if (totalWorkspaceChars === 0) return 0;
  return 1 - loaded.totalSizeChars / totalWorkspaceChars;
}

/** Count total files in the tree (for >50 file threshold REQ-VMEM-004). */
export function countFiles(root: ChunkNode): number {
  if (root.level === 3) return 1;
  let count = 0;
  for (const child of root.children) {
    count += countFiles(child);
  }
  return count;
}
