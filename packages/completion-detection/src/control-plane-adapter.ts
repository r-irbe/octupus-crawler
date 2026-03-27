// Control plane adapter — state derivation, pause/resume, idempotent cancel
// Implements: T-COORD-008 to 011, REQ-DIST-017 to 020

import { ok, err } from 'neverthrow';
import type { Logger } from '@ipf/core/contracts/logger';
import type { CrawlState, CrawlProgress, ControlPlane } from '@ipf/core/contracts/control-plane';
import type { AsyncResult } from '@ipf/core/types/result';
import type { QueueError } from '@ipf/core/errors/queue-error';
import type { Disposable } from '@ipf/core/contracts/disposable';

export type QueueAdapter = {
  getJobCounts(): AsyncResult<{ waiting: number; active: number; completed: number; failed: number; delayed: number; paused: number }, QueueError>;
  pause(): AsyncResult<void, QueueError>;
  resume(): AsyncResult<void, QueueError>;
  obliterate(): AsyncResult<void, QueueError>;
  close(): Promise<void>;
};

export type ControlPlaneDeps = {
  readonly queue: QueueAdapter;
  readonly logger: Logger;
};

// REQ-DIST-017: state derived from live query, not cached
function deriveState(
  counts: { waiting: number; active: number; completed: number; failed: number; paused: number },
  cancelled: boolean,
): CrawlState {
  if (cancelled) return 'cancelled';
  if (counts.paused > 0) return 'paused';
  const pending = counts.waiting + counts.active;
  const done = counts.completed + counts.failed;
  if (pending === 0 && done > 0) return 'completed';
  if (pending === 0 && done === 0) return 'idle';
  return 'running';
}

export function createControlPlaneAdapter(deps: ControlPlaneDeps): ControlPlane & Disposable {
  let cancelled = false;
  let cancelPromise: Promise<void> | undefined;

  // REQ-DIST-017: live state query
  async function getState(): AsyncResult<CrawlState, QueueError> {
    const result = await deps.queue.getJobCounts();
    if (result.isErr()) return err(result.error);
    return ok(deriveState(result.value, cancelled));
  }

  // REQ-DIST-017: live progress query
  async function getProgress(): AsyncResult<CrawlProgress, QueueError> {
    const result = await deps.queue.getJobCounts();
    if (result.isErr()) return err(result.error);
    const c = result.value;
    return ok({
      completed: c.completed,
      failed: c.failed,
      pending: c.waiting + c.active + c.delayed,
      total: c.waiting + c.active + c.delayed + c.completed + c.failed,
    });
  }

  // REQ-DIST-018: pause — active jobs run to completion
  async function pause(): AsyncResult<void, QueueError> {
    deps.logger.info('Pausing queue');
    return deps.queue.pause();
  }

  // REQ-DIST-018: resume
  async function resume(): AsyncResult<void, QueueError> {
    deps.logger.info('Resuming queue');
    return deps.queue.resume();
  }

  // REQ-DIST-019: idempotent cancel with promise deduplication
  async function cancel(): AsyncResult<void, QueueError> {
    if (cancelPromise === undefined) {
      cancelPromise = doCancel();
    }
    await cancelPromise;
    return ok(undefined);
  }

  async function doCancel(): Promise<void> {
    cancelled = true;
    deps.logger.info('Cancelling crawl');
    const result = await deps.queue.obliterate();
    if (result.isErr()) {
      deps.logger.error('Cancel failed', { error: result.error.message });
    }
  }

  async function close(): Promise<void> {
    await deps.queue.close();
  }

  return { getState, getProgress, pause, resume, cancel, close };
}
