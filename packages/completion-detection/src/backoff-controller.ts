// Backoff controller — exponential backoff with skip ticks and abort threshold
// Implements: T-COORD-006, T-COORD-007, REQ-DIST-015

import type { Logger } from '@ipf/core/contracts/logger';

export type BackoffConfig = {
  readonly maxConsecutiveFailures: number;
  readonly maxSkipTicks: number;
};

export const DEFAULT_BACKOFF_CONFIG: BackoffConfig = {
  maxConsecutiveFailures: 25,
  maxSkipTicks: 32,
};

export type BackoffController = {
  readonly onStoreError: (error: unknown) => void;
  readonly onStoreSuccess: () => void;
  readonly shouldSkipTick: () => boolean;
  readonly isAborted: () => boolean;
  readonly consecutiveFailures: () => number;
};

// REQ-DIST-015: exponential backoff in skipped ticks, capped at max interval
export function createBackoffController(
  config: BackoffConfig,
  logger: Logger,
): BackoffController {
  let failures = 0;
  let skipRemaining = 0;
  let aborted = false;

  function onStoreError(error: unknown): void {
    if (aborted) return;
    failures++;
    const msg = error instanceof Error ? error.message : String(error);
    logger.warn('State-store poll error', { consecutive: failures, error: msg });

    // REQ-DIST-015: abort at configured threshold
    if (failures >= config.maxConsecutiveFailures) {
      aborted = true;
      logger.fatal('State-store abort threshold reached', { failures });
      return;
    }

    // Exponential backoff: skip 2^(failures-1) ticks, capped
    const raw = Math.pow(2, failures - 1);
    skipRemaining = Math.min(raw, config.maxSkipTicks);
    logger.info('Backoff active', { skipTicks: skipRemaining });
  }

  function onStoreSuccess(): void {
    if (failures > 0) {
      logger.info('State-store recovered', { previousFailures: failures });
    }
    failures = 0;
    skipRemaining = 0;
  }

  function shouldSkipTick(): boolean {
    if (skipRemaining > 0) {
      skipRemaining--;
      return true;
    }
    return false;
  }

  return {
    onStoreError,
    onStoreSuccess,
    shouldSkipTick,
    isAborted: (): boolean => aborted,
    consecutiveFailures: (): number => failures,
  };
}
