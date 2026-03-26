# Implementation State Tracker — url-frontier

## Session Identity

| Field | Value |
| --- | --- |
| Date | 2026-03-26 |
| Branch | `work/url-frontier` |
| User request | Implement url-frontier package (job queue adapter, dedup, BFS ordering, collision detection) |
| Scope | `packages/url-frontier/` (new package) |

## Applicable ADRs

- ADR-002: Job queue system (BullMQ + Dragonfly)
- ADR-010: Data layer (Redis for queue state)
- ADR-015: Hexagonal architecture (port/adapter pattern for queue backend)
- ADR-016: Coding standards (neverthrow, strict TS)
- ADR-020: Spec-driven development (EARS requirements)

## Task Queue

| # | Task | Status | Commit | Notes |
| --- | --- | --- | --- | --- |
| 1 | Scaffold package | `done` | ff886fd | package.json, tsconfig, vitest, eslint |
| 2 | Job ID derivation (SHA-256 hash) | `done` | ff886fd | T-DIST-001, 21 lines |
| 3 | Depth-to-priority mapping | `done` | ff886fd | T-DIST-002, 11 lines |
| 4 | Queue config (name, retry, retention) | `done` | ff886fd | T-DIST-003/4/5/6, 46 lines |
| 5 | QueueBackend port interface | `done` | ff886fd | Hexagonal, T-DIST-007, 46 lines |
| 6 | Frontier adapter (implements core Frontier) | `done` | ff886fd | T-DIST-007/8/9/10, 98 lines |
| 7 | Collision detection | `done` | ff886fd | T-DIST-018, REQ-DIST-009, 50 lines |
| 8 | Unit + property tests | `done` | ff886fd | 45 tests (41 unit + 4 property) |
| 9 | Guard functions + commit | `done` | ff886fd | G5 passed attempt 1/3, 441 tests |
| 10 | PR Review Council | `in-progress` | — | G8 |

## Current State

| Field | Value |
| --- | --- |
| Current task # | 10 |
| Last completed gate | G6 |
| Guard function status | `passed` (attempt 1/3, 441 tests) |
| Commits on branch | 1 (ff886fd) |
| Tests passing | 441 |
| Blockers | none |

## Decisions Log

| # | Decision | Rationale | ADR ref |
| --- | --- | --- | --- |
| 1 | URL normalization NOT re-implemented; frontier hashes already-normalized URLs from crawl-pipeline | Avoid duplication; crawl-pipeline's normalizeUrl satisfies REQ-DIST-007 | ADR-015 |
| 2 | QueueBackend as a port interface (not importing BullMQ directly) | Hexagonal architecture; unit-testable without Redis; BullMQ adapter separate | ADR-015 |
| 3 | Integration tests with Testcontainers deferred to infra setup | No Redis available yet; pure unit tests + stub QueueBackend for now | ADR-007 |
| 4 | Collision detection via addBulk expected vs actual count | Per REQ-DIST-009; MetricsReporter injected for counter increment | ADR-006 |

## Problems & Solutions

| # | Problem | Solution | Task # |
| --- | --- | --- | --- |
