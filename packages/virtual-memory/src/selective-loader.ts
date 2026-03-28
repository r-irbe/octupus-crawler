// Selective loading — task-scoped context loading
// Implements: T-VMEM-015, T-VMEM-016, T-VMEM-017
// REQ-VMEM-010, REQ-VMEM-011, REQ-VMEM-012

import type { ModelFamily } from './token-estimator.js';
import { estimateTokens } from './token-estimator.js';

/** Maximum lines before section-level loading is preferred (REQ-VMEM-011). */
const SECTION_LOADING_THRESHOLD = 200;

/** A file to be selectively loaded. */
export type FileToLoad = {
  readonly path: string;
  readonly content: string;
  readonly lineCount: number;
};

/** Result of selective loading — content + token cost. */
export type LoadedFile = {
  readonly _tag: 'LoadedFile';
  readonly path: string;
  readonly content: string;
  readonly tokenCost: number;
  readonly isPartial: boolean;
  readonly lineRange: readonly [number, number] | undefined;
};

/** Section range within a file. */
export type SectionRange = {
  readonly startLine: number;
  readonly endLine: number;
};

/**
 * Load a file selectively based on size (REQ-VMEM-010, REQ-VMEM-011).
 * Files ≤200 lines: load full content.
 * Files >200 lines: load only the specified section, or first 200 lines as default.
 */
export function selectiveLoad(
  file: FileToLoad,
  model: ModelFamily,
  section?: SectionRange,
): LoadedFile {
  if (file.lineCount <= SECTION_LOADING_THRESHOLD && !section) {
    return {
      _tag: 'LoadedFile',
      path: file.path,
      content: file.content,
      tokenCost: estimateTokens(file.content, model),
      isPartial: false,
      lineRange: undefined,
    };
  }

  const lines = file.content.split('\n');
  const start = section ? Math.max(0, section.startLine - 1) : 0;
  const end = section
    ? Math.min(lines.length, section.endLine)
    : Math.min(lines.length, SECTION_LOADING_THRESHOLD);

  const selectedLines = lines.slice(start, end);
  const content = selectedLines.join('\n');

  return {
    _tag: 'LoadedFile',
    path: file.path,
    content,
    tokenCost: estimateTokens(content, model),
    isPartial: true,
    lineRange: [start + 1, end],
  };
}

/**
 * Filter to only task-scoped files (REQ-VMEM-010).
 * Returns only files that match the needed paths.
 */
export function filterTaskScoped(
  allFiles: readonly FileToLoad[],
  neededPaths: readonly string[],
): readonly FileToLoad[] {
  const needed = new Set(neededPaths);
  return allFiles.filter((f) => needed.has(f.path));
}

/**
 * Calculate total token cost of loaded files.
 */
export function totalTokenCost(loaded: readonly LoadedFile[]): number {
  return loaded.reduce((sum, f) => sum + f.tokenCost, 0);
}

/**
 * Check if a file should use section-level loading (REQ-VMEM-011).
 */
export function shouldLoadBySection(lineCount: number): boolean {
  return lineCount > SECTION_LOADING_THRESHOLD;
}
