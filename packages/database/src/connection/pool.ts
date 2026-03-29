// PostgreSQL connection pool with configurable sizing and deterministic cleanup
// Implements: T-DATA-012 (REQ-DATA-015, REQ-DATA-017) — connection pooling
//             T-DATA-013 (REQ-DATA-018) — Symbol.dispose for `using` keyword

import pg from 'pg';
import { err, ok, type Result } from 'neverthrow';
import { z } from 'zod';
import type { DataError } from '../errors.js';
import { createConnectionFailed, createTimeout } from '../errors.js';

// --- Pool configuration schema ---

export const PoolConfigSchema = z.object({
  connectionString: z.string().min(1),
  min: z.number().int().nonnegative().default(2),
  max: z.number().int().positive().default(20),
  idleTimeoutMillis: z.number().int().positive().default(30_000),
  connectionTimeoutMillis: z.number().int().positive().default(5_000),
  statementTimeout: z.number().int().positive().default(10_000),
});

export type PoolConfig = z.infer<typeof PoolConfigSchema>;

// --- Pool wrapper with dispose support ---

export type DatabasePool = {
  /** Get a client from the pool for transactional work. */
  readonly connect: () => Promise<Result<pg.PoolClient, DataError>>;
  /** Execute a query directly on the pool (auto-releases client). */
  readonly query: (text: string, values?: readonly unknown[]) => Promise<Result<pg.QueryResult, DataError>>;
  /** Total number of clients in pool (active + idle). */
  readonly totalCount: () => number;
  /** Number of idle clients. */
  readonly idleCount: () => number;
  /** Number of clients awaiting checkout. */
  readonly waitingCount: () => number;
  /** Gracefully drain and close the pool. */
  readonly end: () => Promise<void>;
  /** Symbol.dispose for `using` keyword support. */
  readonly [Symbol.asyncDispose]: () => Promise<void>;
};

export function createPool(config: PoolConfig): DatabasePool {
  const pool = new pg.Pool({
    connectionString: config.connectionString,
    min: config.min,
    max: config.max,
    idleTimeoutMillis: config.idleTimeoutMillis,
    connectionTimeoutMillis: config.connectionTimeoutMillis,
    statement_timeout: config.statementTimeout,
  });

  const connect = async (): Promise<Result<pg.PoolClient, DataError>> => {
    try {
      const client = await pool.connect();
      return ok(client);
    } catch (cause: unknown) {
      return err(createConnectionFailed(cause));
    }
  };

  const query = async (
    text: string,
    values?: readonly unknown[],
  ): Promise<Result<pg.QueryResult, DataError>> => {
    try {
      const result = await pool.query(text, values as unknown[]);
      return ok(result);
    } catch (cause: unknown) {
      if (cause instanceof Error && cause.message.includes('timeout')) {
        return err(createTimeout('query', config.statementTimeout));
      }
      return err(createConnectionFailed(cause));
    }
  };

  const end = async (): Promise<void> => {
    await pool.end();
  };

  return {
    connect,
    query,
    totalCount: () => pool.totalCount,
    idleCount: () => pool.idleCount,
    waitingCount: () => pool.waitingCount,
    end,
    [Symbol.asyncDispose]: end,
  };
}
