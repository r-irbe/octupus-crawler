// Drizzle schema definition for crawl_urls table
// Implements: T-DATA-009 (REQ-DATA-002, REQ-DATA-003, REQ-DATA-007)

import { bigint, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

export const crawlUrls = pgTable('crawl_urls', {
  id: bigint({ mode: 'bigint' }).primaryKey().generatedAlwaysAsIdentity(),
  url: text().notNull(),
  urlHash: text('url_hash').notNull(),
  domain: text().notNull(),
  status: text().notNull().default('pending'),
  statusCode: integer('status_code'),
  contentType: text('content_type'),
  s3Key: text('s3_key'),
  depth: integer().notNull().default(0),
  discoveredAt: timestamp('discovered_at', { withTimezone: true }).notNull().defaultNow(),
  fetchedAt: timestamp('fetched_at', { withTimezone: true }),
  parentUrlId: bigint('parent_url_id', { mode: 'bigint' }),
  metadata: jsonb().notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('idx_crawl_urls_hash').on(table.urlHash),
  index('idx_crawl_urls_domain').on(table.domain),
  index('idx_crawl_urls_status').on(table.status),
]);
