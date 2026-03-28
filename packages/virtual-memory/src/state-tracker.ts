// State tracker integration — working memory protocol
// Implements: T-VMEM-012, T-VMEM-013, T-VMEM-014
// REQ-VMEM-007, REQ-VMEM-008, REQ-VMEM-009

import { ok, err } from 'neverthrow';
import type { Result } from 'neverthrow';

/** Error types for state tracker operations. */
export type StateTrackerError =
  | { readonly _tag: 'NotFound'; readonly path: string }
  | { readonly _tag: 'ParseError'; readonly message: string }
  | { readonly _tag: 'WriteError'; readonly message: string };

/** Parsed state tracker content. */
export type StateTrackerData = {
  readonly _tag: 'StateTrackerData';
  readonly path: string;
  readonly currentState: string;
  readonly tasks: readonly TaskEntry[];
  readonly decisions: readonly string[];
  readonly distilledTasks: readonly string[];
  readonly rawContent: string;
};

/** A task entry from the state tracker. */
export type TaskEntry = {
  readonly id: string;
  readonly status: 'not-started' | 'in-progress' | 'completed' | 'failed';
  readonly commitHash: string | undefined;
  readonly notes: string | undefined;
};

/** Update to apply to the state tracker. */
export type StateTrackerUpdate = {
  readonly taskId: string;
  readonly status: 'completed' | 'failed';
  readonly commitHash: string | undefined;
  readonly keyDecisions: readonly string[];
  readonly persistentContext: string | undefined;
};

/**
 * Generate a state tracker file path from slug and date.
 * Format: docs/memory/session/YYYY-MM-DD-<slug>-state.md (G4).
 */
export function stateTrackerPath(slug: string, date: Date): string {
  const yyyy = date.getFullYear().toString();
  const mm = (date.getMonth() + 1).toString().padStart(2, '0');
  const dd = date.getDate().toString().padStart(2, '0');
  return `docs/memory/session/${yyyy}-${mm}-${dd}-${slug}-state.md`;
}

/**
 * Parse a state tracker markdown file into structured data (REQ-VMEM-008).
 * Extracts current state, tasks, decisions, and distilled sections.
 */
export function parseStateTracker(
  path: string,
  content: string,
): Result<StateTrackerData, StateTrackerError> {
  if (content.trim().length === 0) {
    return err({ _tag: 'ParseError', message: 'Empty state tracker' });
  }

  const currentState = extractSection(content, 'Current State');
  const tasks = parseTaskEntries(content);
  const decisions = extractBulletList(content, 'Decisions');
  const distilledTasks = extractDistilledSections(content);

  return ok({
    _tag: 'StateTrackerData',
    path,
    currentState: currentState ?? '',
    tasks,
    decisions,
    distilledTasks,
    rawContent: content,
  });
}

/**
 * Format a state tracker update as markdown to append (REQ-VMEM-009).
 */
export function formatUpdate(update: StateTrackerUpdate): string {
  const lines: string[] = [
    `### ${update.taskId}: ${update.status}`,
  ];

  if (update.commitHash) {
    lines.push(`- **Commit**: ${update.commitHash}`);
  }

  for (const decision of update.keyDecisions) {
    lines.push(`- **Decision**: ${decision}`);
  }

  if (update.persistentContext) {
    lines.push(`- **Context**: ${update.persistentContext}`);
  }

  return lines.join('\n');
}

// --- Internal helpers ---

function extractSection(
  content: string,
  heading: string,
): string | undefined {
  const pattern = new RegExp(
    `^##\\s+${escapeRegex(heading)}\\s*$`,
    'm',
  );
  const match = pattern.exec(content);
  if (!match) return undefined;

  const start = match.index + match[0].length;
  const nextHeading = content.indexOf('\n## ', start);
  const end = nextHeading === -1 ? content.length : nextHeading;
  return content.slice(start, end).trim();
}

function extractBulletList(
  content: string,
  heading: string,
): readonly string[] {
  const section = extractSection(content, heading);
  if (!section) return [];

  return section
    .split('\n')
    .filter((line) => line.startsWith('- '))
    .map((line) => line.slice(2).trim());
}

function extractDistilledSections(content: string): readonly string[] {
  const sections: string[] = [];
  const pattern = /^## Distilled: .+$/gm;
  let match = pattern.exec(content);

  while (match) {
    const start = match.index;
    const nextHeading = content.indexOf('\n## ', start + match[0].length);
    const end = nextHeading === -1 ? content.length : nextHeading;
    sections.push(content.slice(start, end).trim());
    match = pattern.exec(content);
  }

  return sections;
}

function parseTaskEntries(content: string): readonly TaskEntry[] {
  const entries: TaskEntry[] = [];
  // Match patterns like: - [x] **T-VMEM-001**: ... or ### T-VMEM-001: completed
  const pattern = /^-\s+\[([ xX])\]\s+\*\*([^*]+)\*\*/gm;
  let match = pattern.exec(content);

  while (match) {
    const checkbox = match[1];
    const id = match[2] ?? '';
    entries.push({
      id: id.trim(),
      status: checkbox === ' ' ? 'not-started' : 'completed',
      commitHash: undefined,
      notes: undefined,
    });
    match = pattern.exec(content);
  }

  return entries;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
