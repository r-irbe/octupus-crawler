# Worklog: Event Publishing + Resilience + CI

**Date**: 2026-03-30
**Branch**: `work/event-publishing-resilience-ci`
**Commits**: b793efb, c2282bc

## What Changed

### New Files
- `packages/http-fetching/src/resilient-fetcher.ts` — Resilient HTTP fetcher wrapping httpFetch with FetchPolicyPort (rate limit + cockatiel policy)
- `packages/http-fetching/src/resilient-fetcher.unit.test.ts` — 4 unit tests
- `packages/database/src/repositories/event-publishing-crawl-url-repository.ts` — Event-publishing decorator for CrawlURLRepository (fire-and-forget)
- `packages/database/src/repositories/event-publishing-crawl-url-repository.unit.test.ts` — 6 unit tests
- `packages/crawl-pipeline/src/discover-stage-events.ts` — URLDiscovered event publisher wrapping discoverLinks
- `packages/crawl-pipeline/src/discover-stage-events.unit.test.ts` — 4 unit tests
- `packages/redis/src/event-version-skip.integration.test.ts` — 2 integration tests for unknown event version handling
- `scripts/check-architecture-conformance.sh` — Architecture conformance check (barrel imports, file sizes, dep direction)

### Modified Files
- `packages/http-fetching/package.json` — Added resilient-fetcher export
- `packages/database/package.json` — Added event-publishing-crawl-url-repository export
- `packages/crawl-pipeline/package.json` — Added discover-stage-events export
- `.github/workflows/ci.yml` — Added architecture-conformance job

## Design Decisions

| # | Decision | Rationale |
| --- | --- | --- |
| 1 | `FetchPolicyPort` instead of `FetchPolicyStack` | Minimal structural port avoids coupling http-fetching to cockatiel IPolicy types |
| 2 | `setContext()` for URL threading | CrawlURLRepository interface can't change (shared); context map provides caller-set URL/error data |
| 3 | `maxEventsPerBatch` cap (default 500) | RALPH P-001: prevents unbounded allocation on hub pages with thousands of links |
| 4 | `onPublishFailure` callback | RALPH R-001: metrics hook for sustained Redis failure observability |
| 5 | Inline Zod schema in integration test | Avoids cross-package dep (redis → api-router) for test-only validation |

## RALPH Review Findings

3 sustained Majors (all fixed):
- **P-001**: Unbounded event array → added maxEventsPerBatch
- **A-004**: Empty URL in events → added setContext() for URL threading
- **R-001**: No metrics on publish failure → added onPublishFailure callback

8 sustained Minors (tracked for follow-up):
- S-001: `as FetchError` type assertion in resilient-fetcher catch
- A-001: No Zod schema for ResilientFetchError
- A-005: CrawlFailed hardcoded errorKind defaults to 'unknown'
- AR-003: Sync function with async side effect in discover-stage-events
- T-001: Missing non-Error throw test in resilient-fetcher
- T-002: Timing-dependent setTimeout(10) in discover-stage-events test
- T-003: Integration test validates Zod, not actual consumer skip logic
- R-002: Await in event-publishing repo contradicts fire-and-forget JSDoc

## Tasks Completed

- T-RES-017: Integrate resilience into http-fetching
- T-COMM-013: CrawlCompleted/CrawlFailed event publishing
- T-COMM-014: URLDiscovered event publishing in discover stage
- T-DATA-023: Domain event publishing on status update
- T-COMM-026: Integration test: unknown event version skipped
- T-CICD-021: Architecture conformance CI job
