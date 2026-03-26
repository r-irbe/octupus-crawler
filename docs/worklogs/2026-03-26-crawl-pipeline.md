# Worklog — crawl-pipeline Implementation

**Date**: 2026-03-26
**Branch**: `work/crawl-pipeline`
**Commits**: `b077eb1`, `a4f9237`

## What Changed

New package `@ipf/crawl-pipeline` implementing URL processing, pipeline stage composition, link discovery, and enqueue logic.

### Files Created (15 source + config)

**Production (8 files, ~543 lines)**:
- `src/normalized-url.ts` — NormalizedUrl branded type
- `src/url-normalizer.ts` — URL normalization (IDN, fragment strip, param sort)
- `src/crawl-url-factory.ts` — CrawlUrl factory with scheme/empty/invalid checks
- `src/crawl-types.ts` — CrawlFrontierEntry, CrawlFetchResult, CrawlResult, LinkExtractError
- `src/validate-stage.ts` — Depth guard + domain allow-list
- `src/discover-stage.ts` — Content-type gate, extraction, relative URL resolution, dedup
- `src/enqueue-stage.ts` — Child depth calc, batch enqueue via Frontier
- `src/crawl-pipeline.ts` — Pipeline composition: validate → fetch → discover → enqueue

**Tests (7 files, 64 tests)**:
- 60 unit tests across 6 test files
- 4 property tests (determinism, idempotence, fragment stripping, scheme filtering)

**Config**: package.json, tsconfig.json, vitest.config.ts, eslint.config.js

### Requirements Covered

REQ-CRAWL-001 through REQ-CRAWL-019 (19/19)

### Decisions Made

1. NormalizedUrl as local branded type (core's CrawlUrl.normalized stays string)
2. CrawlFrontierEntry richer than core's FrontierEntry (adds metadata fields)
3. IDN via Node.js `url.domainToASCII()` — no external dependency
4. ResultLinkExtractor adapter wraps core's bare `string[]` interface
5. Pipeline measures fetchDurationMs via `performance.now()` (per G8 review F-CP-002)
6. Case-insensitive header lookup for content-type (per G8 review F-CP-009)

### G8 Review Council Findings

| Finding | Severity | Fix |
| --- | --- | --- |
| F-CP-001: Dynamic import in hot path | Major | Static import |
| F-CP-002: fetchDurationMs hardcoded 0 | Major | performance.now() timing |
| F-CP-004: brandNormalizedUrl public | Minor | @internal JSDoc |
| F-CP-005: priority:0 not asserted | Minor | Added assertion |
| F-CP-009: Header case assumption | Minor | Case-insensitive lookup |
| F-CP-010: Unnecessary as cast | Minor | Removed cast |

### Deferred Items

- Property test for URL length bounds (F-CP-008, dismissed)
- LinkExtractError not in CrawlError union (F-CP-006, dismissed — always recovered)

### Learnings

- Property tests caught trailing-slash idempotence bug (`http://a.aa///` → only strips one slash). Fixed with while loop.
- `@fast-check/vitest` API: `fcTest.prop([arbs])('name', fn)` not `fcTest.prop('name', [arbs], fn)`
- Core's `Disposable` uses `close(): Promise<void>`, not `[Symbol.dispose]`
