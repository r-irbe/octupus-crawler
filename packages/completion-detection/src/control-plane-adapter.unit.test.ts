// Unit tests for control plane adapter
// Validates REQ-DIST-017, REQ-DIST-018, REQ-DIST-019, REQ-DIST-020

import { describe, it, expect, vi } from 'vitest';
import { ok, err } from 'neverthrow';
import type { Logger } from '@ipf/core/contracts/logger';
import { createQueueError } from '@ipf/core/errors/queue-error';
import { createControlPlaneAdapter } from './control-plane-adapter.js';
import type { QueueAdapter } from './control-plane-adapter.js';

function recLogger(): Logger {
  const noop = (): void => undefined;
  return {
    debug: noop, info: noop, warn: noop, error: noop, fatal: noop,
    child: () => recLogger(),
  } as Logger;
}

function stubCounts(overrides: Partial<Record<string, number>> = {}): {
  waiting: number; active: number; completed: number; failed: number; delayed: number; paused: number;
} {
  return {
    waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0, paused: 0,
    ...overrides,
  };
}

function stubQueue(overrides: Partial<QueueAdapter> = {}): QueueAdapter {
  return {
    getJobCounts: vi.fn(() => Promise.resolve(ok(stubCounts()))),
    pause: vi.fn(() => Promise.resolve(ok(undefined))),
    resume: vi.fn(() => Promise.resolve(ok(undefined))),
    obliterate: vi.fn(() => Promise.resolve(ok(undefined))),
    close: vi.fn(() => Promise.resolve()),
    ...overrides,
  };
}

describe('ControlPlaneAdapter', () => {
  // REQ-DIST-017: state derived from live query
  describe('getState', () => {
    it('returns idle when no jobs', async () => {
      const queue = stubQueue({
        getJobCounts: vi.fn(() => Promise.resolve(ok(stubCounts()))),
      });
      const adapter = createControlPlaneAdapter({ queue, logger: recLogger() });
      const result = await adapter.getState();
      expect(result.isOk()).toBe(true);
      if (result.isOk()) expect(result.value).toBe('idle');
    });

    it('returns running when pending jobs exist', async () => {
      const queue = stubQueue({
        getJobCounts: vi.fn(() =>
          Promise.resolve(ok(stubCounts({ waiting: 5, active: 2 }))),
        ),
      });
      const adapter = createControlPlaneAdapter({ queue, logger: recLogger() });
      const result = await adapter.getState();
      expect(result.isOk()).toBe(true);
      if (result.isOk()) expect(result.value).toBe('running');
    });

    it('returns completed when pending=0 and done>0', async () => {
      const queue = stubQueue({
        getJobCounts: vi.fn(() =>
          Promise.resolve(ok(stubCounts({ completed: 10, failed: 2 }))),
        ),
      });
      const adapter = createControlPlaneAdapter({ queue, logger: recLogger() });
      const result = await adapter.getState();
      expect(result.isOk()).toBe(true);
      if (result.isOk()) expect(result.value).toBe('completed');
    });

    it('returns paused when paused jobs exist', async () => {
      const queue = stubQueue({
        getJobCounts: vi.fn(() =>
          Promise.resolve(ok(stubCounts({ paused: 3, waiting: 2 }))),
        ),
      });
      const adapter = createControlPlaneAdapter({ queue, logger: recLogger() });
      const result = await adapter.getState();
      expect(result.isOk()).toBe(true);
      if (result.isOk()) expect(result.value).toBe('paused');
    });

    it('propagates queue errors', async () => {
      const queueErr = createQueueError({ operation: 'getJobCounts', cause: new Error('redis') });
      const queue = stubQueue({
        getJobCounts: vi.fn(() => Promise.resolve(err(queueErr))),
      });
      const adapter = createControlPlaneAdapter({ queue, logger: recLogger() });
      const result = await adapter.getState();
      expect(result.isErr()).toBe(true);
      if (result.isErr()) expect(result.error.operation).toBe('getJobCounts');
    });
  });

  // REQ-DIST-017: live progress query
  describe('getProgress', () => {
    it('returns correct progress counts', async () => {
      const queue = stubQueue({
        getJobCounts: vi.fn(() =>
          Promise.resolve(ok(stubCounts({ waiting: 3, active: 2, completed: 10, failed: 1, delayed: 1 }))),
        ),
      });
      const adapter = createControlPlaneAdapter({ queue, logger: recLogger() });
      const result = await adapter.getProgress();
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.completed).toBe(10);
        expect(result.value.failed).toBe(1);
        expect(result.value.pending).toBe(6); // 3+2+1
        expect(result.value.total).toBe(17); // 3+2+1+10+1
      }
    });
  });

  // REQ-DIST-018: pause/resume
  describe('pause/resume', () => {
    it('delegates pause to queue', async () => {
      const queue = stubQueue();
      const adapter = createControlPlaneAdapter({ queue, logger: recLogger() });
      const result = await adapter.pause();
      expect(result.isOk()).toBe(true);
      expect(queue.pause).toHaveBeenCalledOnce();
    });

    it('delegates resume to queue', async () => {
      const queue = stubQueue();
      const adapter = createControlPlaneAdapter({ queue, logger: recLogger() });
      const result = await adapter.resume();
      expect(result.isOk()).toBe(true);
      expect(queue.resume).toHaveBeenCalledOnce();
    });
  });

  // REQ-DIST-019: idempotent cancel with promise deduplication
  describe('cancel', () => {
    it('calls obliterate once even with multiple cancel calls', async () => {
      const queue = stubQueue();
      const adapter = createControlPlaneAdapter({ queue, logger: recLogger() });
      const [r1, r2, r3] = await Promise.all([
        adapter.cancel(),
        adapter.cancel(),
        adapter.cancel(),
      ]);
      expect(r1.isOk()).toBe(true);
      expect(r2.isOk()).toBe(true);
      expect(r3.isOk()).toBe(true);
      expect(queue.obliterate).toHaveBeenCalledOnce();
    });

    it('returns cancelled state after cancel', async () => {
      const queue = stubQueue({
        getJobCounts: vi.fn(() =>
          Promise.resolve(ok(stubCounts({ waiting: 5 }))),
        ),
      });
      const adapter = createControlPlaneAdapter({ queue, logger: recLogger() });
      await adapter.cancel();
      const result = await adapter.getState();
      expect(result.isOk()).toBe(true);
      if (result.isOk()) expect(result.value).toBe('cancelled');
    });
  });

  // REQ-DIST-020: close releases resources
  describe('close', () => {
    it('delegates to queue.close', async () => {
      const queue = stubQueue();
      const adapter = createControlPlaneAdapter({ queue, logger: recLogger() });
      await adapter.close();
      expect(queue.close).toHaveBeenCalledOnce();
    });
  });
});
