// Failover controller — standby acquires lease, re-derives state on takeover
// Implements: T-COORD-016, REQ-DIST-024, REQ-DIST-025

import type { LeaderElection } from './leader-election.js';
import type { Logger } from '@ipf/core/contracts/logger';

export type FailoverConfig = {
  readonly pollIntervalMs: number;
};

export const DEFAULT_FAILOVER_CONFIG: FailoverConfig = {
  pollIntervalMs: 5_000,
};

export type FailoverController = {
  readonly start: () => void;
  readonly stop: () => void;
  readonly isActive: () => boolean;
};

/**
 * Standby coordinator that polls for lease availability.
 * REQ-DIST-024: When active coordinator loses lease, standby acquires within one TTL.
 * REQ-DIST-025: On takeover, re-derive state from state store (injected callback).
 */
export function createFailoverController(
  election: LeaderElection,
  onBecameLeader: () => Promise<void>,
  logger: Logger,
  config: FailoverConfig = DEFAULT_FAILOVER_CONFIG,
): FailoverController {
  let timer: ReturnType<typeof setInterval> | undefined;
  let active = false;

  async function attemptAcquire(): Promise<void> {
    if (election.isLeader()) return;

    const result = await election.tryAcquire();
    if (result.isErr()) {
      logger.warn('Failover lease acquisition failed', { error: result.error.message });
      return;
    }

    if (result.value) {
      // REQ-DIST-025: re-derive state from state store
      logger.info('Failover: acquired leadership, re-deriving state');
      election.startRenewal();
      await onBecameLeader();
    }
  }

  function start(): void {
    if (active) return;
    active = true;
    timer = setInterval(() => {
      void attemptAcquire();
    }, config.pollIntervalMs);
    logger.info('Failover controller started', { pollIntervalMs: config.pollIntervalMs });
  }

  function stop(): void {
    if (timer !== undefined) {
      clearInterval(timer);
      timer = undefined;
    }
    active = false;
    logger.info('Failover controller stopped');
  }

  return {
    start,
    stop,
    isActive: (): boolean => active,
  };
}
