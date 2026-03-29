// Domain types for database entities
// Implements: T-DATA-017 (REQ-DATA-013), supporting types for repository interfaces

// --- Crawl URL entity (database row representation) ---
// NOTE: Uses bigint for IDs matching PostgreSQL BIGINT. BigInt is NOT JSON-serializable —
// convert to string at API boundaries. This is an internal domain entity.

export type CrawlURLStatus = 'pending' | 'fetched' | 'failed' | 'skipped';

export type CrawlURL = {
  readonly id: bigint;
  readonly url: string;
  readonly urlHash: string;
  readonly domain: string;
  readonly status: CrawlURLStatus;
  readonly statusCode: number | null;
  readonly contentType: string | null;
  readonly s3Key: string | null;
  readonly depth: number;
  readonly discoveredAt: Date;
  readonly fetchedAt: Date | null;
  readonly parentUrlId: bigint | null;
  readonly metadata: Record<string, unknown>;
};

export type NewCrawlURL = {
  readonly url: string;
  readonly urlHash: string;
  readonly domain: string;
  readonly depth: number;
  readonly parentUrlId?: bigint | undefined;
  readonly metadata?: Record<string, unknown> | undefined;
};

export type FetchResult = {
  readonly statusCode: number;
  readonly contentType: string | null;
  readonly s3Key: string | null;
};

// --- Page content types ---

export type PageKey = {
  readonly sessionId: string;
  readonly domain: string;
  readonly urlHash: string;
};

export type FetchMetadata = {
  readonly url: string;
  readonly statusCode: number;
  readonly contentType: string;
  readonly fetchedAt: string;
  readonly fetchDurationMs: number;
};

// --- Crawl session types ---

export type SessionStatus = 'active' | 'completed' | 'failed' | 'cancelled';

export type CrawlSession = {
  readonly id: bigint;
  readonly name: string;
  readonly config: Record<string, unknown>;
  readonly status: SessionStatus;
  readonly startedAt: Date;
  readonly endedAt: Date | null;
};
