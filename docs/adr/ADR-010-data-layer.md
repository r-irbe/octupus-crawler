# ADR-010: Data Layer — PostgreSQL + S3/MinIO

| Field | Value |
| --- | --- |
| **Status** | Accepted |
| **Created** | 2026-03-24 |
| **Last Updated** | 2026-03-25 |
| **Author(s)** | Architecture Council |
| **Reviewers** | Architect, Skeptic, SRE, Data Engineer Advisor, Enterprise Architect Advisor |
| **Supersedes** | N/A |
| **Superseded By** | N/A |

## Context

The crawler produces two categories of data: structured metadata (URL, status, timestamps, link graph) and unstructured content (raw HTML pages, extracted text). The data layer must handle high write throughput, support efficient queries for crawl management, and store large volumes of raw pages cost-effectively.

## Decision Drivers

- High write throughput for crawl results
- Efficient querying for URL deduplication and crawl status
- Cost-effective bulk storage for raw HTML pages
- Local development parity with cloud production
- Backup, recovery, and data retention policies
- K8s-native deployment options

## Considered Options

### Option A: PostgreSQL (CloudNativePG) + S3/MinIO

**Pros:**

- PG: battle-tested RDBMS, rich query language, JSONB for flexible schema
- CloudNativePG: K8s-native PG operator with automated failover, backup, WAL archiving
- S3 API: universal object storage interface
- MinIO: S3-compatible, runs locally in k3d or docker-compose
- Clear separation: metadata in PG (queryable), raw pages in S3 (cheap bulk storage)
- PG extensions: pg_trgm for URL similarity, BRIN indexes for time-series crawl data

**Cons:**

- Two storage systems to manage
- PG connection pooling needed at scale (PgBouncer)

### Option B: MongoDB

**Pros:**

- Schema flexibility
- GridFS for large documents

**Cons:**

- Weaker consistency guarantees by default
- Operational complexity at scale (replica sets, sharding)
- Less efficient for relational queries (URL graph, dedup)

### Option C: PostgreSQL for everything (including page content)

**Pros:**

- Single system, simpler operations

**Cons:**

- PG TOAST for large text columns is inefficient at TB scale
- Storage costs higher than object storage
- Backup times increase dramatically with large data volumes

## Decision

Adopt **PostgreSQL** via **CloudNativePG** for structured metadata and **MinIO** (local) / **S3** (cloud) for raw page content.

### Schema Design

```sql
-- Crawl jobs and results
CREATE TABLE crawl_urls (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  url           TEXT NOT NULL,
  url_hash      BYTEA NOT NULL, -- SHA-256 for fast dedup
  domain        TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending', -- pending, fetched, failed, skipped
  status_code   SMALLINT,
  content_type  TEXT,
  s3_key        TEXT,           -- Reference to raw page in S3
  depth         SMALLINT NOT NULL DEFAULT 0,
  discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fetched_at    TIMESTAMPTZ,
  parent_url_id BIGINT REFERENCES crawl_urls(id),
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE UNIQUE INDEX idx_urls_hash ON crawl_urls (url_hash);
CREATE INDEX idx_urls_domain ON crawl_urls (domain);
CREATE INDEX idx_urls_status ON crawl_urls (status) WHERE status = 'pending';
CREATE INDEX idx_urls_fetched_at ON crawl_urls USING BRIN (fetched_at);

-- Link graph
CREATE TABLE crawl_links (
  source_url_id BIGINT NOT NULL REFERENCES crawl_urls(id),
  target_url_id BIGINT NOT NULL REFERENCES crawl_urls(id),
  anchor_text   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (source_url_id, target_url_id)
);

-- Crawl sessions
CREATE TABLE crawl_sessions (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       TEXT NOT NULL,
  config     JSONB NOT NULL,
  status     TEXT NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at   TIMESTAMPTZ
);
```

### S3/MinIO Layout

```text
bucket: ipf-crawl-pages
├── {session_id}/
│   ├── {domain}/
│   │   ├── {url_hash}.html.zst    # Zstandard compressed raw HTML
│   │   └── {url_hash}.meta.json   # Fetch metadata (headers, timing)
```

### Local vs Cloud

| Component | Local (k3d) | Cloud |
| --- | --- | --- |
| PostgreSQL | CloudNativePG single instance | CloudNativePG HA or managed (RDS/CloudSQL) |
| Object Storage | MinIO pod | S3 / GCS / Azure Blob |
| Connection Pooling | Direct | PgBouncer sidecar |
| Backups | Optional | WAL-G to S3, daily base backups |

## Consequences

### Positive

- PG provides ACID for crawl state, preventing duplicate fetches
- URL dedup via hash index: O(1) lookup for millions of URLs
- S3/MinIO stores raw pages at minimal cost per GB
- CloudNativePG handles PG lifecycle in K8s (backup, failover, rolling updates)
- BRIN index on fetched_at enables efficient time-range queries
- MinIO gives full S3 API locally — zero code changes for cloud migration

### Negative

- Two storage systems to operate (mitigated: both K8s-native)
- PG connection limits at high worker concurrency (mitigated: PgBouncer)
- Schema migrations require management tooling (mitigated: drizzle-orm or similar)

### Risks

- PG becomes bottleneck at extreme write throughput (mitigated: batch inserts, COPY command)
- MinIO data durability in local dev (mitigated: local data is ephemeral anyway)

## ORM Strategy: Prisma + Drizzle Dual-ORM

**Prisma** handles schema definition and migrations — its declarative `schema.prisma` file generates typed client code and manages migration history:

```prisma
// packages/database/prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
  output   = "../src/generated"
}

model CrawlUrl {
  id          BigInt    @id @default(autoincrement())
  url         String
  urlHash     Bytes     @unique
  domain      String
  status      String    @default("pending")
  statusCode  Int?
  contentType String?
  s3Key       String?
  depth       Int       @default(0)
  discoveredAt DateTime @default(now())
  fetchedAt   DateTime?
  metadata    Json      @default("{}")
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  @@index([domain])
  @@index([status])
}
```

**Drizzle** handles query execution for complex reads where full SQL control is needed:

```typescript
// packages/database/src/queries.ts
import { eq, desc, sql } from 'drizzle-orm';

export async function getURLsByDomainWithCounts(db: DrizzleDB, domain: string) {
  return db
    .select({
      url: crawlUrls.url,
      status: crawlUrls.status,
      linkCount: sql<number>`count(${crawlLinks.targetUrlId})::int`,
    })
    .from(crawlUrls)
    .leftJoin(crawlLinks, eq(crawlUrls.id, crawlLinks.sourceUrlId))
    .where(eq(crawlUrls.domain, domain))
    .groupBy(crawlUrls.id)
    .orderBy(desc(sql`count(${crawlLinks.targetUrlId})`));
}
```

**Decision rule**: Prisma for schema/migrations and simple CRUD. Drizzle for complex queries, joins, aggregations, and performance-critical read paths.

## Repository Pattern

Domain logic accesses data via repository interfaces (ports) defined in the domain layer. Infrastructure implements them:

```typescript
// Domain port
interface CrawlURLRepository {
  findById(id: bigint): Promise<CrawlURL | null>;
  findByHash(hash: Buffer): Promise<CrawlURL | null>;
  save(url: CrawlURL): Promise<void>;
  findPendingByDomain(domain: string, limit: number): Promise<CrawlURL[]>;
}

// Infrastructure implementation
class DrizzleCrawlURLRepository implements CrawlURLRepository {
  constructor(private db: DrizzleDB, private cache: RedisClient) {}
  // ... uses Drizzle for queries, Redis for caching
}
```

This pattern ensures domain logic is testable without I/O and adapters are swappable (see [ADR-015](ADR-015-application-architecture-patterns.md)).

## CQRS Scope

For services with read/write asymmetry (e.g., crawl status queries vs crawl job writes):

- **Write side**: Validates commands → applies domain logic → persists to PostgreSQL → publishes domain event to Redis Streams
- **Read side**: Consumes events → projects into read-optimized views → serves from Redis cache or read-replica

Full Event Sourcing only for audit-critical bounded contexts where the complete event log has compliance value. Default to CQRS without Event Sourcing.

## Validation

- URL dedup lookup: < 1ms at 10M rows
- Batch insert throughput: > 10K rows/sec
- S3 write throughput: > 1000 pages/sec per worker
- CloudNativePG failover: < 30s
- Full backup/restore tested for disaster recovery

## Related

- [ADR-002: Job Queue System](ADR-002-job-queue-system.md) — Workers write results to PG + S3
- [ADR-005: Local Kubernetes](ADR-005-local-kubernetes.md) — MinIO and CloudNativePG in k3d
- [ADR-003: Infrastructure as Code](ADR-003-infrastructure-as-code.md) — Pulumi provisions PG and MinIO
- [ADR-015: Architecture Patterns](ADR-015-application-architecture-patterns.md) — Repository pattern as Hexagonal secondary port
- [ADR-017: Service Communication](ADR-017-service-communication.md) — CQRS event flow via Redis Streams

---

> **Provenance**: Created 2026-03-24; updated 2026-03-25 with Prisma+Drizzle dual ORM strategy, Repository pattern, and CQRS scope based on [docs/research/arch.md](../research/arch.md) Phase 6.
