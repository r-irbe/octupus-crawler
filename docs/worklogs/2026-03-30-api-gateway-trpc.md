# Worklog: API Gateway tRPC Wiring

**Date**: 2026-03-30
**Branch**: `work/api-gateway-trpc`
**Commit**: `0d9063b`
**Task**: T-COMM-005 (REQ-COMM-001)

## What Changed

Created the first `apps/` service — `apps/api-gateway/` — wiring the tRPC router from `@ipf/api-router` into a Fastify v5 HTTP server.

### Files Created

| File | Purpose |
| --- | --- |
| `apps/api-gateway/package.json` | Package manifest with Fastify + tRPC deps |
| `apps/api-gateway/tsconfig.json` | TypeScript config extending base |
| `apps/api-gateway/eslint.config.js` | Shared ESLint config |
| `apps/api-gateway/vitest.config.ts` | Test config with JUnit reporter |
| `apps/api-gateway/src/server.ts` | Fastify server factory + tRPC adapter mount |
| `apps/api-gateway/src/main.ts` | Entry point with stub service + graceful shutdown |
| `apps/api-gateway/src/server.unit.test.ts` | 7 unit tests via Fastify inject |

### Files Modified

| File | Change |
| --- | --- |
| `pnpm-lock.yaml` | New Fastify dependencies resolved |

## Decisions

- **Fastify standalone** (not NestJS adapter) — lightweight API gateway per ADR-011
- **Mount path**: `/api/v1/trpc` — URL versioning + tRPC combined (REQ-COMM-007)
- **Health check**: `/health` outside tRPC for k8s liveness/readiness probes
- **Stub CrawlService**: placeholder in main.ts to be replaced when wired

## RALPH Review Findings

| ID | Severity | Finding | Resolution |
| --- | --- | --- | --- |
| F-001 | Major | No SIGTERM graceful shutdown (MUST #10) | Added `SIGTERM`/`SIGINT` handlers calling `app.close()` |
| F-002 | Minor | Unnecessary `as` type assertion on headers | Removed cast; typed parameter as `FastifyRequest['headers']` |
| F-003 | Minor | Missing NOT_FOUND test for crawl.status | Added 7th test verifying NOT_FOUND error path |

## Tests

- 7 unit tests (all passing):
  1. Health check returns ok
  2. tRPC health.check returns ok
  3. tRPC crawl.status returns job status
  4. tRPC crawl.status returns NOT_FOUND for nonexistent job
  5. tRPC crawl.submit rejects unauthenticated requests
  6. tRPC crawl.submit succeeds with auth header
  7. tRPC mounted under /api/v1/trpc prefix

## Deferred

- OTel first import (MUST #9) — deferred until `@ipf/observability` SDK init is wired
- Real auth replacing `x-user-id` header placeholder

## Learnings

- `process.on('SIGTERM', asyncFn)` triggers `@typescript-eslint/no-misused-promises` — use `void promise.then()` pattern instead
- Turborepo auto-discovers the new `apps/api-gateway` package (18 total now)
- Fastify `app.inject()` is excellent for testing tRPC HTTP wiring without starting a real server

---

> **Provenance**: Created 2026-03-30. T-COMM-005 complete.
