// Validates REQ-LIFE-030: Abort at exactly N consecutive failures, deterministic

import { describe, it, expect } from 'vitest';
import type { Logger } from '@ipf/core/contracts/logger';
import { createAbortHandler } from './abort-handler.js';

function recLogger(): Logger {
  const noop = (): void => undefined;
  return {
    debug: noop, info: noop, warn: noop, error: noop, fatal: noop,
    child: () => recLogger(),
  } as Logger;
}

describe('AbortHandler', () => {
  it('aborts at exactly N consecutive failures (REQ-LIFE-030)', () => {
    const abortReasons: string[] = [];
    const handler = createAbortHandler(
      { maxConsecutiveFailures: 3 },
      recLogger(),
      (reason) => { abortReasons.push(reason); },
    );

    handler.recordFailure();
    handler.recordFailure();
    expect(abortReasons).toHaveLength(0);
    expect(handler.consecutiveFailures()).toBe(2);

    handler.recordFailure();
    expect(abortReasons).toHaveLength(1);
    expect(abortReasons[0]).toContain('3 consecutive failures');
  });

  it('resets counter on success', () => {
    const abortReasons: string[] = [];
    const handler = createAbortHandler(
      { maxConsecutiveFailures: 3 },
      recLogger(),
      (reason) => { abortReasons.push(reason); },
    );

    handler.recordFailure();
    handler.recordFailure();
    handler.recordSuccess();
    expect(handler.consecutiveFailures()).toBe(0);

    handler.recordFailure();
    handler.recordFailure();
    expect(abortReasons).toHaveLength(0);
  });

  it('does not abort twice after threshold', () => {
    const abortReasons: string[] = [];
    const handler = createAbortHandler(
      { maxConsecutiveFailures: 2 },
      recLogger(),
      (reason) => { abortReasons.push(reason); },
    );

    handler.recordFailure();
    handler.recordFailure();
    handler.recordFailure();
    handler.recordFailure();
    expect(abortReasons).toHaveLength(1);
  });
});
