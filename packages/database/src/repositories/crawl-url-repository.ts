// CrawlURLRepository — Domain port for crawl URL data access
// Implements: T-DATA-017 (REQ-DATA-012, REQ-DATA-013)

import type { Result } from 'neverthrow';
import type { DataError } from '../errors.js';
import type { CrawlURL, CrawlURLStatus, FetchResult, NewCrawlURL } from '../types.js';

/**
 * Repository port for CrawlURL persistence.
 * REQ-DATA-012: Domain logic accesses data via repository interfaces.
 * REQ-DATA-013: Defines findById, findByHash, save, saveBatch, findPendingByDomain, updateStatus.
 * REQ-DATA-016: All operations return Result<T, DataError>.
 */
export type CrawlURLRepository = {
  /** Find a crawl URL by its database ID. */
  readonly findById: (id: bigint) => Promise<Result<CrawlURL | undefined, DataError>>;

  /** Find a crawl URL by its SHA-256 hash (O(1) dedup lookup). */
  readonly findByHash: (hash: string) => Promise<Result<CrawlURL | undefined, DataError>>;

  /** Save a single new crawl URL. Returns the created entity. */
  readonly save: (url: NewCrawlURL) => Promise<Result<CrawlURL, DataError>>;

  /** Batch save crawl URLs. Returns the count of inserted rows. */
  readonly saveBatch: (urls: readonly NewCrawlURL[]) => Promise<Result<number, DataError>>;

  /** Find pending URLs for a given domain, limited to `limit` results. */
  readonly findPendingByDomain: (
    domain: string,
    limit: number,
  ) => Promise<Result<readonly CrawlURL[], DataError>>;

  /** Update the status of a crawl URL, optionally with fetch result data. */
  readonly updateStatus: (
    id: bigint,
    status: CrawlURLStatus,
    result?: FetchResult,
  ) => Promise<Result<void, DataError>>;
};
