// Unit tests for context distillation
// Validates: T-VMEM-029 → REQ-VMEM-001, T-VMEM-030 → REQ-VMEM-002, T-VMEM-031 → REQ-VMEM-003

import { describe, it, expect } from 'vitest';
import {
  distillTaskContext,
  extractMetadata,
  formatDistilledEntry,
} from './context-distiller.js';
import type { TaskContext } from './context-distiller.js';

describe('context-distiller', () => {
  const largeContext: TaskContext = {
    taskId: 'T-VMEM-001',
    status: 'completed',
    fullContext: 'x'.repeat(10_000), // ~2857 Claude tokens
    filesModified: ['src/budget.ts', 'src/tracker.ts'],
    commitHash: 'abc1234',
    keyDecisions: [
      'Use token estimation instead of exact tokenization for performance',
      'Effective window set to 50% per NoLiMa findings',
    ],
  };

  // T-VMEM-029: Compression ratio ≥80% (REQ-VMEM-001)
  describe('compression', () => {
    it('achieves ≥80% compression on large contexts', () => {
      const entry = distillTaskContext(largeContext, 'claude');
      const ratio = 1 - entry.distilledSize / entry.originalSize;
      expect(ratio).toBeGreaterThanOrEqual(0.8);
    });

    it('distills to essential facts', () => {
      const entry = distillTaskContext(largeContext, 'claude');
      expect(entry.summary).toContain('T-VMEM-001');
      expect(entry.summary).toContain('completed');
      expect(entry.summary).toContain('abc1234');
    });

    it('preserves key decisions', () => {
      const entry = distillTaskContext(largeContext, 'claude');
      expect(entry.keyDecisions).toHaveLength(2);
      expect(entry.keyDecisions[0]).toContain('token estimation');
    });

    it('preserves file paths', () => {
      const entry = distillTaskContext(largeContext, 'claude');
      expect(entry.filesModified).toContain('src/budget.ts');
    });
  });

  // T-VMEM-030: Accuracy ≥95% — distilled contains all critical info (REQ-VMEM-002)
  describe('accuracy', () => {
    it('retains task ID in distilled output', () => {
      const entry = distillTaskContext(largeContext, 'claude');
      expect(entry.taskId).toBe('T-VMEM-001');
    });

    it('retains status', () => {
      const entry = distillTaskContext(largeContext, 'claude');
      expect(entry.status).toBe('completed');
    });

    it('retains commit hash', () => {
      const entry = distillTaskContext(largeContext, 'claude');
      expect(entry.commitHash).toBe('abc1234');
    });

    it('retains all key decisions', () => {
      const entry = distillTaskContext(largeContext, 'claude');
      expect(entry.keyDecisions).toEqual(largeContext.keyDecisions);
    });

    it('retains all file paths', () => {
      const entry = distillTaskContext(largeContext, 'claude');
      expect(entry.filesModified).toEqual(largeContext.filesModified);
    });

    it('handles failed task context', () => {
      const failed: TaskContext = {
        ...largeContext,
        status: 'failed',
        commitHash: undefined,
      };
      const entry = distillTaskContext(failed, 'claude');
      expect(entry.status).toBe('failed');
      expect(entry.commitHash).toBeUndefined();
    });
  });

  // T-VMEM-031: Distillation metadata recording (REQ-VMEM-003)
  describe('metadata', () => {
    it('records original and distilled size', () => {
      const entry = distillTaskContext(largeContext, 'claude');
      const meta = extractMetadata(entry);

      expect(meta.originalSize).toBeGreaterThan(0);
      expect(meta.distilledSize).toBeGreaterThan(0);
      expect(meta.distilledSize).toBeLessThan(meta.originalSize);
    });

    it('records compression ratio', () => {
      const entry = distillTaskContext(largeContext, 'claude');
      const meta = extractMetadata(entry);

      expect(meta.compressionRatio).toBeGreaterThanOrEqual(0.8);
      expect(meta.compressionRatio).toBeLessThanOrEqual(1);
    });

    it('records source task ID', () => {
      const entry = distillTaskContext(largeContext, 'claude');
      const meta = extractMetadata(entry);
      expect(meta.sourceTaskId).toBe('T-VMEM-001');
    });

    it('records timestamp', () => {
      const entry = distillTaskContext(largeContext, 'claude');
      const meta = extractMetadata(entry);
      expect(meta.timestamp).toBeGreaterThan(0);
    });
  });

  describe('formatDistilledEntry', () => {
    it('formats as markdown', () => {
      const entry = distillTaskContext(largeContext, 'claude');
      const md = formatDistilledEntry(entry);

      expect(md).toContain('## Distilled: T-VMEM-001');
      expect(md).toContain('**Status**: completed');
      expect(md).toContain('**Commit**: abc1234');
      expect(md).toContain('**Key decisions**');
      expect(md).toContain('**Files modified**');
      expect(md).toContain('**Compression**');
    });
  });
});
