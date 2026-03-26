# Implementation State Tracker — crawl-pipeline

## Session Identity

| Field | Value |
| --- | --- |
| Date | 2025-07-18 |
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
| 1 | Scaffold package (package.json, tsconfig, vitest) | `pending` | — | — |
| 2 | NormalizedUrl branded type | `pending` | — | T-CRAWL-002 |
| 3 | URL normalizer (strip fragment, slash, sort params, IDN) | `pending` | — | T-CRAWL-001, T-CRAWL-021 |
| 4 | CrawlUrl factory (scheme check, errors) | `pending` | — | T-CRAWL-003, T-CRAWL-004 |
| 5 | Pipeline data types (FrontierEntry, FetchResult, CrawlResult) | `pending` | — | T-CRAWL-005/6/7, T-CRAWL-022/023 |
| 6 | Validate stage (depth + domain) | `pending` | — | T-CRAWL-008 |
| 7 | Discover stage (content-type, extract, resolve, dedup) | `pending` | — | T-CRAWL-010 |
| 8 | Enqueue stage (child depth, batch) | `pending` | — | T-CRAWL-011 |
| 9 | Pipeline composition | `pending` | — | T-CRAWL-012 |
| 10 | Unit + property tests | `pending` | — | T-CRAWL-013–020, 024–026 |
| 11 | Guard functions + commit | `pending` | — | G5, G6 |
| 12 | PR Review Council | `pending` | — | G8 |

## Current State

| Field | Value |
| --- | --- |
| Current task # | 1 |
| Last completed gate | G4 |
| Guard function status | `not-run` |
| Commits on branch | 0 |
| Tests passing | — |
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
