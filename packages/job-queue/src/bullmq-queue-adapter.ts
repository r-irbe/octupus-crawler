// BullMQ adapter for QueueAdapter port interface — control plane operations
// Implements: T-COORD-008 to T-COORD-011, ADR-002 (BullMQ)

import { Queue, type ConnectionOptions } from 'bullmq';
import { ok, err } from 'neverthrow';
import type { AsyncResult } from '@ipf/core/types/result';
import type { QueueError } from '@ipf/core/errors/queue-error';
import { createQueueError } from '@ipf/core/errors/queue-error';
import type { BullMQConnection, QueueConfig } from './connection-config.js';

// SYNC: must match @ipf/completion-detection/src/control-plane-adapter.ts QueueAdapter.
// Mirrored here to avoid circular dependency (job-queue → completion-detection → job-queue).
// Integration tests in completion-detection verify structural compatibility at compile time.
export type QueueAdapter = {
  getJobCounts(): AsyncResult<{ waiting: number; active: number; completed: number; failed: number; delayed: number; paused: number }, QueueError>;
  pause(): AsyncResult<void, QueueError>;
  resume(): AsyncResult<void, QueueError>;
  obliterate(): AsyncResult<void, QueueError>;
  close(): Promise<void>;
};

export type QueueAdapterDeps = {
  readonly connection: BullMQConnection;
  readonly config: QueueConfig;
};

/** Creates a QueueAdapter backed by BullMQ Queue for control-plane operations. */
export function createBullMQQueueAdapter(deps: QueueAdapterDeps): QueueAdapter {
  const queue = new Queue(deps.config.queueName, {
    connection: deps.connection as ConnectionOptions,
  });

  async function getJobCounts(): AsyncResult<
    { waiting: number; active: number; completed: number; failed: number; delayed: number; paused: number },
    QueueError
  > {
    try {
      const counts = await queue.getJobCounts(
        'waiting', 'active', 'completed', 'failed', 'delayed', 'paused',
      );
      return ok({
        waiting: counts['waiting'] ?? 0,
        active: counts['active'] ?? 0,
        completed: counts['completed'] ?? 0,
        failed: counts['failed'] ?? 0,
        delayed: counts['delayed'] ?? 0,
        paused: counts['paused'] ?? 0,
      });
    } catch (cause: unknown) {
      return err(createQueueError({ operation: 'getJobCounts', cause }));
    }
  }

  async function pause(): AsyncResult<void, QueueError> {
    try {
      await queue.pause();
      return ok(undefined);
    } catch (cause: unknown) {
      return err(createQueueError({ operation: 'pause', cause }));
    }
  }

  async function resume(): AsyncResult<void, QueueError> {
    try {
      await queue.resume();
      return ok(undefined);
    } catch (cause: unknown) {
      return err(createQueueError({ operation: 'resume', cause }));
    }
  }

  async function obliterate(): AsyncResult<void, QueueError> {
    try {
      await queue.obliterate({ force: true });
      return ok(undefined);
    } catch (cause: unknown) {
      return err(createQueueError({ operation: 'obliterate', cause }));
    }
  }

  async function close(): Promise<void> {
    await queue.close();
  }

  return { getJobCounts, pause, resume, obliterate, close };
}
