# Worklog: Service Communication Phase 1

| Field | Value |
| --- | --- |
| Date | 2026-03-29 |
| Branch | `work/service-communication` |
| Commits | 38481b9, 5a4cba0 |
| Spec | `docs/specs/service-communication/` |
| Tasks completed | 6/27 (T-COMM-001, 002, 003, 010, 015, 023) |

## Summary

Created new `packages/api-router/` package implementing tRPC-based type-safe RPC, domain events, and event handling for the service communication layer.

## Files Created

| File | Purpose |
| --- | --- |
| `packages/api-router/package.json` | Package config, @trpc/server ^11.0.0, zod, neverthrow |
| `packages/api-router/tsconfig.json` | Extends tsconfig.base.json |
| `packages/api-router/vitest.config.ts` | Vitest configuration |
| `packages/api-router/eslint.config.js` | ESLint config re-export |
| `packages/api-router/src/schemas.ts` | Zod schemas: CrawlSubmit, CrawlStatus, Health |
| `packages/api-router/src/trpc.ts` | tRPC init, Context, CrawlService type, auth middleware |
| `packages/api-router/src/router.ts` | appRouter: crawl.submit, crawl.status, health.check |
| `packages/api-router/src/domain-events.ts` | 4 versioned domain event types with Zod schemas |
| `packages/api-router/src/event-handler.ts` | parseEvent skip+warn, isHandled type guard |
| `packages/api-router/src/router.unit.test.ts` | 11 tests: auth, validation, defaults, NOT_FOUND |
| `packages/api-router/src/domain-events.unit.test.ts` | 10 tests: constructors, schema validation |
| `packages/api-router/src/event-handler.unit.test.ts` | 10 tests: skip, warn, null/undefined, type guard |

## Decisions

1. **Domain events in api-router**: Placed domain events in `packages/api-router/` instead of `packages/core/` to avoid Tier 3 multi-package changes. Documented as deferral.
2. **`exactOptionalPropertyTypes` handling**: All optional properties in TypeScript interfaces must include `| undefined` to match Zod's `.optional()` output type.
3. **`z.infer<>` for DomainEvent**: RALPH review F-004 caught that DomainEvent type was hand-crafted instead of derived from Zod schema. Fixed to single source of truth.
4. **CrawlStatus enum type**: RALPH review F-002 caught loose `string` type in CrawlService. Narrowed to `CrawlStatus` enum.

## RALPH Review Findings

| ID | Severity | Resolution |
| --- | --- | --- |
| F-001 | Minor | Added deferral comment for domain events location |
| F-002 | Minor | Narrowed CrawlService.status to CrawlStatus enum |
| F-003 | Informational | Noted: consider max-array test |
| F-004 | Minor | Derived DomainEvent from Zod schema |
| F-005 | Informational | Security validated |
| F-006 | Informational | OTel deferred to T-COMM-004 |

## Deferred Tasks (21/27)

T-COMM-004/005 (OTel/gateway wiring), T-COMM-006-009 (TypeSpec), T-COMM-011-014 (Redis Streams), T-COMM-016-020 (Temporal), T-COMM-021-022 (Redis idempotency), T-COMM-024-027 (integration tests)

## Learnings

- tRPC v11 `createCaller` API works well for unit testing without a real HTTP server
- `Promise.resolve()` instead of `async () =>` avoids `require-await` lint errors in mocks
- `exactOptionalPropertyTypes` is pervasive — every Zod `.optional()` needs matching `| undefined` in all interfaces
