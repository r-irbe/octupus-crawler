// Unit tests for failover controller
// Validates: T-COORD-016, REQ-DIST-024, REQ-DIST-025

import { describe, it, expect, vi, afterEach } from 'vitest';
import { ok, err } from 'neverthrow';
import { createFailoverController } from './failover-controller.js';
import type { LeaderElection } from './leader-election.js';
import type { Logger } from '@ipf/core/contracts/logger';
import { createQueueError } from '@ipf/core/errors/queue-error';

const noop = (): void => { /* no-op */ };

function stubLogger(): Logger {
  return {
    info: noop, warn: noop, error: noop, debug: noop, fatal: noop,
    child: (): Logger => stubLogger(),
  };
}

function stubElection(overrides: Partial<LeaderElection> = {}): LeaderElection {
  return {
    tryAcquire: () => Promise.resolve(ok(false)),
    renew: () => Promise.resolve(ok(true)),
    release: () => Promise.resolve(ok(undefined)),
    isLeader: () => false,
    startRenewal: noop,
    stopRenewal: noop,
    ...overrides,
  };
}

describe('createFailoverController', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  // Validates REQ-DIST-024: controller starts inactive
  it('is not active before start', () => {
    const controller = createFailoverController(
      stubElection(),
      async () => { /* no-op */ },
      stubLogger(),
    );
    expect(controller.isActive()).toBe(false);
  });

  // Validates REQ-DIST-024: controller becomes active on start
  it('becomes active after start', () => {
    const controller = createFailoverController(
      stubElection(),
      async () => { /* no-op */ },
      stubLogger(),
    );
    controller.start();
    expect(controller.isActive()).toBe(true);
    controller.stop();
  });

  // Validates REQ-DIST-024: controller stops
  it('becomes inactive after stop', () => {
    const controller = createFailoverController(
      stubElection(),
      async () => { /* no-op */ },
      stubLogger(),
    );
    controller.start();
    controller.stop();
    expect(controller.isActive()).toBe(false);
  });

  // Validates REQ-DIST-024: idempotent start
  it('handles double start idempotently', () => {
    const controller = createFailoverController(
      stubElection(),
      async () => { /* no-op */ },
      stubLogger(),
    );
    controller.start();
    controller.start(); // should not throw
    expect(controller.isActive()).toBe(true);
    controller.stop();
  });

  // Validates REQ-DIST-025: calls onBecameLeader when lease acquired
  it('invokes callback on successful lease acquisition', async () => {
    vi.useFakeTimers();
    let becameLeader = false;

    const election = stubElection({
      tryAcquire: () => Promise.resolve(ok(true)),
      startRenewal: noop,
    });

    const controller = createFailoverController(
      election,
      // eslint-disable-next-line @typescript-eslint/require-await -- callback signature requires Promise<void>
      async () => { becameLeader = true; },
      stubLogger(),
      { pollIntervalMs: 100 },
    );

    controller.start();
    await vi.advanceTimersByTimeAsync(150);

    expect(becameLeader).toBe(true);
    controller.stop();
  });

  // Validates REQ-DIST-024: does not call callback when already leader
  it('skips acquisition when already leader', async () => {
    vi.useFakeTimers();
    let callCount = 0;

    const election = stubElection({
      isLeader: () => true,
    });

    const controller = createFailoverController(
      election,
      // eslint-disable-next-line @typescript-eslint/require-await -- callback signature requires Promise<void>
      async () => { callCount += 1; },
      stubLogger(),
      { pollIntervalMs: 100 },
    );

    controller.start();
    await vi.advanceTimersByTimeAsync(350);

    expect(callCount).toBe(0);
    controller.stop();
  });

  // Validates REQ-DIST-024: handles acquisition failure gracefully
  it('does not crash on lease acquisition error', async () => {
    vi.useFakeTimers();
    const queueErr = createQueueError({ operation: 'tryAcquire', cause: new Error('timeout') });
    const election = stubElection({
      tryAcquire: () => Promise.resolve(err(queueErr)),
    });

    const controller = createFailoverController(
      election,
      async () => { /* no-op */ },
      stubLogger(),
      { pollIntervalMs: 100 },
    );

    controller.start();
    await vi.advanceTimersByTimeAsync(150);

    // Controller should still be active (not crashed)
    expect(controller.isActive()).toBe(true);
    controller.stop();
  });
});
