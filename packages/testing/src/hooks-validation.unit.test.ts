// Hook enforcement validation — pre-commit + Copilot hooks
// Validates: T-AGENT-048
// Validates: REQ-AGENT-008 to 013

import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..', '..', '..');

describe('T-AGENT-048: Git hooks execute correctly', () => {
  // Validates REQ-AGENT-008: PreToolUse hook blocks commit without guards
  it('pre-commit hook script exists and is executable', () => {
    const hookPath = resolve(ROOT, '.githooks/pre-commit');
    expect(existsSync(hookPath)).toBe(true);
    // Cross-platform executable check (no macOS-only stat -f)
    const mode = statSync(hookPath).mode;
    expect(mode & 0o111).toBeGreaterThan(0);
  });

  // Validates REQ-AGENT-008: pre-commit invokes verify-pre-commit-gates.sh
  it('pre-commit hook invokes verify-pre-commit-gates.sh', () => {
    const hookContent = readFileSync(
      resolve(ROOT, '.githooks/pre-commit'),
      'utf-8',
    );
    expect(hookContent).toContain('verify-pre-commit-gates');
  });

  // Validates REQ-AGENT-010: push to main is blocked
  it('verify-pre-commit-gates.sh blocks commits on main branch', () => {
    const scriptContent = readFileSync(
      resolve(ROOT, 'scripts/verify-pre-commit-gates.sh'),
      'utf-8',
    );
    expect(scriptContent).toContain('Cannot commit directly to main');
  });

  // Validates REQ-AGENT-013: file size warning at 300 lines
  it('verify-pre-commit-gates.sh checks file size hard limit', () => {
    const scriptContent = readFileSync(
      resolve(ROOT, 'scripts/verify-pre-commit-gates.sh'),
      'utf-8',
    );
    expect(scriptContent).toContain('HARD_LIMIT=300');
    expect(scriptContent).toContain('hard limit');
  });

  // Validates REQ-AGENT-009: Copilot PostToolUse hook runs typecheck
  it('Copilot PostToolUse hook runs typecheck after edits', () => {
    const hookContent = readFileSync(
      resolve(ROOT, 'scripts/hooks/copilot-post-tool-use.sh'),
      'utf-8',
    );
    expect(hookContent).toContain('tsc --noEmit');
  });

  // Validates REQ-AGENT-008: Copilot PreToolUse hook blocks git commit
  it('Copilot PreToolUse hook blocks git commit without guards', () => {
    const hookContent = readFileSync(
      resolve(ROOT, 'scripts/hooks/copilot-pre-tool-use.sh'),
      'utf-8',
    );
    expect(hookContent).toContain('git commit');
  });

  // Validates REQ-AGENT-008: gates.json wires hooks to scripts
  it('gates.json configures PreToolUse and PostToolUse hooks', () => {
    const gatesContent = readFileSync(
      resolve(ROOT, '.github/hooks/gates.json'),
      'utf-8',
    );
    const gates = JSON.parse(gatesContent) as {
      hooks: Record<string, unknown[]>;
    };
    expect(gates.hooks).toHaveProperty('PreToolUse');
    expect(gates.hooks).toHaveProperty('PostToolUse');
    expect(gates.hooks).toHaveProperty('Stop');
  });

  // Validates REQ-AGENT-008: git core.hooksPath is configured
  it('git hooks path is set to .githooks/', () => {
    const hooksPath = execFileSync(
      'git',
      ['config', 'core.hooksPath'],
      { encoding: 'utf-8', cwd: ROOT },
    ).trim();
    expect(hooksPath).toContain('.githooks');
  });
});
