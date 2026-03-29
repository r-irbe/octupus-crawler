// Drizzle schema definition for crawl_links table
// Implements: T-DATA-010 (REQ-DATA-004)

import { bigint, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { primaryKey } from 'drizzle-orm/pg-core';
import { crawlUrls } from './crawl-urls.js';

export const crawlLinks = pgTable('crawl_links', {
  sourceUrlId: bigint('source_url_id', { mode: 'bigint' }).notNull().references(() => crawlUrls.id),
  targetUrlId: bigint('target_url_id', { mode: 'bigint' }).notNull().references(() => crawlUrls.id),
  anchorText: text('anchor_text'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.sourceUrlId, table.targetUrlId] }),
]);
