// DrizzleCrawlURLRepository — Infrastructure implementation of CrawlURLRepository port
// Implements: T-DATA-018 (REQ-DATA-013, REQ-DATA-016) — findById, findByHash, save, updateStatus, findPendingByDomain
//             T-DATA-019 (REQ-DATA-025) — saveBatch multi-row INSERT for > 10K rows/sec
// REQ-DATA-015: Uses connection pooling via injected Drizzle instance
// REQ-DATA-016: All operations return Result<T, DataError>

import { and, eq, sql } from 'drizzle-orm';
import { err, ok, type Result } from 'neverthrow';
import type { DataError } from '../errors.js';
import { createDuplicateKey, createQueryFailed } from '../errors.js';
import { crawlUrls } from '../schema/crawl-urls.js';
import type { CrawlURL, CrawlURLStatus, FetchResult, NewCrawlURL } from '../types.js';
import type { DrizzleDB } from '../connection/drizzle.js';
import type { CrawlURLRepository } from './crawl-url-repository.js';

// --- Row-to-domain mapping ---

type CrawlUrlRow = typeof crawlUrls.$inferSelect;

function toDomain(row: CrawlUrlRow): CrawlURL {
  return {
    id: row.id,
    url: row.url,
    urlHash: row.urlHash,
    domain: row.domain,
    status: row.status as CrawlURLStatus,
    statusCode: row.statusCode,
    contentType: row.contentType,
    s3Key: row.s3Key,
    depth: row.depth,
    discoveredAt: row.discoveredAt,
    fetchedAt: row.fetchedAt,
    parentUrlId: row.parentUrlId,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
  };
}

// --- Factory ---

export function createDrizzleCrawlURLRepository(db: DrizzleDB): CrawlURLRepository {
  const findById = async (id: bigint): Promise<Result<CrawlURL | undefined, DataError>> => {
    try {
      const rows = await db.select().from(crawlUrls).where(eq(crawlUrls.id, id)).limit(1);
      const first = rows[0];
      return ok(first ? toDomain(first) : undefined);
    } catch (cause: unknown) {
      return err(createQueryFailed('findById', cause));
    }
  };

  const findByHash = async (hash: string): Promise<Result<CrawlURL | undefined, DataError>> => {
    try {
      const rows = await db.select().from(crawlUrls).where(eq(crawlUrls.urlHash, hash)).limit(1);
      const first = rows[0];
      return ok(first ? toDomain(first) : undefined);
    } catch (cause: unknown) {
      return err(createQueryFailed('findByHash', cause));
    }
  };

  const save = async (url: NewCrawlURL): Promise<Result<CrawlURL, DataError>> => {
    try {
      const rows = await db
        .insert(crawlUrls)
        .values({
          url: url.url,
          urlHash: url.urlHash,
          domain: url.domain,
          depth: url.depth,
          parentUrlId: url.parentUrlId ?? null,
          metadata: url.metadata ?? {},
        })
        .returning();
      const first = rows[0];
      if (!first) {
        return err(createQueryFailed('save', new Error('INSERT returned no rows')));
      }
      return ok(toDomain(first));
    } catch (cause: unknown) {
      if (isDuplicateKeyError(cause)) {
        return err(createDuplicateKey('idx_crawl_urls_hash'));
      }
      return err(createQueryFailed('save', cause));
    }
  };

  const saveBatch = async (urls: readonly NewCrawlURL[]): Promise<Result<number, DataError>> => {
    if (urls.length === 0) {
      return ok(0);
    }
    try {
      const values = urls.map((u) => ({
        url: u.url,
        urlHash: u.urlHash,
        domain: u.domain,
        depth: u.depth,
        parentUrlId: u.parentUrlId ?? null,
        metadata: u.metadata ?? {},
      }));
      // Multi-row INSERT with ON CONFLICT DO NOTHING for dedup
      // Returns count of actually inserted rows (excludes duplicates)
      const result = await db
        .insert(crawlUrls)
        .values(values)
        .onConflictDoNothing({ target: crawlUrls.urlHash })
        .returning({ id: crawlUrls.id });
      return ok(result.length);
    } catch (cause: unknown) {
      return err(createQueryFailed('saveBatch', cause));
    }
  };

  const findPendingByDomain = async (
    domain: string,
    limit: number,
  ): Promise<Result<readonly CrawlURL[], DataError>> => {
    try {
      const rows = await db
        .select()
        .from(crawlUrls)
        .where(and(eq(crawlUrls.domain, domain), eq(crawlUrls.status, 'pending')))
        .limit(limit);
      return ok(rows.map(toDomain));
    } catch (cause: unknown) {
      return err(createQueryFailed('findPendingByDomain', cause));
    }
  };

  const updateStatus = async (
    id: bigint,
    status: CrawlURLStatus,
    result?: FetchResult,
  ): Promise<Result<void, DataError>> => {
    try {
      const updateData: Record<string, unknown> = {
        status,
        updatedAt: sql`now()`,
      };
      if (result) {
        updateData['statusCode'] = result.statusCode;
        updateData['contentType'] = result.contentType;
        updateData['s3Key'] = result.s3Key;
        if (status === 'fetched') {
          updateData['fetchedAt'] = sql`now()`;
        }
      }
      await db.update(crawlUrls).set(updateData).where(eq(crawlUrls.id, id));
      return ok(undefined);
    } catch (cause: unknown) {
      return err(createQueryFailed('updateStatus', cause));
    }
  };

  return { findById, findByHash, save, saveBatch, findPendingByDomain, updateStatus };
}

// --- Helpers ---

function isDuplicateKeyError(error: unknown): boolean {
  if (error instanceof Error) {
    // PostgreSQL error code 23505 = unique_violation
    return 'code' in error && (error as { code: string }).code === '23505';
  }
  return false;
}
