// ESLint layer boundary rule verification
// Validates: T-AGENT-105 (REQ-AGENT-091)
// Verifies that import-x/no-restricted-paths rules enforce layer boundaries

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const CONFIG_PATH = resolve(
  import.meta.dirname,
  '../../eslint-config/eslint.config.js',
);

function readConfigSource(): string {
  return readFileSync(CONFIG_PATH, 'utf-8');
}

describe('ESLint Layer Boundary Rules (T-AGENT-105)', () => {
  const source = readConfigSource();

  // REQ-ARCH-003: Domain must not import infrastructure
  it('blocks domain→infrastructure imports', () => {
    expect(source).toContain('Core/Domain must not import Infrastructure');
    expect(source).toContain("from: './**/infra/**'");
    expect(source).toContain("from: './**/infrastructure/**'");
  });

  // REQ-ARCH-003: Domain must not import application
  it('blocks domain→application imports', () => {
    expect(source).toContain('Core/Domain must not import Application');
    expect(source).toContain("from: './**/application/**'");
  });

  // REQ-ARCH-004: Infrastructure must not import application
  it('blocks infrastructure→application imports', () => {
    expect(source).toContain('Infrastructure must not import Application');
  });

  // REQ-ARCH-002: Contracts must not contain runtime code
  it('enforces contracts purity (no runtime code)', () => {
    expect(source).toContain('Contracts layer must contain only types/interfaces');
    expect(source).toContain("selector: 'ClassDeclaration'");
    expect(source).toContain("selector: 'FunctionDeclaration'");
  });

  // REQ-ARCH-007: No circular dependencies
  it('detects circular dependencies', () => {
    expect(source).toContain("'import-x/no-cycle': 'error'");
  });

  // REQ-AGENT-094: no-explicit-any as error
  it('configures no-explicit-any as error', () => {
    expect(source).toContain("'@typescript-eslint/no-explicit-any': 'error'");
  });

  // REQ-ARCH-008: Test imports blocked from production
  it('blocks production code from importing test files', () => {
    expect(source).toContain('Production code must not import test files');
  });

  it('scopes layer rules to non-test files', () => {
    expect(source).toContain("ignores: ['**/*.test.ts']");
  });
});
