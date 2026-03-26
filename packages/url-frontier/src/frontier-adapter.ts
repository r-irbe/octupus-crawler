// Frontier adapter — implements core Frontier interface via QueueBackend
// Implements: T-DIST-003, T-DIST-007, T-DIST-008, T-DIST-009, T-DIST-010

import { ok, err } from 'neverthrow';
import type { Frontier, FrontierEntry, FrontierSize } from '@ipf/core/contracts/frontier';
import type { QueueError } from '@ipf/core/errors/queue-error';
import type { AsyncResult } from '@ipf/core/types/result';
import { deriveJobId } from './job-id.js';
import { depthToPriority } from './priority.js';
import type { QueueBackend, JobSpec } from './queue-backend.js';
import type { FrontierConfig } from './frontier-config.js';
import { DEFAULT_FRONTIER_CONFIG } from './frontier-config.js';
import { detectCollisions, type CollisionMetrics, NULL_COLLISION_METRICS } from './collision-detector.js';

/** Options for creating a FrontierAdapter. */
export type FrontierAdapterOptions = {
  readonly backend: QueueBackend;
  readonly config?: FrontierConfig;
  readonly metrics?: CollisionMetrics;
};

/**
 * Frontier adapter wrapping a QueueBackend with dedup, BFS priority,
 * and collision detection.
 *
 * Implements the core Frontier interface (ADR-015 hexagonal pattern).
 * REQ-DIST-001: Dedup via deterministic job IDs from normalized URLs.
 * REQ-DIST-002: BFS ordering via depth-to-priority mapping.
 * REQ-DIST-004: Single batch operation via addBulk.
 */
export function createFrontierAdapter(options: FrontierAdapterOptions): Frontier {
  const config = options.config ?? DEFAULT_FRONTIER_CONFIG;
  const metrics = options.metrics ?? NULL_COLLISION_METRICS;
  const backend = options.backend;

  return {
    enqueue(entries: FrontierEntry[]): AsyncResult<number, QueueError> {
      return enqueueEntries(entries, backend, config, metrics);
    },

    size(): AsyncResult<FrontierSize, QueueError> {
      return backend.getQueueSize();
    },

    close(): Promise<void> {
      return backend.close();
    },
  };
}

/** Build JobSpecs from FrontierEntries and submit as a single batch. */
async function enqueueEntries(
  entries: readonly FrontierEntry[],
  backend: QueueBackend,
  config: FrontierConfig,
  metrics: CollisionMetrics,
): AsyncResult<number, QueueError> {
  if (entries.length === 0) {
    return ok(0);
  }

  // Derive job IDs and build job specs
  const jobMap = new Map<string, JobSpec>();
  for (const entry of entries) {
    const jobId = deriveJobId(entry.url);
    // Dedup within batch: first occurrence wins
    if (!jobMap.has(jobId)) {
      jobMap.set(jobId, {
        jobId,
        data: { url: entry.url, depth: entry.depth },
        priority: depthToPriority(entry.depth),
        attempts: config.retry.attempts,
        backoffType: config.retry.backoffType,
        backoffDelay: config.retry.backoffDelay,
        removeOnComplete: config.retention.completedLimit,
        removeOnFail: config.retention.failedLimit,
      });
    }
  }

  const jobs = Array.from(jobMap.values());
  const result = await backend.addBulk(jobs);

  if (result.isErr()) {
    return err(result.error);
  }

  // REQ-DIST-009: Detect potential collisions
  const uniqueUrls = new Set(entries.map((e) => e.url)).size;
  detectCollisions(jobs.length, result.value.added, uniqueUrls, metrics);

  return ok(result.value.added);
}
