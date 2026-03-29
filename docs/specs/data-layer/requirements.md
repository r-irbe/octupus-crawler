# Data Layer — Requirements

> EARS-format requirements for PostgreSQL metadata storage, S3/MinIO object storage, Prisma/Drizzle dual ORM, repository pattern, and connection management.
> Source: [ADR-010](../../adr/ADR-010-data-layer.md), [ADR-015](../../adr/ADR-015-application-architecture-patterns.md)

---

## 1. Database Schema & Storage

**REQ-DATA-001** (Ubiquitous)
The system shall use PostgreSQL (via CloudNativePG) for structured crawl metadata and S3-compatible object storage (MinIO local / S3 cloud) for raw page content.

**REQ-DATA-002** (Ubiquitous)
The `crawl_urls` table shall store URL metadata including: url, url_hash (SHA-256), domain, status (pending/fetched/failed/skipped), status_code, content_type, s3_key, depth, discovered_at, fetched_at, parent_url_id, and JSONB metadata.

**REQ-DATA-003** (Ubiquitous)
The system shall maintain a unique index on `url_hash` for O(1) deduplication lookups at scale (< 1ms at 10M rows).

**REQ-DATA-004** (Ubiquitous)
The system shall maintain a `crawl_links` table for the link graph with source/target URL references and anchor text.

**REQ-DATA-005** (Ubiquitous)
The system shall maintain a `crawl_sessions` table for tracking crawl runs with name, JSONB config, status, and timestamps.

**REQ-DATA-006** (Event-driven)
When a page is fetched, the system shall store raw HTML in S3 as Zstandard-compressed files at path `{session_id}/{domain}/{url_hash}.html.zst` and fetch metadata at `{url_hash}.meta.json`.

**REQ-DATA-007** (Ubiquitous)
The system shall use BRIN indexes on `fetched_at` for efficient time-range queries over crawl data.

### Acceptance Criteria — Schema & Storage

```gherkin
Scenario: URL deduplication via hash index
  Given 10 million URLs in crawl_urls
  When a URL hash lookup is performed
  Then the query completes in less than 1ms

Scenario: Raw page storage in S3
  Given a fetched HTML page
  When the page is stored
  Then it is compressed with Zstandard
  And stored at path {session_id}/{domain}/{url_hash}.html.zst
  And fetch metadata is stored at {url_hash}.meta.json
```

---

## 2. ORM Strategy

**REQ-DATA-008** (Ubiquitous)
The system shall use Prisma for schema definition, type generation, and migration management. The Prisma schema shall be the single source of truth for database structure.

**REQ-DATA-009** (Ubiquitous)
The system shall use Drizzle ORM for complex queries, joins, aggregations, and performance-critical read paths where full SQL control is needed.

**REQ-DATA-010** (Ubiquitous)
Prisma-generated types shall be co-located in `packages/database/src/generated/`. Application code shall import types from the database package, not generate them locally.

**REQ-DATA-011** (State-driven)
When Prisma schema changes are detected, the system shall generate and apply migrations via `prisma migrate` with a tracked migration history.

### Acceptance Criteria — ORM Strategy

```gherkin
Scenario: Prisma schema generates typed client
  Given a Prisma schema with CrawlUrl model
  When prisma generate runs
  Then typed client code is produced in packages/database/src/generated/

Scenario: Drizzle handles complex queries
  Given a need for URL aggregation with link counts
  When a Drizzle query with joins and groupBy executes
  Then results include computed aggregations with full type safety
```

---

## 3. Repository Pattern

**REQ-DATA-012** (Ubiquitous)
Domain logic shall access data via repository interfaces (ports) defined in the domain layer. Infrastructure shall implement these ports.

**REQ-DATA-013** (Ubiquitous)
The `CrawlURLRepository` interface shall define: `findById`, `findByHash`, `save`, `saveBatch`, `findPendingByDomain`, and `updateStatus` operations.

**REQ-DATA-014** (Ubiquitous)
The `PageContentRepository` interface shall define: `store`, `retrieve`, and `delete` operations for S3 page content.

**REQ-DATA-015** (Ubiquitous)
Repository implementations shall use connection pooling for all database access.

**REQ-DATA-016** (Ubiquitous)
Repository implementations shall return `Result<T, DataError>` using neverthrow, not throw exceptions.

### Acceptance Criteria — Repository Pattern

```gherkin
Scenario: Repository returns Result types
  Given a CrawlURLRepository implementation
  When findById is called with a non-existent ID
  Then it returns err(NotFound) not an exception

Scenario: Batch insert performance
  Given 10,000 crawl URL records
  When saveBatch is called
  Then all records are inserted in less than 1 second
```

---

## 4. Connection Management

**REQ-DATA-017** (Ubiquitous)
The system shall use connection pooling for PostgreSQL access. In production, PgBouncer shall manage connection limits.

**REQ-DATA-018** (Ubiquitous)
Database connections shall implement `Symbol.dispose` for deterministic cleanup via the `using` keyword.

**REQ-DATA-019** (Event-driven)
When the application receives SIGTERM, the system shall drain all in-flight database queries and close connection pools before shutdown.

**REQ-DATA-020** (State-driven)
While the database circuit breaker is open, the system shall queue write operations with bounded backpressure (max 1000 pending) and return errors for reads.

### Acceptance Criteria — Connection Management

```gherkin
Scenario: Graceful shutdown drains connections
  Given active database queries
  When SIGTERM is received
  Then in-flight queries complete
  And connection pool is closed
  And no queries are abandoned

Scenario: Circuit breaker protects against DB failure
  Given the database is unreachable
  When 5 consecutive queries fail
  Then the circuit breaker opens
  And subsequent reads return err(CircuitOpen)
```

---

## 5. Local/Cloud Parity

**REQ-DATA-021** (Ubiquitous)
The system shall support identical code paths for local (k3d + CloudNativePG + MinIO) and cloud (managed PG + S3) environments, differing only in configuration.

**REQ-DATA-022** (Ubiquitous)
MinIO shall provide full S3 API compatibility for local development. No code changes shall be needed when switching to cloud S3.

**REQ-DATA-023** (Ubiquitous)
Integration tests shall use Testcontainers for PostgreSQL (`postgres:16-alpine`) and MinIO (`minio/minio:latest`). Infrastructure shall never be mocked.

### Acceptance Criteria — Local/Cloud Parity

```gherkin
Scenario: Same code works with MinIO and S3
  Given a PageContentRepository
  When configured with MinIO endpoint locally
  And configured with S3 endpoint in cloud
  Then both use identical S3 API calls
  And no code changes are needed
```

---

## 6. Data Integrity & Performance

**REQ-DATA-024** (Ubiquitous)
Crawl URL writes shall be ACID-transactional, preventing duplicate fetches via the url_hash unique constraint.

**REQ-DATA-025** (Ubiquitous)
Batch insert throughput shall exceed 10,000 rows/second using PostgreSQL COPY or multi-row INSERT.

**REQ-DATA-026** (Ubiquitous)
S3 write throughput shall exceed 1,000 pages/second per worker.

**REQ-DATA-027** (Event-driven)
When a crawl URL status is updated, the system shall publish a domain event (`CrawlCompleted` / `CrawlFailed`) to Redis Streams for downstream consumers.

---

> **Provenance**: Created 2026-03-29 per ADR-020 Spec-Driven Development. Source: ADR-010, ADR-015.
