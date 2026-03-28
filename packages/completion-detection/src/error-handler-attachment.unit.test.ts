// Unit tests for error handler attachment
// Validates: T-COORD-013, REQ-DIST-022

import { describe, it, expect, vi } from 'vitest';
import { attachErrorHandler } from './error-handler-attachment.js';
import type { ErrorEmitter } from './error-handler-attachment.js';
import type { Logger } from '@ipf/core/contracts/logger';

function createTestEmitter(): ErrorEmitter & { fireError: (err: Error) => void } {
  let handler: ((err: Error) => void) | undefined;
  return {
    on: (_event: 'error', h: (err: Error) => void): void => { handler = h; },
    fireError: (err: Error): void => { handler?.(err); },
  };
}

function createTestLogger(): Logger & { calls: Array<{ msg: string; bindings: unknown }> } {
  const calls: Array<{ msg: string; bindings: unknown }> = [];
  const noop = vi.fn();
  return {
    calls,
    info: noop,
    warn: noop,
    error: (msg: string, bindings?: Record<string, unknown>): void => { calls.push({ msg, bindings }); },
    debug: noop,
    fatal: noop,
    child: (): Logger => createTestLogger(),
  };
}

describe('attachErrorHandler', () => {
  // Validates REQ-DIST-022: error handler attached immediately
  it('registers error handler on emitter', () => {
    const emitter = createTestEmitter();
    const logger = createTestLogger();
    attachErrorHandler(emitter, logger, 'test-queue');

    emitter.fireError(new Error('test'));

    expect(logger.calls).toHaveLength(1);
  });

  // Validates REQ-DIST-022: errors are logged, not propagated
  it('logs errors with component name', () => {
    const emitter = createTestEmitter();
    const logger = createTestLogger();
    attachErrorHandler(emitter, logger, 'redis-connection');

    emitter.fireError(new Error('connection lost'));

    expect(logger.calls).toHaveLength(1);
    expect(logger.calls[0]?.msg).toContain('redis-connection');
    expect(logger.calls[0]?.bindings).toEqual(
      expect.objectContaining({ component: 'redis-connection' }),
    );
  });
});
