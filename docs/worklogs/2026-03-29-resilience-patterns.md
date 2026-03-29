# Worklog: Resilience Patterns Implementation

**Date**: 2026-03-29
**Branch**: `work/resilience-patterns`
**Spec**: `docs/specs/resilience-patterns/` (ADR-009)

## Summary

Implemented Phase 1 + Phase 2 of the resilience-patterns spec plus property tests (Phase 6 partial). Created `packages/resilience/` with cockatiel-based circuit breaker, retry, timeout, and policy composition.

## What Changed

### New Files (20)

| File | Description |
| --- | --- |
| `packages/resilience/package.json` | Package config with cockatiel ^3.2.1 |
| `packages/resilience/tsconfig.json` | Extends tsconfig.base.json |
| `packages/resilience/vitest.config.ts` | Standard Vitest config |
| `packages/resilience/eslint.config.js` | Re-exports @ipf/eslint-config |
| `packages/resilience/src/resilience-types.ts` | ResilienceConfig, DEFAULT_RESILIENCE_CONFIG, ResilienceError union |
| `packages/resilience/src/circuit-breaker-registry.ts` | Per-domain CB factory with LRU eviction |
| `packages/resilience/src/retry-policy.ts` | Retry with exponential backoff + idempotency guard |
| `packages/resilience/src/timeout-policy.ts` | Cooperative timeout for fetch/db/redis targets |
| `packages/resilience/src/policy-composer.ts` | Composed timeout → retry → CB via wrap() |
| 7 test files | 40 tests (31 unit + 9 property) |

### Modified Files (2)

| File | Change |
| --- | --- |
| `packages/config/src/config-schema.ts` | Added 9 resilience config keys |
| `packages/config/src/config-slices.ts` | Added ResilienceConfigSlice type |

## Tasks Completed

- T-RES-001: Package creation with cockatiel
- T-RES-002: Per-domain circuit breaker with LRU eviction
- T-RES-003: Circuit breaker state change callbacks (OTel hook point)
- T-RES-004: Zod config for CB threshold, halfOpenAfter, retry, timeout defaults
- T-RES-005: Retry with exponential backoff + jitter
- T-RES-006: Idempotency guard (non-idempotent operations skip retry)
- T-RES-007: Cooperative timeout (fetch 30s, db 10s, redis 5s)
- T-RES-008: Policy composition via wrap()
- T-RES-021: Property tests for CB state transitions (5 properties)
- T-RES-023: Property tests for retry backoff bounds (4 properties)

## Decisions

1. **cockatiel maxAttempts semantics**: `maxAttempts` means retries (not total). Total = 1 initial + maxAttempts.
2. **O(n) LRU eviction**: Acceptable for 10K entries (~sub-ms). Defer linked-list LRU to profiling.
3. **IPolicy cast for getState**: Required because cockatiel's IPolicy doesn't expose `.state`. Isolated to one method.
4. **neverthrow removed**: Declared but unused — ResilienceError types are plain objects for now. Will integrate with Result<> in Phase 5 integration tasks.

## RALPH Review Findings

| ID | Severity | Finding | Resolution |
| --- | --- | --- | --- |
| AR-2 | Minor | Type cast comment missing | Added explanatory comment |
| AR-4 | Minor | O(n) LRU not documented | Added performance note |
| AR-6 | Minor | Unused neverthrow dependency | Removed from package.json |

## Commits

- `838340a` — feat(resilience): add resilience package with circuit breaker, retry, timeout, and policy composition (20 files, 1248 insertions)
- `c79e397` — refactor(resilience): apply RALPH review findings (4 files)

## Deferred

- T-RES-009 through T-RES-020: Phases 3-5 (rate limiting, bulkhead, fallback, DLQ, integration)
- T-RES-022, T-RES-024, T-RES-025: Remaining test tasks

## Learnings

- cockatiel's `retry()` `maxAttempts` means number of retries, not total attempts — document this to prevent future confusion
- `Promise.resolve(fn())` doesn't catch synchronous throws — use `new Promise` wrapper for reliable async error handling
- Property tests with real backoff delays can exceed test timeouts — use constant small delays in property test configs
