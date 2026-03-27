// Completion detector — poll loop, completion check, empty-queue guard, restart detection
// Implements: T-COORD-001 to 005, REQ-DIST-012 to 014, REQ-DIST-016

import type { Logger } from '@ipf/core/contracts/logger';
import type { CrawlMetrics } from '@ipf/core/contracts/crawl-metrics';
import type { AsyncResult } from '@ipf/core/types/result';
import type { QueueError } from '@ipf/core/errors/queue-error';
import type { BackoffController } from './backoff-controller.js';

export type QueueCounts = {
  readonly pending: number;
  readonly done: number;
};

export type QueueCountsFn = () => AsyncResult<QueueCounts, QueueError>;

export type CompletionOutcome =
  | { readonly _tag: 'Completed'; readonly done: number }
  | { readonly _tag: 'EmptyComplete' }
  | { readonly _tag: 'Aborted'; readonly failures: number };

export type CompletionDetectorConfig = {
  readonly pollIntervalMs: number;
};

export const DEFAULT_DETECTOR_CONFIG: CompletionDetectorConfig = {
  pollIntervalMs: 1_000,
};

export type CompletionDetectorDeps = {
  readonly config: CompletionDetectorConfig;
  readonly getQueueCounts: QueueCountsFn;
  readonly backoff: BackoffController;
  readonly logger: Logger;
  readonly metrics: CrawlMetrics;
};

// REQ-DIST-016: callable at most once per coordinator instance
export function createCompletionDetector(deps: CompletionDetectorDeps): {
  waitForCompletion: () => Promise<CompletionOutcome>;
} {
  let called = false;

  async function waitForCompletion(): Promise<CompletionOutcome> {
    // REQ-DIST-016: once guard
    if (called) {
      throw new Error('waitForCompletion already called — overlapping polls prevented');
    }
    called = true;

    let emptyPollCount = 0;
    let isFirstPoll = true;

    return new Promise<CompletionOutcome>((resolve) => {
      const timer = setInterval(() => {
        void tick().then((outcome) => {
          if (outcome !== undefined) {
            clearInterval(timer);
            resolve(outcome);
          }
        });
      }, deps.config.pollIntervalMs);

      async function tick(): Promise<CompletionOutcome | undefined> {
        // Check backoff abort
        if (deps.backoff.isAborted()) {
          return { _tag: 'Aborted', failures: deps.backoff.consecutiveFailures() };
        }

        // Check backoff skip
        if (deps.backoff.shouldSkipTick()) {
          return undefined;
        }

        const result = await deps.getQueueCounts();

        if (result.isErr()) {
          deps.backoff.onStoreError(result.error);
          if (deps.backoff.isAborted()) {
            return { _tag: 'Aborted', failures: deps.backoff.consecutiveFailures() };
          }
          return undefined;
        }

        deps.backoff.onStoreSuccess();
        const counts = result.value;

        // REQ-DIST-014: restart detection — done>0 but no live events on first poll
        if (isFirstPoll && counts.done > 0) {
          deps.logger.warn('Restart detected: done>0 on first poll', { done: counts.done });
          deps.metrics.incrementCoordinatorRestarts();
        }
        isFirstPoll = false;

        // REQ-DIST-012: normal completion — pending=0 AND done>0
        if (counts.pending === 0 && counts.done > 0) {
          deps.logger.info('Crawl complete', { done: counts.done });
          return { _tag: 'Completed', done: counts.done };
        }

        // REQ-DIST-013: empty queue — pending=0 AND done=0 for two consecutive polls
        if (counts.pending === 0 && counts.done === 0) {
          emptyPollCount++;
          if (emptyPollCount >= 2) {
            deps.logger.warn('Empty queue on two consecutive polls, resolving with zero stats');
            return { _tag: 'EmptyComplete' };
          }
        } else {
          emptyPollCount = 0;
        }

        return undefined;
      }
    });
  }

  return { waitForCompletion };
}
