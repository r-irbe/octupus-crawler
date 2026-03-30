# Data Layer — Tasks

> Implementation tasks traceable to [requirements.md](requirements.md). Dependency-ordered.
> Design: [design.md](design.md) | ADR: [ADR-010](../../adr/ADR-010-data-layer.md)

---

## Phase 1: Package Scaffolding

- [x] **T-DATA-001**: Create `packages/database/` with package.json, tsconfig.json → REQ-DATA-001
- [x] **T-DATA-002**: Add Prisma as devDependency, create `prisma/schema.prisma` with datasource + generator → REQ-DATA-008
- [x] **T-DATA-003**: Add Drizzle ORM + drizzle-orm/pg-core as dependency → REQ-DATA-009
- [x] **T-DATA-004**: Add `@aws-sdk/client-s3` for S3/MinIO client → REQ-DATA-001
- [x] **T-DATA-005**: Create `src/errors.ts` with DataError discriminated union (`_tag` field) → REQ-DATA-016

## Phase 2: Schema Definition

- [x] **T-DATA-006**: Define Prisma models: CrawlUrl, CrawlLink, CrawlSession → REQ-DATA-002, REQ-DATA-004, REQ-DATA-005
- [x] **T-DATA-007**: Run `prisma generate` to produce typed client in `src/generated/` → REQ-DATA-010
- [x] **T-DATA-008**: Create initial Prisma migration → REQ-DATA-011
- [x] **T-DATA-009**: Define Drizzle schema in `src/schema/crawl-urls.ts` with indexes — REQ-DATA-003, REQ-DATA-007
- [x] **T-DATA-010**: Define Drizzle schema in `src/schema/crawl-links.ts` — REQ-DATA-004
- [x] **T-DATA-011**: Define Drizzle schema in `src/schema/crawl-sessions.ts` — REQ-DATA-005

## Phase 3: Connection Management

- [x] **T-DATA-012**: Create `src/connection/pool.ts` — PostgreSQL connection pool with configurable min/max/timeouts → REQ-DATA-015, REQ-DATA-017
- [x] **T-DATA-013**: Implement `Symbol.dispose` on pool for `using` keyword cleanup → REQ-DATA-018
- [x] **T-DATA-014**: Create `src/connection/s3-client.ts` — S3/MinIO client factory with endpoint configuration → REQ-DATA-022
- [x] **T-DATA-015**: Create `src/connection/circuit-breaker.ts` — cockatiel circuit breaker for DB calls → REQ-DATA-020
- [x] **T-DATA-016**: Implement graceful shutdown: drain queries, close pools on SIGTERM → REQ-DATA-019

## Phase 4: Repository Implementations

- [x] **T-DATA-017**: Create `CrawlURLRepository` interface in domain layer (port) → REQ-DATA-012, REQ-DATA-013
- [x] **T-DATA-018**: Implement `DrizzleCrawlURLRepository` — findById, findByHash, save, updateStatus → REQ-DATA-013, REQ-DATA-016
- [x] **T-DATA-019**: Implement `saveBatch` using multi-row INSERT for > 10K rows/sec → REQ-DATA-025
- [x] **T-DATA-020**: Create `PageContentRepository` interface (port) → REQ-DATA-014
- [x] **T-DATA-021**: Implement `S3PageContentRepository` — store (Zstandard compress), retrieve, delete → REQ-DATA-006, REQ-DATA-014
- [x] **T-DATA-022**: Create `CrawlSessionRepository` interface and Prisma implementation — REQ-DATA-005
- [x] **T-DATA-023**: Implement domain event publishing on status update (CrawlCompleted/CrawlFailed to Redis Streams) → REQ-DATA-027

## Phase 5: Configuration

- [x] **T-DATA-024**: Add Zod config schema for DATABASE_URL, S3_ENDPOINT, S3_BUCKET, pool sizes → REQ-DATA-021
- [x] **T-DATA-025**: Support local (MinIO endpoint) and cloud (S3 endpoint) via config only → REQ-DATA-021, REQ-DATA-022

## Phase 6: Testing

- [x] **T-DATA-026**: Unit tests for DataError types and repository interface contracts → REQ-DATA-016
- [x] **T-DATA-027**: Integration test: CrawlURLRepository CRUD with Testcontainers PostgreSQL → REQ-DATA-023
- [x] **T-DATA-028**: Integration test: batch insert throughput > 10K rows/sec → REQ-DATA-025
- [x] **T-DATA-029**: Integration test: URL dedup via hash constraint (insert duplicate returns DuplicateKey) → REQ-DATA-024
- [x] **T-DATA-030**: Integration test: S3PageContentRepository round-trip with Testcontainers MinIO → REQ-DATA-023
- [x] **T-DATA-031**: Integration test: circuit breaker opens after consecutive failures → REQ-DATA-020
- [x] **T-DATA-032**: Integration test: connection pool lifecycle and `using` cleanup → REQ-DATA-018
- [x] **T-DATA-033**: Integration test: graceful shutdown drains in-flight queries → REQ-DATA-019

## Phase 7: Performance Validation

- [ ] **T-DATA-034**: Benchmark: URL hash lookup < 1ms at 10M rows → REQ-DATA-003
- [ ] **T-DATA-035**: Benchmark: batch insert > 10K rows/sec → REQ-DATA-025
- [ ] **T-DATA-036**: Benchmark: S3 write > 1K pages/sec per worker → REQ-DATA-026

## MVP Critical Path

T-DATA-001 → T-DATA-006 → T-DATA-007 → T-DATA-009 → T-DATA-012 → T-DATA-017 → T-DATA-018 → T-DATA-027

## Completion Summary

| Metric | Count |
| --- | --- |
| Total tasks | 36 |
| Completed | 33 |
| Remaining | 3 |
| Completion rate | 92% |

---

> **Provenance**: Created 2026-03-29 per ADR-020 Spec-Driven Development. Source: ADR-010.
