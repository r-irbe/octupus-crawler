// Architecture compliance integration tests
// Run ESLint on the codebase and verify specific architectural rules produce zero violations
// Validates: T-ARCH-024 (REQ-ARCH-007), T-ARCH-025 (REQ-ARCH-001..005)

import { execSync } from 'node:child_process';
import path from 'node:path';
import { describe, it, expect } from 'vitest';

interface EslintMessage {
  readonly ruleId: string | null;
  readonly message: string;
  readonly line: number;
  readonly column: number;
}

interface EslintFileResult {
  readonly filePath: string;
  readonly messages: readonly EslintMessage[];
  readonly errorCount: number;
}

/**
 * Run ESLint with JSON output on a package's src/ directory.
 * Returns parsed ESLint results for rule-level analysis.
 */
function runEslintJson(packageDir: string): readonly EslintFileResult[] {
  try {
    const output = execSync('npx eslint --format json src/', {
      cwd: packageDir,
      encoding: 'utf-8',
      timeout: 30_000,
    });
    return JSON.parse(output) as readonly EslintFileResult[];
  } catch (error: unknown) {
    // ESLint exits 1 when finding errors — output is still in stdout
    if (
      typeof error === 'object' &&
      error !== null &&
      'stdout' in error &&
      typeof (error as { stdout: unknown }).stdout === 'string'
    ) {
      return JSON.parse(
        (error as { stdout: string }).stdout,
      ) as readonly EslintFileResult[];
    }
    throw error;
  }
}

function violationsForRule(
  results: readonly EslintFileResult[],
  ruleId: string,
): readonly { file: string; line: number; message: string }[] {
  return results.flatMap((file) =>
    file.messages
      .filter((msg) => msg.ruleId === ruleId)
      .map((msg) => ({
        file: path.basename(file.filePath),
        line: msg.line,
        message: msg.message,
      })),
  );
}

const CORE_DIR = path.resolve(import.meta.dirname, '..');
const CONFIG_DIR = path.resolve(import.meta.dirname, '../../config');

// Validates T-ARCH-024: Static analysis test verifying zero circular deps → REQ-ARCH-007
describe('T-ARCH-024: Circular dependency detection (REQ-ARCH-007)', () => {
  it('packages/core has zero circular dependencies', () => {
    const results = runEslintJson(CORE_DIR);
    const cycles = violationsForRule(results, 'import-x/no-cycle');
    expect(cycles, formatViolations('import-x/no-cycle', cycles)).toHaveLength(0);
  });

  it('packages/config has zero circular dependencies', () => {
    const results = runEslintJson(CONFIG_DIR);
    const cycles = violationsForRule(results, 'import-x/no-cycle');
    expect(cycles, formatViolations('import-x/no-cycle', cycles)).toHaveLength(0);
  });
});

// Validates T-ARCH-025: Static analysis test verifying layer boundary compliance → REQ-ARCH-001..005
describe('T-ARCH-025: Layer boundary compliance (REQ-ARCH-001..005)', () => {
  it('packages/core has zero layer boundary violations', () => {
    const results = runEslintJson(CORE_DIR);
    const violations = violationsForRule(results, 'import-x/no-restricted-paths');
    expect(violations, formatViolations('import-x/no-restricted-paths', violations)).toHaveLength(0);
  });

  it('packages/config has zero layer boundary violations', () => {
    const results = runEslintJson(CONFIG_DIR);
    const violations = violationsForRule(results, 'import-x/no-restricted-paths');
    expect(violations, formatViolations('import-x/no-restricted-paths', violations)).toHaveLength(0);
  });

  it('packages/core contracts contain zero runtime code', () => {
    const results = runEslintJson(CORE_DIR);
    // Filter for contracts-related violations only
    const contractViolations = results
      .filter((file) => file.filePath.includes('/contracts/'))
      .flatMap((file) =>
        file.messages
          .filter((msg) => msg.ruleId === 'no-restricted-syntax')
          .map((msg) => ({
            file: path.basename(file.filePath),
            line: msg.line,
            message: msg.message,
          })),
      );
    expect(
      contractViolations,
      formatViolations('no-restricted-syntax (contracts)', contractViolations),
    ).toHaveLength(0);
  });
});

function formatViolations(
  rule: string,
  violations: readonly { file: string; line: number; message: string }[],
): string {
  if (violations.length === 0) return '';
  const lines = violations.map(
    (v) => `  ${v.file}:${String(v.line)} — ${v.message}`,
  );
  return `${rule} violations found:\n${lines.join('\n')}`;
}
