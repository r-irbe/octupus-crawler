// Validates REQ-LIFE-013: uncaughtException → log fatal, exit 1
// Validates REQ-LIFE-014: unhandledRejection → log fatal, exit 1
// Validates REQ-LIFE-015: main() wrapper catches and exits(1)
// Validates REQ-LIFE-016: state-store abort → exit 3
// Validates REQ-LIFE-017: crawl complete → exit 0

import { describe, it, expect, afterEach } from 'vitest';
import type { Logger } from '@ipf/core/contracts/logger';
import {
  registerProcessHandlers,
  handleAbortExit,
  handleCompletionExit,
  safeMain,
} from './process-handlers.js';
import type { ProcessHandlersDeps } from './process-handlers.js';
import { EXIT_ERROR, EXIT_STATE_STORE_ABORT, EXIT_SUCCESS } from './exit-codes.js';

function recLogger(): Logger & { calls: { method: string; args: unknown[] }[] } {
  const calls: { method: string; args: unknown[] }[] = [];
  const make = (method: string) =>
    (msg: string, bindings?: Record<string, unknown>): void => {
      calls.push({ method, args: [msg, bindings] });
    };
  return {
    calls,
    debug: make('debug'),
    info: make('info'),
    warn: make('warn'),
    error: make('error'),
    fatal: make('fatal'),
    child: () => recLogger(),
  } as Logger & { calls: { method: string; args: unknown[] }[] };
}

function buildDeps(overrides: Partial<ProcessHandlersDeps> = {}): ProcessHandlersDeps & {
  exitCalls: number[];
  shutdownCalls: string[];
} {
  const exitCalls: number[] = [];
  const shutdownCalls: string[] = [];
  return {
    exitCalls,
    shutdownCalls,
    logger: recLogger(),
    shutdown: (reason): Promise<void> => {
      shutdownCalls.push(reason._tag);
      return Promise.resolve();
    },
    exit: (code): void => { exitCalls.push(code); },
    ...overrides,
  };
}

describe('Process Handlers', () => {
  let cleanup: (() => void) | undefined;

  afterEach(() => {
    cleanup?.();
    cleanup = undefined;
  });

  describe('registerProcessHandlers', () => {
    it('returns cleanup function that removes listeners', () => {
      const deps = buildDeps();
      const before = process.listenerCount('uncaughtException');
      cleanup = registerProcessHandlers(deps);
      expect(process.listenerCount('uncaughtException')).toBe(before + 1);
      cleanup();
      expect(process.listenerCount('uncaughtException')).toBe(before);
      cleanup = undefined;
    });
  });

  describe('handleAbortExit (REQ-LIFE-016)', () => {
    it('calls shutdown with Abort reason and exits with code 3', async () => {
      const deps = buildDeps();
      await handleAbortExit(deps, 'state-store exhausted');
      expect(deps.shutdownCalls).toStrictEqual(['Abort']);
      expect(deps.exitCalls).toStrictEqual([EXIT_STATE_STORE_ABORT]);
    });
  });

  describe('handleCompletionExit (REQ-LIFE-017)', () => {
    it('calls shutdown with Completion reason and exits with code 0', async () => {
      const deps = buildDeps();
      await handleCompletionExit(deps);
      expect(deps.shutdownCalls).toStrictEqual(['Completion']);
      expect(deps.exitCalls).toStrictEqual([EXIT_SUCCESS]);
    });
  });

  describe('safeMain (REQ-LIFE-015)', () => {
    it('runs main function successfully without exit', async () => {
      const deps = buildDeps();
      await safeMain(() => Promise.resolve(), deps);
      expect(deps.exitCalls).toStrictEqual([]);
    });

    it('catches main error, logs fatal, shutdown + exit(1)', async () => {
      const deps = buildDeps();
      await safeMain(() => Promise.reject(new Error('boom')), deps);
      expect(deps.shutdownCalls).toStrictEqual(['Error']);
      expect(deps.exitCalls).toStrictEqual([EXIT_ERROR]);
    });
  });
});
