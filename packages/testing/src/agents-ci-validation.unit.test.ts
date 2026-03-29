// TDD agent configuration + CI workflow validation
// Validates: T-AGENT-049, T-AGENT-050
// Validates: REQ-AGENT-025, REQ-AGENT-041

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..', '..', '..');

// --- T-AGENT-049: TDD Agent Configuration ---

describe('T-AGENT-049: TDD chat modes hand off correctly', () => {
  const agentsDir = resolve(ROOT, '.github/agents');

  // Validates REQ-AGENT-025: TDD Red agent exists with handoff
  it('TDD Red agent exists with handoff to Green', () => {
    const content = readFileSync(
      resolve(agentsDir, 'tdd-red.agent.md'),
      'utf-8',
    );
    expect(content).toContain('name: TDD Red Phase');
    expect(content).toContain('handoffs:');
    expect(content).toContain('TDD Green Phase');
  });

  // Validates REQ-AGENT-025: TDD Green agent exists with handoff
  it('TDD Green agent exists with handoff to Refactor', () => {
    const content = readFileSync(
      resolve(agentsDir, 'tdd-green.agent.md'),
      'utf-8',
    );
    expect(content).toContain('name: TDD Green Phase');
    expect(content).toContain('handoffs:');
    expect(content).toContain('TDD Refactor Phase');
  });

  // Validates REQ-AGENT-025: TDD Refactor agent exists
  it('TDD Refactor agent exists (terminal phase, no handoff)', () => {
    const content = readFileSync(
      resolve(agentsDir, 'tdd-refactor.agent.md'),
      'utf-8',
    );
    expect(content).toContain('name: TDD Refactor Phase');
    expect(content).not.toContain('handoffs:');
  });

  // Validates REQ-AGENT-025: handoff chain is sequential
  it('TDD handoff chain is sequential: Red → Green → Refactor', () => {
    const red = readFileSync(
      resolve(agentsDir, 'tdd-red.agent.md'),
      'utf-8',
    );
    const green = readFileSync(
      resolve(agentsDir, 'tdd-green.agent.md'),
      'utf-8',
    );

    // Red hands off to Green
    const redHandoff = /agent:\s*(.+)/m.exec(red);
    expect(redHandoff?.[1]?.trim()).toBe('TDD Green Phase');

    // Green hands off to Refactor
    const greenHandoff = /agent:\s*(.+)/m.exec(green);
    expect(greenHandoff?.[1]?.trim()).toBe('TDD Refactor Phase');
  });

  // Validates REQ-AGENT-025: each agent restricts its scope
  it('Red agent prohibits production code', () => {
    const red = readFileSync(
      resolve(agentsDir, 'tdd-red.agent.md'),
      'utf-8',
    );
    expect(red.toLowerCase()).toContain('do not implement');
  });
});

// --- T-AGENT-050: CI Workflow Validation ---

describe('T-AGENT-050: CI workflow triggers on work/* branches', () => {
  // Validates REQ-AGENT-041: agent-pr-validation.yml exists
  it('agent-pr-validation.yml workflow exists', () => {
    const path = resolve(
      ROOT,
      '.github/workflows/agent-pr-validation.yml',
    );
    expect(existsSync(path)).toBe(true);
  });

  // Validates REQ-AGENT-041: triggers on pull_request to main
  it('workflow triggers on pull_request to main', () => {
    const content = readFileSync(
      resolve(ROOT, '.github/workflows/agent-pr-validation.yml'),
      'utf-8',
    );
    expect(content).toContain('pull_request:');
    expect(content).toContain('branches: [main]');
  });

  // Validates REQ-AGENT-041: work/* branch filter in job
  it('guard-functions job filters for work/* branches', () => {
    const content = readFileSync(
      resolve(ROOT, '.github/workflows/agent-pr-validation.yml'),
      'utf-8',
    );
    expect(content).toContain("startsWith(github.head_ref, 'work/')");
  });

  // Validates REQ-AGENT-041: runs typecheck, lint, test
  it('workflow runs typecheck, lint, and test', () => {
    const content = readFileSync(
      resolve(ROOT, '.github/workflows/agent-pr-validation.yml'),
      'utf-8',
    );
    expect(content).toContain('pnpm turbo typecheck');
    expect(content).toContain('pnpm turbo lint');
    expect(content).toContain('pnpm turbo test');
  });

  // Validates REQ-AGENT-041: quality-gate workflow also exists
  it('quality-gate.yml workflow exists with main triggers', () => {
    const content = readFileSync(
      resolve(ROOT, '.github/workflows/quality-gate.yml'),
      'utf-8',
    );
    expect(content).toContain('push:');
    expect(content).toContain('branches: [main]');
  });
});
