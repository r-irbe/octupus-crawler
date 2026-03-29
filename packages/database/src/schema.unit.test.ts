// Unit tests for Drizzle schema definitions
// Validates: T-DATA-009 (REQ-DATA-002), T-DATA-010 (REQ-DATA-004), T-DATA-011 (REQ-DATA-005)

import { describe, expect, it } from 'vitest';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { crawlUrls } from './schema/crawl-urls.js';
import { crawlLinks } from './schema/crawl-links.js';
import { crawlSessions } from './schema/crawl-sessions.js';

describe('crawlUrls schema', () => {
  // Validates REQ-DATA-002: crawl_urls table stores URL metadata
  const config = getTableConfig(crawlUrls);

  it('maps to crawl_urls table', () => {
    expect(config.name).toBe('crawl_urls');
  });

  it('defines all required columns', () => {
    const columnNames = config.columns.map((c) => c.name);
    expect(columnNames).toContain('id');
    expect(columnNames).toContain('url');
    expect(columnNames).toContain('url_hash');
    expect(columnNames).toContain('domain');
    expect(columnNames).toContain('status');
    expect(columnNames).toContain('status_code');
    expect(columnNames).toContain('content_type');
    expect(columnNames).toContain('s3_key');
    expect(columnNames).toContain('depth');
    expect(columnNames).toContain('discovered_at');
    expect(columnNames).toContain('fetched_at');
    expect(columnNames).toContain('parent_url_id');
    expect(columnNames).toContain('metadata');
  });

  it('has id as primary key', () => {
    const idCol = config.columns.find((c) => c.name === 'id');
    expect(idCol?.primary).toBe(true);
  });

  it('has not-null constraints on required columns', () => {
    const notNullCols = config.columns
      .filter((c) => c.notNull)
      .map((c) => c.name);
    expect(notNullCols).toContain('url');
    expect(notNullCols).toContain('url_hash');
    expect(notNullCols).toContain('domain');
    expect(notNullCols).toContain('status');
    expect(notNullCols).toContain('depth');
  });

  // Validates REQ-DATA-003: unique index on url_hash for O(1) dedup
  it('defines a unique index on url_hash', () => {
    const hashIndex = config.indexes.find((idx) => idx.config.name === 'idx_crawl_urls_hash');
    expect(hashIndex).toBeDefined();
    expect(hashIndex?.config.unique).toBe(true);
  });

  it('defines domain and status indexes', () => {
    const indexNames = config.indexes.map((idx) => idx.config.name);
    expect(indexNames).toContain('idx_crawl_urls_domain');
    expect(indexNames).toContain('idx_crawl_urls_status');
  });

  it('defaults status to pending', () => {
    const statusCol = config.columns.find((c) => c.name === 'status');
    expect(statusCol?.default).toBe('pending');
  });

  it('defaults depth to 0', () => {
    const depthCol = config.columns.find((c) => c.name === 'depth');
    expect(depthCol?.default).toBe(0);
  });
});

describe('crawlLinks schema', () => {
  // Validates REQ-DATA-004: crawl_links table for link graph
  const config = getTableConfig(crawlLinks);

  it('maps to crawl_links table', () => {
    expect(config.name).toBe('crawl_links');
  });

  it('defines source_url_id, target_url_id, anchor_text, created_at columns', () => {
    const columnNames = config.columns.map((c) => c.name);
    expect(columnNames).toContain('source_url_id');
    expect(columnNames).toContain('target_url_id');
    expect(columnNames).toContain('anchor_text');
    expect(columnNames).toContain('created_at');
  });

  it('has composite primary key on source_url_id and target_url_id', () => {
    expect(config.primaryKeys).toHaveLength(1);
    const pk = config.primaryKeys[0];
    expect(pk).toBeDefined();
    const pkColumnNames = pk?.columns.map((c) => c.name);
    expect(pkColumnNames).toContain('source_url_id');
    expect(pkColumnNames).toContain('target_url_id');
  });

  it('has foreign keys referencing crawl_urls', () => {
    expect(config.foreignKeys.length).toBeGreaterThanOrEqual(2);
  });

  it('has not-null constraints on FK columns', () => {
    const notNullCols = config.columns
      .filter((c) => c.notNull)
      .map((c) => c.name);
    expect(notNullCols).toContain('source_url_id');
    expect(notNullCols).toContain('target_url_id');
  });
});

describe('crawlSessions schema', () => {
  // Validates REQ-DATA-005: crawl_sessions table for tracking runs
  const config = getTableConfig(crawlSessions);

  it('maps to crawl_sessions table', () => {
    expect(config.name).toBe('crawl_sessions');
  });

  it('defines all required columns', () => {
    const columnNames = config.columns.map((c) => c.name);
    expect(columnNames).toContain('id');
    expect(columnNames).toContain('name');
    expect(columnNames).toContain('config');
    expect(columnNames).toContain('status');
    expect(columnNames).toContain('started_at');
    expect(columnNames).toContain('ended_at');
  });

  it('has id as primary key', () => {
    const idCol = config.columns.find((c) => c.name === 'id');
    expect(idCol?.primary).toBe(true);
  });

  it('defaults status to active', () => {
    const statusCol = config.columns.find((c) => c.name === 'status');
    expect(statusCol?.default).toBe('active');
  });

  it('allows null ended_at for active sessions', () => {
    const endedAtCol = config.columns.find((c) => c.name === 'ended_at');
    expect(endedAtCol?.notNull).toBe(false);
  });

  it('requires name to be not-null', () => {
    const nameCol = config.columns.find((c) => c.name === 'name');
    expect(nameCol?.notNull).toBe(true);
  });
});
