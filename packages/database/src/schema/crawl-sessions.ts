// Drizzle schema definition for crawl_sessions table
// Implements: T-DATA-011 (REQ-DATA-005)

import { bigint, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const crawlSessions = pgTable('crawl_sessions', {
  id: bigint({ mode: 'bigint' }).primaryKey().generatedAlwaysAsIdentity(),
  name: text().notNull(),
  config: jsonb().notNull().default({}),
  status: text().notNull().default('active'),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp('ended_at', { withTimezone: true }),
});
