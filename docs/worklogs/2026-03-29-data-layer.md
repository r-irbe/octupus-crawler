# Worklog: Data Layer Phase 1

| Field | Value |
| --- | --- |
| Date | 2026-03-29 |
| Branch | `work/data-layer` |
| Commits | 17a7ecf, 515fdb4 |
| Spec | `docs/specs/data-layer/` |
| Tasks completed | 8/36 (T-DATA-001, 003, 004, 005, 017, 020, 024, 025, 026) |

## Summary

Created new `packages/database/` package (17th in monorepo) with Drizzle ORM + AWS S3 SDK dependencies, DataError discriminated union, and repository interfaces (CrawlURLRepository, PageContentRepository).

## Files Created

| File | Purpose |
| --- | --- |
| `packages/database/package.json` | drizzle-orm, @aws-sdk/client-s3, neverthrow, zod |
| `packages/database/tsconfig.json` | Extends tsconfig.base.json |
| `packages/database/vitest.config.ts` | Vitest configuration |
| `packages/database/eslint.config.js` | ESLint config re-export |
| `packages/database/src/errors.ts` | 7-variant DataError union + constructors |
| `packages/database/src/types.ts` | CrawlURL, NewCrawlURL, PageKey, FetchMetadata entities |
| `packages/database/src/repositories/crawl-url-repository.ts` | CrawlURLRepository port interface |
| `packages/database/src/repositories/page-content-repository.ts` | PageContentRepository port interface |
| `packages/database/src/errors.unit.test.ts` | 11 tests for error constructors + tags |
| `packages/database/src/repositories.unit.test.ts` | 9 tests for repository contracts |

## Decisions

1. **Uint8Array over Buffer**: Used `Uint8Array` for `PageContentRepository` to avoid Node `@types/node` dependency in type signatures. `Buffer extends Uint8Array` so callers can still pass Buffer.
2. **Port location**: Repository interfaces in `packages/database/` instead of `packages/core/` — avoids Tier 3 cross-package change. Documented as deferral.
3. **BigInt IDs**: Matches PostgreSQL BIGINT. JSON serialization caveat documented — convert at API boundary.
4. **`_tag` convention**: New packages use `_tag` per AGENTS.md. Core's `kind` is acknowledged legacy.
5. **T-DATA-024/025 already done**: `@ipf/config` already has DATABASE_URL, S3_ENDPOINT, etc.
6. **T-DATA-020 bonus**: Added PageContentRepository interface since it's a pure port (no infra).

## RALPH Review Findings

| ID | Severity | Resolution |
| --- | --- | --- |
| F-001 | Minor | Deferral comments for port location |
| F-002 | Minor | BigInt JSON caveat documented |
| F-003 | Informational | Test coverage noted |
| F-004 | Informational | Security OK |
| F-005 | Minor | `_tag` vs `kind` documented |
| F-006 | Informational | Unused deps expected for scaffolding |

## Deferred Tasks (28/36)

T-DATA-002 (Prisma), T-DATA-006-011 (schema definitions), T-DATA-012-016 (connections, pools, circuit breaker), T-DATA-018-019 (Drizzle implementations), T-DATA-021-023 (S3 + session implementations, domain events), T-DATA-027-036 (integration tests, benchmarks)

## Learnings

- TypeScript 6 `Uint8Array` generic parameter variance causes phantom ESLint errors (ESLint uses older TS parser). Real `tsc` passes fine.
- `@typescript-eslint/no-duplicate-type-constituents` catches `FetchResult | undefined` on optional params — ESLint considers it redundant with `?`
