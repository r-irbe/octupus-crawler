# Implementation State Tracker — crawl-pipeline

## Session Identity

| Field | Value |
| --- | --- |
| Date | 2026-03-26 |
| Branch | `work/crawl-pipeline` |
| User request | Implement crawl-pipeline package (URL processing, pipeline stages, IDN, tests) |
| Scope | `packages/crawl-pipeline/` (new package, no changes to existing) |

## Applicable ADRs

- ADR-008: HTTP/parsing stack (cheerio for link extraction)
- ADR-015: Hexagonal + VSA architecture (pure functions, injected deps)
- ADR-016: Coding standards (neverthrow, FOOP, strict TS)
- ADR-020: Spec-driven development (EARS requirements)

## Task Queue

| # | Task | Status | Commit | Notes |
| --- | --- | --- | --- | --- |
| 1 | Scaffold package (package.json, tsconfig, vitest) | `done` | b077eb1 | — |
| 2 | NormalizedUrl branded type | `done` | b077eb1 | T-CRAWL-002 |
| 3 | URL normalizer (strip fragment, slash, sort params, IDN) | `done` | b077eb1 | T-CRAWL-001, T-CRAWL-021; property test caught trailing-slash bug |
| 4 | CrawlUrl factory (scheme check, errors) | `done` | b077eb1 | T-CRAWL-003, T-CRAWL-004 |
| 5 | Pipeline data types (FrontierEntry, FetchResult, CrawlResult) | `done` | b077eb1 | T-CRAWL-005/6/7, T-CRAWL-022/023 |
| 6 | Validate stage (depth + domain) | `done` | b077eb1 | T-CRAWL-008 |
| 7 | Discover stage (content-type, extract, resolve, dedup) | `done` | b077eb1 | T-CRAWL-010 |
| 8 | Enqueue stage (child depth, batch) | `done` | b077eb1 | T-CRAWL-011 |
| 9 | Pipeline composition | `done` | b077eb1 | T-CRAWL-012 |
| 10 | Unit + property tests | `done` | b077eb1 | 64 tests (60 unit + 4 property) |
| 11 | Guard functions + commit | `done` | b077eb1 | G5, G6 — 390 total tests |
| 12 | PR Review Council + fixes | `done` | a4f9237 | G8 — 6 sustained findings, all fixed |

## Current State

| Field | Value |
| --- | --- |
| Current task # | 12 (complete) |
| Last completed gate | G9 |
| Guard function status | `pass` (attempt 1/3) |
| Commits on branch | 2 (b077eb1, a4f9237) |
| Tests passing | 390 total (64 crawl-pipeline) |
| Blockers | none |

## Decisions Log

| # | Decision | Rationale | ADR ref |
| --- | --- | --- | --- |
| 1 | NormalizedUrl as branded string in crawl-pipeline, not modifying core | Core's CrawlUrl.normalized is `string`; NormalizedUrl assignable to string | ADR-016 |
| 2 | Pipeline uses core's CrawlUrl directly, no wrapper | Core already has the type; avoid duplication | ADR-015 |
| 3 | FrontierEntry in pipeline richer than core's minimal contract | Pipeline needs discoveredBy, discoveredAt, parentUrl; core's is for queue only | ADR-015 |
| 4 | IDN via Node.js url.domainToASCII() | Built-in, no external dep needed | ADR-001 |
| 5 | LinkExtractor contract returns Result per REQ-CRAWL-019; adapter wraps core's bare string[] | Core contract unchanged; pipeline defines enhanced interface | ADR-015 |

## Problems & Solutions

| # | Problem | Solution | Task # |
| --- | --- | --- | --- |
| 1 | Trailing-slash idempotence bug: `http://a.aa///` → strips only one slash | Changed `if` to `while` loop for trailing slash removal | 3 |
| 2 | fast-check API: `fcTest.prop('name', [arbs], fn)` is wrong | Correct API: `fcTest.prop([arbs])('name', fn)` | 10 |
| 3 | Core's Disposable uses `close()`, not `[Symbol.dispose]` | Fixed mock Frontier implementations in tests | 10 |
| 4 | Dynamic import in enqueue-stage hot path (F-CP-001) | Moved to static top-level import | 12 |
| 5 | fetchDurationMs hardcoded to 0 (F-CP-002) | Wrapped fetch with performance.now() timing | 12 |
| 6 | Header case assumption (F-CP-009) | Case-insensitive header lookup function | 12 |
