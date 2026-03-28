// OTel first-import ESLint rule verification tests
// Validates: T-AGENT-106 (REQ-AGENT-092)
// Verifies the custom rule catches violations and accepts valid patterns

import { describe, it, expect } from 'vitest';
import { Linter } from 'eslint';
import { otelFirstImport } from '../../eslint-config/rules/otel-first-import.js';

function lintCode(code: string): Linter.LintMessage[] {
  const linter = new Linter({ configType: 'flat' });
  return linter.verify(code, [
    {
      plugins: {
        '@ipf': { rules: { 'otel-first-import': otelFirstImport } },
      },
      rules: { '@ipf/otel-first-import': 'error' },
      languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
    },
  ]);
}

describe('otel-first-import rule (T-AGENT-106)', () => {
  // --- Valid cases: should produce zero errors ---

  it('accepts ./otel as first import (side-effect)', () => {
    const msgs = lintCode(`import './otel';\nimport { createServer } from './server.js';`);
    expect(msgs).toHaveLength(0);
  });

  it('accepts ./otel with named exports as first import', () => {
    const msgs = lintCode(`import { initOtel } from './otel';\nimport { startWorker } from './worker.js';`);
    expect(msgs).toHaveLength(0);
  });

  it('accepts single ./otel import with no other imports', () => {
    const msgs = lintCode(`import './otel';`);
    expect(msgs).toHaveLength(0);
  });

  // --- Invalid cases: should report errors ---

  it('rejects when ./otel is not the first import', () => {
    const msgs = lintCode(`import { createServer } from './server.js';\nimport './otel';`);
    expect(msgs).toHaveLength(1);
    expect(msgs[0]?.messageId).toBe('notFirstImport');
  });

  it('rejects when ./otel is second among three imports', () => {
    const msgs = lintCode(`import express from 'express';\nimport './otel';\nimport { config } from './config.js';`);
    expect(msgs).toHaveLength(1);
    expect(msgs[0]?.messageId).toBe('notFirstImport');
  });

  it('rejects when no imports exist at all', () => {
    const msgs = lintCode(`const x = 1;`);
    expect(msgs).toHaveLength(1);
    expect(msgs[0]?.messageId).toBe('missingOtelImport');
  });

  it('rejects when only non-otel imports exist', () => {
    const msgs = lintCode(`import { config } from './config.js';\nimport { db } from './database.js';`);
    expect(msgs).toHaveLength(1);
    expect(msgs[0]?.messageId).toBe('notFirstImport');
  });

  it('reports the offending source in error message', () => {
    const msgs = lintCode(`import { logger } from './logger.js';\nimport './otel';`);
    expect(msgs).toHaveLength(1);
    expect(msgs[0]?.message).toContain('./logger.js');
  });
});
