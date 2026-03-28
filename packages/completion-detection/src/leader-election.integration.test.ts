// Integration tests for leader election, state-store, and failover with real Redis
// Validates: T-COORD-025 (REQ-DIST-021), T-COORD-026 (REQ-DIST-023), T-COORD-027 (REQ-DIST-024)
// Uses Redis Testcontainer — requires Docker

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type RedisClientType } from 'redis';
import { startRedisContainer, type ManagedRedisContainer } from '@ipf/testing/containers/redis';
import type { Logger } from '@ipf/core/contracts/logger';
import { createLeaderElection, type LeaseStore, type LeaderElectionConfig } from './leader-election.js';
import { buildConnectionUrl, parseConnectionUrl } from './state-store-connection.js';
import { createFailoverController } from './failover-controller.js';

// --- Helpers ---

function silentLogger(): Logger {
  const noop = (): void => undefined;
  return {
    debug: noop, info: noop, warn: noop, error: noop, fatal: noop,
    child: () => silentLogger(),
  } as Logger;
}

/** Redis-backed LeaseStore adapter — bridges the port interface to real Redis. */
function createRedisLeaseStore(client: RedisClientType): LeaseStore {
  return {
    async setNX(key: string, value: string, ttlMs: number): Promise<boolean> {
      const result = await client.set(key, value, { NX: true, PX: ttlMs });
      return result === 'OK';
    },
    async setXX(key: string, value: string, ttlMs: number): Promise<boolean> {
      const result = await client.set(key, value, { XX: true, PX: ttlMs });
      return result === 'OK';
    },
    async get(key: string): Promise<string | undefined> {
      const result = await client.get(key);
      return result ?? undefined;
    },
    async del(key: string): Promise<void> {
      await client.del(key);
    },
  };
}

// --- Test Suite ---

describe('State-Store + Leader Election Integration (Redis)', () => {
  let container: ManagedRedisContainer;
  let client1: RedisClientType;
  let client2: RedisClientType;

  beforeAll(async () => {
    container = await startRedisContainer();
    client1 = createClient({ url: container.connection.url }) as RedisClientType;
    client2 = createClient({ url: container.connection.url }) as RedisClientType;
    await client1.connect();
    await client2.connect();
  }, 30_000);

  afterAll(async () => {
    await client1.quit().catch(() => undefined);
    await client2.quit().catch(() => undefined);
    await container.stop();
  });

  // --- T-COORD-025: state-store connection with auth ---

  describe('T-COORD-025: state-store connection', () => {
    // Validates REQ-DIST-021: state-store connection with host, port, auth
    it('connects to Redis via parsed connection URL', async () => {
      const config = parseConnectionUrl(container.connection.url);
      const url = buildConnectionUrl(config);
      const testClient = createClient({ url }) as RedisClientType;
      await testClient.connect();
      const pong = await testClient.ping();
      expect(pong).toBe('PONG');
      await testClient.quit();
    });

    // Validates REQ-DIST-021: supports database namespace
    it('isolates data across Redis databases', async () => {
      const url0 = `${container.connection.url}/0`;
      const url1 = `${container.connection.url}/1`;
      const c0 = createClient({ url: url0 }) as RedisClientType;
      const c1 = createClient({ url: url1 }) as RedisClientType;
      await c0.connect();
      await c1.connect();

      await c0.set('isolation-key', 'db0-value');
      const fromDb0 = await c0.get('isolation-key');
      const fromDb1 = await c1.get('isolation-key');

      expect(fromDb0).toBe('db0-value');
      expect(fromDb1).toBeNull();

      await c0.del('isolation-key');
      await c0.quit();
      await c1.quit();
    });
  });

  // --- T-COORD-026: leader election (two coordinators) ---

  describe('T-COORD-026: leader election', () => {
    const LEASE_KEY = 'test:leader:026';

    function electionConfig(coordinatorId: string): LeaderElectionConfig {
      return { coordinatorId, leaseTtlMs: 5_000, leaseKey: LEASE_KEY };
    }

    // Validates REQ-DIST-023: only one coordinator acquires leadership
    it('only one of two coordinators acquires the lease', async () => {
      await client1.del(LEASE_KEY);

      const store1 = createRedisLeaseStore(client1);
      const store2 = createRedisLeaseStore(client2);
      const e1 = createLeaderElection(electionConfig('coord-a'), store1, silentLogger());
      const e2 = createLeaderElection(electionConfig('coord-b'), store2, silentLogger());

      const [r1, r2] = await Promise.all([e1.tryAcquire(), e2.tryAcquire()]);

      expect(r1.isOk()).toBe(true);
      expect(r2.isOk()).toBe(true);

      // Exactly one should be leader
      const leaders = [e1.isLeader(), e2.isLeader()].filter(Boolean);
      expect(leaders).toHaveLength(1);

      // Cleanup
      if (e1.isLeader()) await e1.release();
      if (e2.isLeader()) await e2.release();
    });

    // Validates REQ-DIST-023: lease is stored in Redis with correct value
    it('stores coordinator ID in the lease key', async () => {
      await client1.del(LEASE_KEY);

      const store = createRedisLeaseStore(client1);
      const election = createLeaderElection(electionConfig('coord-x'), store, silentLogger());
      await election.tryAcquire();

      const storedValue = await client1.get(LEASE_KEY);
      expect(storedValue).toBe('coord-x');

      await election.release();
    });

    // Validates REQ-DIST-026: renewal extends the lease
    it('renews the lease successfully', async () => {
      await client1.del(LEASE_KEY);

      const store = createRedisLeaseStore(client1);
      const election = createLeaderElection(electionConfig('coord-r'), store, silentLogger());
      await election.tryAcquire();

      const renewResult = await election.renew();
      expect(renewResult.isOk()).toBe(true);
      if (renewResult.isOk()) expect(renewResult.value).toBe(true);

      // Lease should still be held
      const storedValue = await client1.get(LEASE_KEY);
      expect(storedValue).toBe('coord-r');

      await election.release();
    });

    // Validates REQ-DIST-023: released lease can be acquired by another
    it('second coordinator acquires after first releases', async () => {
      await client1.del(LEASE_KEY);

      const store1 = createRedisLeaseStore(client1);
      const store2 = createRedisLeaseStore(client2);
      const e1 = createLeaderElection(electionConfig('first'), store1, silentLogger());
      const e2 = createLeaderElection(electionConfig('second'), store2, silentLogger());

      await e1.tryAcquire();
      expect(e1.isLeader()).toBe(true);

      await e1.release();
      expect(e1.isLeader()).toBe(false);

      const r2 = await e2.tryAcquire();
      expect(r2.isOk()).toBe(true);
      expect(e2.isLeader()).toBe(true);

      await e2.release();
    });
  });

  // --- T-COORD-027: failover (leader crash, standby takeover) ---

  describe('T-COORD-027: failover', () => {
    const LEASE_KEY = 'test:leader:027';
    const SHORT_TTL = 500; // Short TTL for fast test

    function shortConfig(id: string): LeaderElectionConfig {
      return { coordinatorId: id, leaseTtlMs: SHORT_TTL, leaseKey: LEASE_KEY };
    }

    // Validates REQ-DIST-024: standby acquires within one TTL after leader loss
    it('standby acquires lease after leader lease expires', async () => {
      await client1.del(LEASE_KEY);

      const store1 = createRedisLeaseStore(client1);
      const store2 = createRedisLeaseStore(client2);
      const leader = createLeaderElection(shortConfig('leader'), store1, silentLogger());
      const standby = createLeaderElection(shortConfig('standby'), store2, silentLogger());

      // Leader acquires
      await leader.tryAcquire();
      expect(leader.isLeader()).toBe(true);

      // Standby cannot acquire — lease held
      const r1 = await standby.tryAcquire();
      expect(r1.isOk()).toBe(true);
      expect(standby.isLeader()).toBe(false);

      // Simulate leader crash: stop renewal and wait for lease to expire
      leader.stopRenewal();
      await new Promise((r) => setTimeout(r, SHORT_TTL + 100));

      // Standby should now acquire
      const r2 = await standby.tryAcquire();
      expect(r2.isOk()).toBe(true);
      expect(standby.isLeader()).toBe(true);

      await standby.release();
    });

    // Validates REQ-DIST-024: failover controller polls and acquires
    it('failover controller detects leader loss and takes over', async () => {
      await client1.del(LEASE_KEY);

      const store1 = createRedisLeaseStore(client1);
      const store2 = createRedisLeaseStore(client2);
      const leader = createLeaderElection(shortConfig('primary'), store1, silentLogger());
      const standbyElection = createLeaderElection(shortConfig('standby'), store2, silentLogger());

      // Primary acquires
      await leader.tryAcquire();
      expect(leader.isLeader()).toBe(true);

      // Start failover controller for standby
      let tookOver = false;
      const failover = createFailoverController(
        standbyElection,
        () => { tookOver = true; return Promise.resolve(); },
        silentLogger(),
        { pollIntervalMs: 100 },
      );
      failover.start();

      // Simulate primary crash
      leader.stopRenewal();
      await new Promise((r) => setTimeout(r, SHORT_TTL + 300));

      // Failover should have happened
      expect(standbyElection.isLeader()).toBe(true);
      expect(tookOver).toBe(true);

      failover.stop();
      await standbyElection.release();
    });
  });
});
