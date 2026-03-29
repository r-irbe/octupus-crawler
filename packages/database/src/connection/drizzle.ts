// Drizzle database instance factory
// Implements: T-DATA-018 (REQ-DATA-009, REQ-DATA-015) — Drizzle ORM for complex queries with connection pooling

import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import type pg from 'pg';
import * as schema from '../schema/crawl-urls.js';

export type DrizzleDB = NodePgDatabase<typeof schema>;

/** Create a Drizzle database instance from an existing pg.Pool. */
export function createDrizzle(pool: pg.Pool): DrizzleDB {
  return drizzle(pool, { schema });
}
