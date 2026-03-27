// Unit tests for leader election
// Validates REQ-DIST-023, REQ-DIST-026, REQ-DIST-027

import { describe, it, expect, vi, afterEach } from 'vitest';
import type { Logger } from '@ipf/core/contracts/logger';
import { createLeaderElection } from './leader-election.js';
import type { LeaseStore, LeaderElectionConfig } from './leader-election.js';

function recLogger(): Logger {
  const noop = (): void => undefined;
  return {
    debug: noop, info: noop, warn: noop, error: noop, fatal: noop,
    child: () => recLogger(),
  } as Logger;
}

function stubStore(overrides: Partial<LeaseStore> = {}): LeaseStore {
  return {
    setNX: vi.fn(() => Promise.resolve(true)),
    setXX: vi.fn(() => Promise.resolve(true)),
    get: vi.fn(() => Promise.resolve(undefined)),
    del: vi.fn(() => Promise.resolve()),
    ...overrides,
  };
}

const TEST_CONFIG: LeaderElectionConfig = {
  coordinatorId: 'coord-1',
  leaseTtlMs: 3_000,
  leaseKey: 'test:leader',
};

afterEach(() => {
  vi.useRealTimers();
});

describe('LeaderElection', () => {
  // REQ-DIST-023: SETNX semantics — only one coordinator acquires
  describe('tryAcquire', () => {
    it('acquires leadership when SETNX succeeds', async () => {
      const store = stubStore({ setNX: vi.fn(() => Promise.resolve(true)) });
      const election = createLeaderElection(TEST_CONFIG, store, recLogger());
      const result = await election.tryAcquire();
      expect(result.isOk()).toBe(true);
      if (result.isOk()) expect(result.value).toBe(true);
      expect(election.isLeader()).toBe(true);
    });

    it('does not acquire when SETNX fails', async () => {
      const store = stubStore({ setNX: vi.fn(() => Promise.resolve(false)) });
      const election = createLeaderElection(TEST_CONFIG, store, recLogger());
      const result = await election.tryAcquire();
      expect(result.isOk()).toBe(true);
      if (result.isOk()) expect(result.value).toBe(false);
      expect(election.isLeader()).toBe(false);
    });

    it('returns error when store throws', async () => {
      const store = stubStore({
        setNX: vi.fn(() => Promise.reject(new Error('connection refused'))),
      });
      const election = createLeaderElection(TEST_CONFIG, store, recLogger());
      const result = await election.tryAcquire();
      expect(result.isErr()).toBe(true);
      if (result.isErr()) expect(result.error.operation).toBe('leader.tryAcquire');
    });
  });

  // REQ-DIST-026: lease renewal SET XX
  describe('renew', () => {
    it('renews lease when SET XX succeeds', async () => {
      const store = stubStore({ setXX: vi.fn(() => Promise.resolve(true)) });
      const election = createLeaderElection(TEST_CONFIG, store, recLogger());
      await election.tryAcquire();
      const result = await election.renew();
      expect(result.isOk()).toBe(true);
      if (result.isOk()) expect(result.value).toBe(true);
      expect(election.isLeader()).toBe(true);
    });

    // REQ-DIST-027: lost leadership on failed renewal
    it('loses leadership when SET XX fails', async () => {
      const store = stubStore({
        setNX: vi.fn(() => Promise.resolve(true)),
        setXX: vi.fn(() => Promise.resolve(false)),
      });
      const election = createLeaderElection(TEST_CONFIG, store, recLogger());
      await election.tryAcquire();
      expect(election.isLeader()).toBe(true);
      const result = await election.renew();
      expect(result.isOk()).toBe(true);
      if (result.isOk()) expect(result.value).toBe(false);
      expect(election.isLeader()).toBe(false);
    });

    it('returns error and loses leadership when store throws', async () => {
      const store = stubStore({
        setNX: vi.fn(() => Promise.resolve(true)),
        setXX: vi.fn(() => Promise.reject(new Error('timeout'))),
      });
      const election = createLeaderElection(TEST_CONFIG, store, recLogger());
      await election.tryAcquire();
      const result = await election.renew();
      expect(result.isErr()).toBe(true);
      expect(election.isLeader()).toBe(false);
    });
  });

  // REQ-DIST-023: graceful release (T-COORD-018)
  describe('release', () => {
    it('releases lease when current leader', async () => {
      const store = stubStore({
        setNX: vi.fn(() => Promise.resolve(true)),
        get: vi.fn(() => Promise.resolve('coord-1')),
      });
      const election = createLeaderElection(TEST_CONFIG, store, recLogger());
      await election.tryAcquire();
      const result = await election.release();
      expect(result.isOk()).toBe(true);
      expect(election.isLeader()).toBe(false);
      expect(store.del).toHaveBeenCalledWith('test:leader');
    });

    it('does not delete lease when another coordinator owns it', async () => {
      const store = stubStore({
        setNX: vi.fn(() => Promise.resolve(true)),
        get: vi.fn(() => Promise.resolve('coord-2')), // different coordinator
      });
      const election = createLeaderElection(TEST_CONFIG, store, recLogger());
      await election.tryAcquire();
      const result = await election.release();
      expect(result.isOk()).toBe(true);
      expect(store.del).not.toHaveBeenCalled();
      expect(election.isLeader()).toBe(false);
    });

    it('returns error when store throws during release', async () => {
      const store = stubStore({
        setNX: vi.fn(() => Promise.resolve(true)),
        get: vi.fn(() => Promise.reject(new Error('network'))),
      });
      const election = createLeaderElection(TEST_CONFIG, store, recLogger());
      await election.tryAcquire();
      const result = await election.release();
      expect(result.isErr()).toBe(true);
      expect(election.isLeader()).toBe(false);
    });
  });

  // REQ-DIST-026: renewal timer at leaseTtl / 3
  describe('startRenewal / stopRenewal', () => {
    it('starts and stops renewal timer', () => {
      vi.useFakeTimers();
      const store = stubStore();
      const election = createLeaderElection(TEST_CONFIG, store, recLogger());
      election.startRenewal();
      // leaseTtlMs=3000 → renewal every 1000ms
      vi.advanceTimersByTime(3_000);
      // 3 renewal calls
      expect(store.setXX).toHaveBeenCalledTimes(3);

      election.stopRenewal();
      vi.advanceTimersByTime(3_000);
      // still 3 — no more calls after stop
      expect(store.setXX).toHaveBeenCalledTimes(3);
    });

    it('is idempotent — second startRenewal does nothing', () => {
      vi.useFakeTimers();
      const store = stubStore();
      const election = createLeaderElection(TEST_CONFIG, store, recLogger());
      election.startRenewal();
      election.startRenewal(); // ignored
      vi.advanceTimersByTime(1_000);
      expect(store.setXX).toHaveBeenCalledTimes(1);
      election.stopRenewal();
    });
  });
});
