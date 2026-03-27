// Validates REQ-LIFE-001: Config validation gate (exit on failure)
// Validates REQ-LIFE-002: Seed URL validation (exit on empty)
// Validates REQ-LIFE-033: Sequential startup ordering
// Validates REQ-LIFE-034: Reverse cleanup on partial startup failure

import { describe, it, expect } from 'vitest';
import { ok, err } from 'neverthrow';
import type { Logger } from '@ipf/core/contracts/logger';
import type { Config } from '@ipf/config/config-schema';
import type { Disposable } from '@ipf/core/contracts/disposable';
import {
  validateConfig,
  validateSeeds,
  executeStartupSequence,
  StartupError,
} from './startup-orchestrator.js';
import type { StartupPhase } from './startup-orchestrator.js';

function recLogger(): Logger {
  const noop = (): void => undefined;
  return {
    debug: noop, info: noop, warn: noop, error: noop, fatal: noop,
    child: () => recLogger(),
  } as Logger;
}

function mockDisposable(name: string, log: string[]): Disposable {
  return {
    close: (): Promise<void> => {
      log.push(`close:${name}`);
      return Promise.resolve();
    },
  };
}

describe('validateConfig (REQ-LIFE-001)', () => {
  it('returns config on valid input', () => {
    const fakeConfig = { SERVICE_NAME: 'test' } as Config;
    const result = validateConfig(
      () => ok(fakeConfig),
      {},
      recLogger(),
    );
    expect(result).toBe(fakeConfig);
  });

  it('throws StartupError on invalid config', () => {
    expect(() => {
      validateConfig(
        () => err('bad config'),
        {},
        recLogger(),
      );
    }).toThrow(StartupError);
  });
});

describe('validateSeeds (REQ-LIFE-002)', () => {
  it('does not throw for non-empty seeds', () => {
    expect(() => { validateSeeds(['https://a.com'], recLogger()); }).not.toThrow();
  });

  it('throws StartupError for empty seeds', () => {
    expect(() => { validateSeeds([], recLogger()); }).toThrow(StartupError);
  });
});

describe('executeStartupSequence', () => {
  it('executes phases in order (REQ-LIFE-033)', async () => {
    const order: string[] = [];
    const phases: StartupPhase[] = [
      { name: 'logger', execute: () => { order.push('logger'); return Promise.resolve(mockDisposable('logger', [])); } },
      { name: 'tracer', execute: () => { order.push('tracer'); return Promise.resolve(mockDisposable('tracer', [])); } },
      { name: 'metrics', execute: () => { order.push('metrics'); return Promise.resolve(mockDisposable('metrics', [])); } },
    ];

    const result = await executeStartupSequence(phases, recLogger());
    expect(order).toStrictEqual(['logger', 'tracer', 'metrics']);
    expect(result.resources).toHaveLength(3);
  });

  it('cleans up in reverse on failure (REQ-LIFE-034)', async () => {
    const cleanupLog: string[] = [];
    const phases: StartupPhase[] = [
      { name: 'logger', execute: () => Promise.resolve(mockDisposable('logger', cleanupLog)) },
      { name: 'tracer', execute: () => Promise.resolve(mockDisposable('tracer', cleanupLog)) },
      { name: 'metrics', execute: () => Promise.reject(new Error('metrics init failed')) },
    ];

    await expect(executeStartupSequence(phases, recLogger())).rejects.toThrow(StartupError);
    expect(cleanupLog).toStrictEqual(['close:tracer', 'close:logger']);
  });

  it('handles empty phase list', async () => {
    const result = await executeStartupSequence([], recLogger());
    expect(result.resources).toHaveLength(0);
  });

  it('wraps error in StartupError with phase name', async () => {
    const phases: StartupPhase[] = [
      { name: 'db', execute: () => Promise.reject(new Error('connection refused')) },
    ];

    try {
      await executeStartupSequence(phases, recLogger());
      expect.unreachable('should throw');
    } catch (e: unknown) {
      expect(e).toBeInstanceOf(StartupError);
      if (e instanceof StartupError) {
        expect(e.phase).toBe('db');
        expect(e.detail).toBe('connection refused');
      }
    }
  });
});
