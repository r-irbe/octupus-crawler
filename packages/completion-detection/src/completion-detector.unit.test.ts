// Unit tests for completion detector
// Validates REQ-DIST-012, REQ-DIST-013, REQ-DIST-014, REQ-DIST-016

import { describe, it, expect, vi, afterEach } from 'vitest';
import { ok, err } from 'neverthrow';
import type { Logger } from '@ipf/core/contracts/logger';
import type { CrawlMetrics } from '@ipf/core/contracts/crawl-metrics';
import { createQueueError } from '@ipf/core/errors/queue-error';
import { createCompletionDetector } from './completion-detector.js';
import type { CompletionDetectorDeps, QueueCounts } from './completion-detector.js';
import type { BackoffController } from './backoff-controller.js';

function recLogger(): Logger {
  const noop = (): void => undefined;
  return {
    debug: noop, info: noop, warn: noop, error: noop, fatal: noop,
    child: () => recLogger(),
  } as Logger;
}

function stubMetrics(): CrawlMetrics {
  return {
    recordFetch: vi.fn(),
    recordFetchDuration: vi.fn(),
    recordUrlsDiscovered: vi.fn(),
    setFrontierSize: vi.fn(),
    setStalledJobs: vi.fn(),
    setActiveJobs: vi.fn(),
    setWorkerUtilization: vi.fn(),
    incrementCoordinatorRestarts: vi.fn(),
  };
}

function stubBackoff(): BackoffController {
  return {
    onStoreError: vi.fn(),
    onStoreSuccess: vi.fn(),
    shouldSkipTick: vi.fn(() => false),
    isAborted: vi.fn(() => false),
    consecutiveFailures: vi.fn(() => 0),
  };
}

function makeDeps(overrides: Partial<CompletionDetectorDeps> = {}): CompletionDetectorDeps {
  return {
    config: { pollIntervalMs: 10 },
    getQueueCounts: vi.fn(() => Promise.resolve(ok({ pending: 0, done: 0 }))),
    backoff: stubBackoff(),
    logger: recLogger(),
    metrics: stubMetrics(),
    ...overrides,
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('CompletionDetector', () => {
  // REQ-DIST-012: completion when pending=0 AND done>0
  it('resolves Completed when pending=0 and done>0', async () => {
    const deps = makeDeps({
      getQueueCounts: vi.fn(() => Promise.resolve(ok({ pending: 0, done: 5 } as QueueCounts))),
    });
    const detector = createCompletionDetector(deps);
    const outcome = await detector.waitForCompletion();
    expect(outcome._tag).toBe('Completed');
    if (outcome._tag === 'Completed') {
      expect(outcome.done).toBe(5);
    }
  });

  // REQ-DIST-013: EmptyComplete after two consecutive empty polls
  it('resolves EmptyComplete after two consecutive empty polls', async () => {
    let callCount = 0;
    const deps = makeDeps({
      getQueueCounts: vi.fn(() => {
        callCount++;
        return Promise.resolve(ok({ pending: 0, done: 0 } as QueueCounts));
      }),
    });
    const detector = createCompletionDetector(deps);
    const outcome = await detector.waitForCompletion();
    expect(outcome._tag).toBe('EmptyComplete');
    expect(callCount).toBeGreaterThanOrEqual(2);
  });

  // REQ-DIST-014: restart detection when done>0 on first poll
  it('increments coordinator restarts on first poll with done>0', async () => {
    const metrics = stubMetrics();
    const deps = makeDeps({
      metrics,
      getQueueCounts: vi.fn(() => Promise.resolve(ok({ pending: 0, done: 3 } as QueueCounts))),
    });
    const detector = createCompletionDetector(deps);
    await detector.waitForCompletion();
    expect(metrics.incrementCoordinatorRestarts).toHaveBeenCalledOnce();
  });

  // REQ-DIST-015: aborted outcome when backoff signals abort
  it('resolves Aborted when backoff is aborted', async () => {
    const backoff = stubBackoff();
    (backoff.isAborted as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (backoff.consecutiveFailures as ReturnType<typeof vi.fn>).mockReturnValue(25);
    const deps = makeDeps({ backoff });
    const detector = createCompletionDetector(deps);
    const outcome = await detector.waitForCompletion();
    expect(outcome._tag).toBe('Aborted');
    if (outcome._tag === 'Aborted') {
      expect(outcome.failures).toBe(25);
    }
  });

  // REQ-DIST-015: store error triggers backoff
  it('calls backoff.onStoreError on queue error', async () => {
    const backoff = stubBackoff();
    let callCount = 0;
    (backoff.isAborted as ReturnType<typeof vi.fn>).mockImplementation(() => {
      callCount++;
      return callCount >= 3; // abort on 3rd check
    });
    (backoff.consecutiveFailures as ReturnType<typeof vi.fn>).mockReturnValue(3);

    const queueErr = createQueueError({ operation: 'getJobCounts', cause: new Error('conn') });
    const deps = makeDeps({
      backoff,
      getQueueCounts: vi.fn(() => Promise.resolve(err(queueErr))),
    });
    const detector = createCompletionDetector(deps);
    const outcome = await detector.waitForCompletion();
    expect(backoff.onStoreError).toHaveBeenCalled();
    expect(outcome._tag).toBe('Aborted');
  });

  // REQ-DIST-016: once guard — overlapping polls prevented
  it('throws on second call to waitForCompletion', async () => {
    const deps = makeDeps({
      getQueueCounts: vi.fn(() => Promise.resolve(ok({ pending: 0, done: 1 } as QueueCounts))),
    });
    const detector = createCompletionDetector(deps);
    await detector.waitForCompletion();
    await expect(detector.waitForCompletion()).rejects.toThrow(
      'waitForCompletion already called',
    );
  });

  // REQ-DIST-013: non-consecutive empty polls reset counter
  it('resets empty poll count when non-empty poll occurs', async () => {
    let callCount = 0;
    const deps = makeDeps({
      getQueueCounts: vi.fn(() => {
        callCount++;
        // First: empty, second: has pending, third+fourth: empty → EmptyComplete
        if (callCount === 1) return Promise.resolve(ok({ pending: 0, done: 0 } as QueueCounts));
        if (callCount === 2) return Promise.resolve(ok({ pending: 1, done: 0 } as QueueCounts));
        return Promise.resolve(ok({ pending: 0, done: 0 } as QueueCounts));
      }),
    });
    const detector = createCompletionDetector(deps);
    const outcome = await detector.waitForCompletion();
    expect(outcome._tag).toBe('EmptyComplete');
    // Needs 4+ calls: empty(1), pending(reset), empty(1), empty(2→resolve)
    expect(callCount).toBeGreaterThanOrEqual(4);
  });

  it('skips tick when backoff says to', async () => {
    const backoff = stubBackoff();
    let skipCount = 0;
    (backoff.shouldSkipTick as ReturnType<typeof vi.fn>).mockImplementation(() => {
      skipCount++;
      // Skip first 2, then don't skip
      return skipCount <= 2;
    });

    const getQueueCounts = vi.fn(() =>
      Promise.resolve(ok({ pending: 0, done: 1 } as QueueCounts)),
    );
    const deps = makeDeps({ backoff, getQueueCounts });
    const detector = createCompletionDetector(deps);
    const outcome = await detector.waitForCompletion();
    expect(outcome._tag).toBe('Completed');
    // getQueueCounts should not have been called during skipped ticks
    expect(skipCount).toBeGreaterThanOrEqual(2);
  });
});
