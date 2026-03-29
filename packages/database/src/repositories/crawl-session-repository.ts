// CrawlSessionRepository — Domain port for crawl session data access
// Implements: T-DATA-022 (REQ-DATA-005) — interface only, Prisma impl deferred
// NOTE: Port lives here temporarily. When implementations are added,
// consider extracting to packages/core/src/ports/ per ADR-015 hexagonal architecture.

import type { Result } from 'neverthrow';
import type { DataError } from '../errors.js';
import type { CrawlSession, SessionStatus } from '../types.js';

/**
 * Repository port for CrawlSession persistence.
 * REQ-DATA-005: Tracks crawl runs with config, status, and timestamps.
 * REQ-DATA-016: All operations return Result<T, DataError>.
 */
export type CrawlSessionRepository = {
  /** Create a new crawl session with the given config. */
  readonly create: (
    name: string,
    config: Record<string, unknown>,
  ) => Promise<Result<CrawlSession, DataError>>;

  /** Find a crawl session by its database ID. */
  readonly findById: (id: bigint) => Promise<Result<CrawlSession | undefined, DataError>>;

  /** Update the status of a crawl session. */
  readonly updateStatus: (
    id: bigint,
    status: SessionStatus,
  ) => Promise<Result<void, DataError>>;

  /** Mark a session as ended with the given status. */
  readonly end: (
    id: bigint,
    status: 'completed' | 'failed' | 'cancelled',
  ) => Promise<Result<void, DataError>>;
};
