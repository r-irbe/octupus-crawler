// Unit tests for state-tracker module
// Validates: T-TCH-011, REQ-TCH-012

import { describe, it, expect } from 'vitest';
import { stateTrackerPath, parseStateTracker, formatUpdate } from './state-tracker.js';

describe('stateTrackerPath', () => {
  // Validates REQ-TCH-012: path generation
  it('generates correct path from slug and date', () => {
    const date = new Date(2026, 2, 29); // March 29, 2026
    const result = stateTrackerPath('my-task', date);
    expect(result).toBe('docs/memory/session/2026-03-29-my-task-state.md');
  });

  it('zero-pads single-digit month and day', () => {
    const date = new Date(2026, 0, 5); // January 5, 2026
    const result = stateTrackerPath('fix', date);
    expect(result).toBe('docs/memory/session/2026-01-05-fix-state.md');
  });
});

describe('parseStateTracker', () => {
  // Validates REQ-TCH-012: empty content returns error
  it('returns ParseError for empty content', () => {
    const result = parseStateTracker('test.md', '');
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe('ParseError');
      if (result.error._tag === 'ParseError') {
        expect(result.error.message).toContain('Empty');
      }
    }
  });

  // Validates REQ-TCH-012: parses current state section
  it('parses Current State section', () => {
    const content = [
      '# State Tracker',
      '',
      '## Current State',
      'Working on task 1',
      '',
      '## Decisions',
      '- Use neverthrow',
    ].join('\n');

    const result = parseStateTracker('tracker.md', content);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value._tag).toBe('StateTrackerData');
      expect(result.value.currentState).toBe('Working on task 1');
      expect(result.value.decisions).toEqual(['Use neverthrow']);
    }
  });

  // Validates REQ-TCH-012: parses task entries with checkboxes
  it('parses task entries', () => {
    const content = [
      '# Tracker',
      '',
      '## Tasks',
      '- [x] **T-001** Task one',
      '  **Commit**: abc123',
      '- [ ] **T-002** Task two',
    ].join('\n');

    const result = parseStateTracker('t.md', content);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.tasks).toHaveLength(2);
      expect(result.value.tasks[0]?.id).toBe('T-001');
      expect(result.value.tasks[0]?.status).toBe('completed');
      expect(result.value.tasks[0]?.commitHash).toBe('abc123');
      expect(result.value.tasks[1]?.id).toBe('T-002');
      expect(result.value.tasks[1]?.status).toBe('not-started');
    }
  });

  // Validates REQ-TCH-012: parses distilled sections
  it('extracts distilled sections', () => {
    const content = [
      '# Tracker',
      '',
      '## Distilled: Task A',
      'Summary of task A',
      '',
      '## Distilled: Task B',
      'Summary of task B',
    ].join('\n');

    const result = parseStateTracker('t.md', content);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.distilledTasks).toHaveLength(2);
      expect(result.value.distilledTasks[0]).toContain('Task A');
    }
  });

  // Validates REQ-TCH-012: preserves raw content
  it('preserves rawContent', () => {
    const content = '## Current State\nSome state';
    const result = parseStateTracker('t.md', content);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.rawContent).toBe(content);
    }
  });
});

describe('formatUpdate', () => {
  // Validates REQ-TCH-012: formats a completed task update
  it('formats completed task with commit and decisions', () => {
    const formatted = formatUpdate({
      taskId: 'T-001',
      status: 'completed',
      commitHash: 'abc123',
      keyDecisions: ['Used neverthrow'],
      persistentContext: 'Important note',
    });

    expect(formatted).toContain('### T-001: completed');
    expect(formatted).toContain('**Commit**: abc123');
    expect(formatted).toContain('**Decision**: Used neverthrow');
    expect(formatted).toContain('**Context**: Important note');
  });

  // Validates REQ-TCH-012: formats minimal update
  it('formats minimal update without optional fields', () => {
    const formatted = formatUpdate({
      taskId: 'T-002',
      status: 'failed',
      commitHash: undefined,
      keyDecisions: [],
      persistentContext: undefined,
    });

    expect(formatted).toContain('### T-002: failed');
    expect(formatted).not.toContain('**Commit**');
    expect(formatted).not.toContain('**Context**');
  });
});
