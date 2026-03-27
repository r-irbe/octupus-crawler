// Abort handler — deterministic state-store failure tracking
// Implements: T-LIFE-040, REQ-LIFE-030

import type { Logger } from '@ipf/core/contracts/logger';

export type AbortConfig = {
  readonly maxConsecutiveFailures: number;
};

export const DEFAULT_ABORT_CONFIG: AbortConfig = {
  maxConsecutiveFailures: 25,
};

export type AbortCallback = (reason: string) => void;

export type AbortHandler = {
  readonly recordFailure: () => void;
  readonly recordSuccess: () => void;
  readonly consecutiveFailures: () => number;
};

// REQ-LIFE-030: abort at exactly N consecutive failures, within 1s
export function createAbortHandler(
  config: AbortConfig,
  logger: Logger,
  onAbort: AbortCallback,
): AbortHandler {
  let failures = 0;
  let aborted = false;

  function recordFailure(): void {
    if (aborted) return;
    failures++;
    logger.warn('State-store failure recorded', {
      consecutive: failures,
      threshold: config.maxConsecutiveFailures,
    });

    if (failures >= config.maxConsecutiveFailures) {
      aborted = true;
      logger.fatal('State-store abort threshold reached', { failures });
      onAbort(`state-store exhausted after ${String(failures)} consecutive failures`);
    }
  }

  function recordSuccess(): void {
    if (failures > 0) {
      logger.info('State-store recovered', { previousFailures: failures });
    }
    failures = 0;
  }

  return {
    recordFailure,
    recordSuccess,
    consecutiveFailures: (): number => failures,
  };
}
