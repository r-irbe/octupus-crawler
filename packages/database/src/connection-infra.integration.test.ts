// Connection infrastructure integration tests — pool, circuit breaker, shutdown
// Validates: T-DATA-031 (REQ-DATA-020), T-DATA-032 (REQ-DATA-018), T-DATA-033 (REQ-DATA-019)

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { ok, err, type Result } from 'neverthrow';
import { CircuitState } from 'cockatiel';
import {
  startPostgresContainer,
  type ManagedPostgresContainer,
} from '@ipf/testing/containers/postgres';
import { createPool, type PoolConfig } from './connection/pool.js';
import { createDatabaseCircuitBreaker } from './connection/circuit-breaker.js';
import { createShutdownHandle } from './connection/shutdown.js';
import { createConnectionFailed } from './errors.js';
import type { DataError } from './errors.js';

function poolConfig(connStr: string): PoolConfig {
  return {
    connectionString: connStr,
    min: 1,
    max: 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
    statementTimeout: 5_000,
  };
}

describe('Connection pool integration', () => {
  let container: ManagedPostgresContainer;

  beforeAll(async () => {
    container = await startPostgresContainer();
  }, 60_000);

  afterAll(async () => {
    await container.stop();
  });

  // T-DATA-032: Pool lifecycle — connect, query, end
  it('creates pool, executes query, and closes', async () => {
    const pool = createPool(poolConfig(container.connection.connectionString));

    const result = await pool.query('SELECT 1 AS value');
    expect(result.isOk()).toBe(true);

    await pool.end();
  });

  // T-DATA-032: Pool counters
  it('reports pool statistics', async () => {
    const pool = createPool(poolConfig(container.connection.connectionString));

    await pool.query('SELECT 1');
    expect(pool.totalCount()).toBeGreaterThanOrEqual(1);
    expect(pool.waitingCount()).toBe(0);

    await pool.end();
  });

  // T-DATA-032: Symbol.asyncDispose support
  it('supports asyncDispose for cleanup', async () => {
    const pool = createPool({
      ...poolConfig(container.connection.connectionString),
      max: 2,
    });

    expect(pool[Symbol.asyncDispose]).toBeDefined();
    await pool.query('SELECT 1');
    await pool[Symbol.asyncDispose]();

    // After dispose, queries should fail
    const result = await pool.query('SELECT 1');
    expect(result.isErr()).toBe(true);
  });
});

describe('Circuit breaker integration', () => {
  let container: ManagedPostgresContainer;

  beforeAll(async () => {
    container = await startPostgresContainer();
  }, 60_000);

  afterAll(async () => {
    await container.stop();
  });

  // T-DATA-031: Circuit breaker opens after consecutive failures
  it('opens after consecutive failures', async () => {
    const cb = createDatabaseCircuitBreaker({ threshold: 2, halfOpenAfterMs: 60_000 });

    // Use a pool pointing to unreachable host via our wrapped pool
    const badPool = createPool({
      connectionString: 'postgresql://nouser:nopass@127.0.0.1:1/nodb',
      min: 0,
      max: 1,
      idleTimeoutMillis: 1_000,
      connectionTimeoutMillis: 200,
      statementTimeout: 200,
    });

    const failingOp = (): Promise<Result<undefined, DataError>> =>
      badPool.query('SELECT 1').then(
        (r) => (r.isOk() ? ok(undefined) : err(r.error)),
        (cause: unknown) => err(createConnectionFailed(cause)),
      );

    // Two failures trip the circuit (threshold=2)
    await cb.execute(failingOp);
    await cb.execute(failingOp);

    // Third should get CircuitOpen (not even attempt the query)
    const result = await cb.execute(() => Promise.resolve(ok(undefined)));
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()._tag).toBe('CircuitOpen');

    await badPool.end();
  });

  // T-DATA-031: Circuit stays closed with healthy DB
  it('stays closed with successful operations', async () => {
    const cb = createDatabaseCircuitBreaker({ threshold: 3, halfOpenAfterMs: 30_000 });
    const pool = createPool(poolConfig(container.connection.connectionString));

    for (let i = 0; i < 5; i++) {
      const result = await cb.execute(async () => {
        const qr = await pool.query('SELECT 1');
        return qr.isOk() ? ok(qr.value) : err(qr.error);
      });
      expect(result.isOk()).toBe(true);
    }

    expect(cb.state()).toBe(CircuitState.Closed);
    await pool.end();
  });
});

describe('Graceful shutdown integration', () => {
  let container: ManagedPostgresContainer;

  beforeAll(async () => {
    container = await startPostgresContainer();
  }, 60_000);

  afterAll(async () => {
    await container.stop();
  });

  afterEach(() => {
    process.removeAllListeners('SIGTERM');
    process.removeAllListeners('SIGINT');
  });

  // T-DATA-033: Graceful shutdown drains in-flight queries
  it('shutdown waits for active query then closes pool', async () => {
    const pool = createPool({
      ...poolConfig(container.connection.connectionString),
      statementTimeout: 10_000,
    });

    // Start a slow query
    const queryPromise = pool.query('SELECT pg_sleep(0.1)');

    // Create shutdown handle and trigger shutdown
    const handle = createShutdownHandle(pool);
    const shutdownPromise = handle.shutdown();

    // Both should complete without error
    const [queryResult] = await Promise.all([queryPromise, shutdownPromise]);
    expect(queryResult.isOk()).toBe(true);
    expect(handle.isShuttingDown()).toBe(true);

    handle.dispose();
  });
});
