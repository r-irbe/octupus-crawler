// Leader election — Redis SETNX-based leader election with lease renewal
// Implements: T-COORD-014 to 018, REQ-DIST-023 to 027

import { ok, err } from 'neverthrow';
import type { Logger } from '@ipf/core/contracts/logger';
import type { AsyncResult } from '@ipf/core/types/result';
import type { QueueError } from '@ipf/core/errors/queue-error';
import { createQueueError } from '@ipf/core/errors/queue-error';

export type LeaderElectionConfig = {
  readonly coordinatorId: string;
  readonly leaseTtlMs: number;
  readonly leaseKey: string;
};

export const DEFAULT_ELECTION_CONFIG: Omit<LeaderElectionConfig, 'coordinatorId'> = {
  leaseTtlMs: 30_000,
  leaseKey: 'coordinator:leader',
};

// Minimal store interface — can be backed by Redis or any KV store
export type LeaseStore = {
  setNX(key: string, value: string, ttlMs: number): Promise<boolean>;
  setXX(key: string, value: string, ttlMs: number): Promise<boolean>;
  get(key: string): Promise<string | undefined>;
  del(key: string): Promise<void>;
};

export type LeaderElection = {
  readonly tryAcquire: () => AsyncResult<boolean, QueueError>;
  readonly renew: () => AsyncResult<boolean, QueueError>;
  readonly release: () => AsyncResult<void, QueueError>;
  readonly isLeader: () => boolean;
  readonly startRenewal: () => void;
  readonly stopRenewal: () => void;
};

// REQ-DIST-023: leader election via state-store SETNX with TTL
export function createLeaderElection(
  config: LeaderElectionConfig,
  store: LeaseStore,
  logger: Logger,
): LeaderElection {
  let leader = false;
  let renewalTimer: ReturnType<typeof setInterval> | undefined;

  // REQ-DIST-023: SETNX semantics — only one coordinator acquires
  async function tryAcquire(): AsyncResult<boolean, QueueError> {
    try {
      const acquired = await store.setNX(config.leaseKey, config.coordinatorId, config.leaseTtlMs);
      if (acquired) {
        leader = true;
        logger.info('Leadership acquired', { coordinatorId: config.coordinatorId });
      } else {
        leader = false;
        logger.debug('Leadership not acquired, another coordinator is leader');
      }
      return ok(acquired);
    } catch (cause: unknown) {
      return err(createQueueError({ operation: 'leader.tryAcquire', cause }));
    }
  }

  // REQ-DIST-026: renew lease — SET XX (only if existing key)
  async function renew(): AsyncResult<boolean, QueueError> {
    try {
      const renewed = await store.setXX(config.leaseKey, config.coordinatorId, config.leaseTtlMs);
      if (!renewed) {
        // REQ-DIST-027: failed renewal — stop polling, yield
        leader = false;
        logger.warn('Lease renewal failed — lost leadership', { coordinatorId: config.coordinatorId });
      }
      return ok(renewed);
    } catch (cause: unknown) {
      leader = false;
      return err(createQueueError({ operation: 'leader.renew', cause }));
    }
  }

  // REQ-DIST-023: graceful lease release on shutdown (T-COORD-018)
  async function releaseInner(): AsyncResult<void, QueueError> {
    try {
      // Only release if we're still the recorded leader
      const current = await store.get(config.leaseKey);
      if (current === config.coordinatorId) {
        await store.del(config.leaseKey);
        logger.info('Leadership released', { coordinatorId: config.coordinatorId });
      }
      leader = false;
      return ok(undefined);
    } catch (cause: unknown) {
      leader = false;
      return err(createQueueError({ operation: 'leader.release', cause }));
    }
  }

  // REQ-DIST-026: renew at leaseTtl / 3
  function startRenewal(): void {
    if (renewalTimer !== undefined) return;
    const interval = Math.floor(config.leaseTtlMs / 3);
    renewalTimer = setInterval(() => {
      void renew();
    }, interval);
    logger.info('Lease renewal started', { intervalMs: interval });
  }

  function stopRenewal(): void {
    if (renewalTimer !== undefined) {
      clearInterval(renewalTimer);
      renewalTimer = undefined;
      logger.info('Lease renewal stopped');
    }
  }

  return {
    tryAcquire,
    renew,
    release: releaseInner,
    isLeader: (): boolean => leader,
    startRenewal,
    stopRenewal,
  };
}
