# Worklog: Data Layer Integration Tests

**Date**: 2026-03-30
**Branch**: `work/data-layer-integration-tests`
**Commit**: 862cfdd
**Tasks**: T-DATA-027 through T-DATA-033

## What Changed

### New Files (packages/testing)

- `src/containers/postgres-container.ts` — PostgreSQL Testcontainer helper
- `src/containers/minio-container.ts` — MinIO Testcontainer helper

### New Files (packages/database)

- `src/test-helpers.ts` — Test DB bootstrap (schema + Drizzle + truncate)
- `src/crawl-url-repository.integration.test.ts` — 8 tests: CRUD, dedup, batch
- `src/s3-page-content-repository.integration.test.ts` — 4 tests: S3 round-trip
- `src/connection-infra.integration.test.ts` — 6 tests: pool, CB, shutdown

### Modified Files

- `packages/database/package.json` — added @ipf/testing dev dependency
- `packages/testing/package.json` — added postgres/minio container exports

## Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Created test-helpers.ts wrapping pg.Pool | pg type resolution fails in ESLint with TS6; isolating raw pg in test helper |
| 2 | Integration tests excluded from default vitest run | Requires Docker; vitest.config.ts exclude pattern |
| 3 | Separate container per describe block | Test isolation over performance |

## RALPH Review Summary

- 1 Minor sustained (DA1: schema duplication risk) — mitigated with SYNC WARNING comment
- No Critical/Major. Verdict: **APPROVED**

## Test Results

- 87 unit tests pass (unchanged)
- 18 integration tests added (excluded from default run, require Docker)
- Typecheck 16/16, lint 16/16

---

> **Provenance**: Created 2026-03-30 by Copilot agent.
