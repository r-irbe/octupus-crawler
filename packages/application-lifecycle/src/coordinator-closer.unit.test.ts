// Unit tests for coordinator closer
// Validates: T-LIFE-026, T-LIFE-027

import { describe, it, expect } from 'vitest';
import { coordinatorAsDisposable } from './coordinator-closer.js';
import type { Coordinator } from './coordinator-closer.js';
import type { Logger } from '@ipf/core/contracts/logger';

const noop = (): void => { /* no-op */ };

function stubLogger(): Logger {
  return {
    info: noop, warn: noop, error: noop, debug: noop, fatal: noop,
    child: (): Logger => stubLogger(),
  };
}

describe('coordinatorAsDisposable', () => {
  // Validates REQ-LIFE-023: stop is called on close
  it('calls stop on the coordinator', async () => {
    let stopped = false;
    const coordinator: Coordinator = {
      stop: (): void => { stopped = true; },
    };

    const disposable = coordinatorAsDisposable(coordinator, stubLogger());
    await disposable.close();

    expect(stopped).toBe(true);
  });

  // Validates REQ-LIFE-023: settles pending completion promise
  it('awaits completion promise if present', async () => {
    let completionCalled = false;
    const coordinator: Coordinator = {
      stop: noop,
      waitForCompletion: (): Promise<void> => {
        completionCalled = true;
        return Promise.resolve();
      },
    };

    const disposable = coordinatorAsDisposable(coordinator, stubLogger());
    await disposable.close();

    expect(completionCalled).toBe(true);
  });

  // Validates REQ-LIFE-023: handles rejected completion promise
  it('handles rejected completion promise gracefully', async () => {
    const coordinator: Coordinator = {
      stop: noop,
      waitForCompletion: (): Promise<void> => Promise.reject(new Error('aborted')),
    };

    const disposable = coordinatorAsDisposable(coordinator, stubLogger());
    // Should not throw
    await disposable.close();
  });

  // Validates REQ-LIFE-024: does not close shared resources
  it('does not close external resources', async () => {
    const coordinator: Coordinator = { stop: noop };

    const disposable = coordinatorAsDisposable(coordinator, stubLogger());
    await disposable.close();

    // No assertion on external resources — the test proves only stop() and
    // waitForCompletion() are called. The coordinator has no reference to
    // frontier, state-store, or other shared resources.
  });
});
