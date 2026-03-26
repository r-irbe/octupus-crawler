# Worklog: URL Frontier Implementation

| Field | Value |
| --- | --- |
| Date | 2026-03-26 |
| Branch | `work/url-frontier` |
| Commit | `6f50cb8` |
| Package | `@ipf/url-frontier` |
| Tests | 45 (41 unit + 4 property) |
| Total suite | 441 tests |

## Summary

Implemented the `@ipf/url-frontier` package — the URL deduplication and BFS-priority enqueueing layer wrapping a `QueueBackend` port interface (ADR-015 hexagonal pattern).

## Files Created

### Production (6 files, ~270 lines)

| File | Lines | Purpose |
| --- | --- | --- |
| `src/job-id.ts` | 21 | SHA-256 truncated to 128 bits for deterministic job IDs |
| `src/priority.ts` | 11 | `depth → priority` mapping for BFS traversal |
| `src/frontier-config.ts` | 46 | Queue name, retry (3 attempts, exp backoff), retention (10K/5K) |
| `src/queue-backend.ts` | 46 | `QueueBackend` port interface (hexagonal) with `addBulk`, `getQueueSize`, `close` |
| `src/collision-detector.ts` | 50 | Heuristic collision detection via addBulk discrepancy |
| `src/frontier-adapter.ts` | 97 | `createFrontierAdapter()` implementing core `Frontier` interface |

### Tests (6 files, 45 tests)

| File | Tests | Type |
| --- | --- | --- |
| `src/job-id.unit.test.ts` | 7 | Unit — determinism, format, unicode, special chars |
| `src/job-id.property.test.ts` | 4 | Property — determinism, format, uniqueness, purity |
| `src/priority.unit.test.ts` | 5 | Unit — BFS ordering invariants |
| `src/frontier-config.unit.test.ts` | 8 | Unit — constant values, composite config |
| `src/collision-detector.unit.test.ts` | 8 | Unit — expected dedup vs unexpected discards |
| `src/frontier-adapter.unit.test.ts` | 13 | Unit — stub QueueBackend, dedup, priority, errors |

### Config (4 files)

`package.json`, `tsconfig.json`, `vitest.config.ts`, `eslint.config.js`

## Requirements Coverage

| Requirement | Status | Test Coverage |
| --- | --- | --- |
| REQ-DIST-001 (dedup) | Implemented | job-id unit + property, adapter dedup test |
| REQ-DIST-002 (BFS) | Implemented | priority unit, adapter priority test |
| REQ-DIST-003 (retry) | Config only | frontier-config unit (actual retry by BullMQ) |
| REQ-DIST-004 (batch) | Implemented | adapter batch test |
| REQ-DIST-005 (retention) | Config only | frontier-config unit (actual eviction by BullMQ) |
| REQ-DIST-006 (queue name) | Implemented | frontier-config unit |
| REQ-DIST-007 (normalization) | Delegated to crawl-pipeline | crawl-pipeline property tests |
| REQ-DIST-008 (collision docs) | Documented | job-id JSDoc, property test |
| REQ-DIST-009 (collision metric) | Implemented | collision-detector unit, adapter collision test |

## Decisions

1. **QueueBackend as hexagonal port** — adapter depends on an interface, not BullMQ directly. Enables pure unit testing without Redis. Production BullMQ adapter deferred to infrastructure package.
2. **URL normalization delegated** — crawl-pipeline already normalizes URLs (REQ-CRAWL-002). Frontier hashes the already-normalized string. Avoids duplication.
3. **In-batch dedup via Map** — `first occurrence wins` for duplicate URLs within a single enqueue call.
4. **Collision detection heuristic** — if `addBulk` reports fewer added than unique job IDs submitted, and the delta exceeds expected in-batch dedup, flag as potential collisions.

## PR Review Council

- **Verdict**: APPROVED with minor fix
- **F-5 (sustained)**: Removed `QueueError` double-wrapping in `frontier-adapter.ts` — propagate backend error directly instead of re-wrapping
- **F-2 (noted)**: URL length guard not needed at frontier layer (upstream crawl-pipeline validates)
- **F-4 (noted)**: Integration tests with Testcontainers deferred until `packages/redis/` available

## Deferred Work

- Integration tests with real Redis via Testcontainers (needs `packages/redis/`)
- BullMQ adapter implementing `QueueBackend` (infrastructure package)
- Actual job processing (worker-service)

---

> **Provenance**: Created 2026-03-26. Implementation session for url-frontier spec.
