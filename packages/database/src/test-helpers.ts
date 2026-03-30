// Test helper: bootstraps a PostgreSQL Testcontainer with the crawl_urls schema
// and provides both raw pool (for admin operations) and Drizzle DB instance.

import pg from 'pg';
import {
  startPostgresContainer,
  type ManagedPostgresContainer,
} from '@ipf/testing/containers/postgres';
import { createDrizzle, type DrizzleDB } from './connection/drizzle.js';

// SYNC WARNING: This SQL must match the Drizzle schema in schema/crawl-urls.ts.
// Once T-DATA-007/T-DATA-008 (Prisma migrations) are implemented, replace this
// with `prisma migrate deploy` or `drizzle-kit push` for single-source-of-truth.
const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS crawl_urls (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  url TEXT NOT NULL,
  url_hash TEXT NOT NULL,
  domain TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  status_code INTEGER,
  content_type TEXT,
  s3_key TEXT,
  depth INTEGER NOT NULL DEFAULT 0,
  discovered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  fetched_at TIMESTAMPTZ,
  parent_url_id BIGINT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_crawl_urls_hash ON crawl_urls (url_hash);
CREATE INDEX IF NOT EXISTS idx_crawl_urls_domain ON crawl_urls (domain);
CREATE INDEX IF NOT EXISTS idx_crawl_urls_status ON crawl_urls (status);
`;

export type TestDatabase = {
  readonly db: DrizzleDB;
  readonly connectionString: string;
  readonly truncate: () => Promise<void>;
  readonly stop: () => Promise<void>;
};

export async function startTestDatabase(): Promise<TestDatabase> {
  const container: ManagedPostgresContainer = await startPostgresContainer();
  const pool = new pg.Pool({
    connectionString: container.connection.connectionString,
  });

  await pool.query(CREATE_TABLE_SQL);
  const db = createDrizzle(pool);

  return {
    db,
    connectionString: container.connection.connectionString,
    async truncate(): Promise<void> {
      await pool.query('TRUNCATE crawl_urls RESTART IDENTITY');
    },
    async stop(): Promise<void> {
      await pool.end();
      await container.stop();
    },
  };
}
