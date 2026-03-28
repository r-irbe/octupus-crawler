// Context distillation — compress completed task context
// Implements: T-VMEM-009, T-VMEM-010, T-VMEM-011
// REQ-VMEM-001, REQ-VMEM-002, REQ-VMEM-003

import { estimateTokens } from './token-estimator.js';
import type { ModelFamily } from './token-estimator.js';

/** Distilled entry for a completed task (design.md §3). */
export type DistilledEntry = {
  readonly _tag: 'DistilledEntry';
  readonly taskId: string;
  readonly status: 'completed' | 'failed';
  readonly summary: string;
  readonly filesModified: readonly string[];
  readonly commitHash: string | undefined;
  readonly keyDecisions: readonly string[];
  readonly originalSize: number;
  readonly distilledSize: number;
};

/** Distillation metadata for tracking compression (REQ-VMEM-003). */
export type DistillationMetadata = {
  readonly originalSize: number;
  readonly distilledSize: number;
  readonly compressionRatio: number;
  readonly sourceTaskId: string;
  readonly timestamp: number;
};

/** Input for distillation — the full task context. */
export type TaskContext = {
  readonly taskId: string;
  readonly status: 'completed' | 'failed';
  readonly fullContext: string;
  readonly filesModified: readonly string[];
  readonly commitHash: string | undefined;
  readonly keyDecisions: readonly string[];
};

/**
 * Distill a completed task's context to essential facts (REQ-VMEM-001).
 * Extracts: task ID, status, summary, files, commit, decisions.
 * Target: ≥80% compression ratio.
 */
export function distillTaskContext(
  context: TaskContext,
  model: ModelFamily,
): DistilledEntry {
  const originalSize = estimateTokens(context.fullContext, model);

  // Build compact summary from structured data
  const summaryParts: string[] = [
    `Task ${context.taskId}: ${context.status}`,
  ];

  if (context.commitHash) {
    summaryParts.push(`Commit: ${context.commitHash}`);
  }

  if (context.keyDecisions.length > 0) {
    // Truncate each decision to 100 chars to enforce compression
    const truncated = context.keyDecisions.map((d) =>
      d.length > 100 ? `${d.slice(0, 97)}...` : d,
    );
    summaryParts.push(`Decisions: ${truncated.join('; ')}`);
  }

  if (context.filesModified.length > 0) {
    summaryParts.push(`Files: ${context.filesModified.join(', ')}`);
  }

  const summary = summaryParts.join('\n');
  const distilledSize = estimateTokens(summary, model);

  return {
    _tag: 'DistilledEntry',
    taskId: context.taskId,
    status: context.status,
    summary,
    filesModified: context.filesModified,
    commitHash: context.commitHash,
    keyDecisions: context.keyDecisions,
    originalSize,
    distilledSize,
  };
}

/**
 * Extract distillation metadata for tracking (REQ-VMEM-003).
 */
export function extractMetadata(entry: DistilledEntry): DistillationMetadata {
  const compressionRatio =
    entry.originalSize > 0
      ? 1 - entry.distilledSize / entry.originalSize
      : 0;

  return {
    originalSize: entry.originalSize,
    distilledSize: entry.distilledSize,
    compressionRatio: Math.round(compressionRatio * 100) / 100,
    sourceTaskId: entry.taskId,
    timestamp: Date.now(),
  };
}

/**
 * Format a distilled entry as markdown for state tracker storage.
 */
export function formatDistilledEntry(entry: DistilledEntry): string {
  const lines: string[] = [
    `## Distilled: ${entry.taskId}`,
    `- **Status**: ${entry.status}`,
  ];

  if (entry.commitHash) {
    lines.push(`- **Commit**: ${entry.commitHash}`);
  }

  if (entry.keyDecisions.length > 0) {
    lines.push(`- **Key decisions**:`);
    for (const decision of entry.keyDecisions) {
      lines.push(`  - ${decision}`);
    }
  }

  if (entry.filesModified.length > 0) {
    lines.push(`- **Files modified**: ${entry.filesModified.join(', ')}`);
  }

  lines.push(
    `- **Compression**: ${String(entry.originalSize)} → ${String(entry.distilledSize)} tokens ` +
      `(${String(Math.round((1 - entry.distilledSize / Math.max(1, entry.originalSize)) * 100))}%)`,

  );

  return lines.join('\n');
}
