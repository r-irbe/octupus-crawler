# Worklog: Data Layer Resilience

**Date**: 2026-03-30
**Branch**: `work/data-layer-resilience`
**Commit**: 37bd3a8
**Tasks**: T-DATA-015 (circuit breaker), T-DATA-016 (graceful shutdown)

## What Changed

### New Files
- `packages/database/src/connection/circuit-breaker.ts` — cockatiel ConsecutiveBreaker wrapper for DB calls
- `packages/database/src/connection/shutdown.ts` — SIGTERM/SIGINT handler that drains pool
- `packages/database/src/circuit-breaker.unit.test.ts` — 11 tests for circuit breaker
- `packages/database/src/shutdown.unit.test.ts` — 7 tests for graceful shutdown

### Modified Files
- `packages/database/package.json` — added `cockatiel` dependency, new exports
- `pnpm-lock.yaml` — lockfile update

## Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Wrap DataError in Error for cockatiel throw | `@typescript-eslint/only-throw-error` requires Error instances |
| 2 | Use ConsecutiveBreaker (not SamplingBreaker) | Matches existing resilience package pattern (ADR-009) |
| 3 | Catch-all returns ConnectionFailed not CircuitOpen | RALPH DA1 finding: unknown errors must not be masked as circuit trips |

## RALPH Review Summary

- **Round 1**: 1 Major (DA1: catch-all swallows unknown errors), 4 Minor, 2 Info
- **Fix**: Changed catch-all from `createCircuitOpen` to `createConnectionFailed(error)`, added test
- **Re-review**: DA1 resolved. Verdict: **APPROVED**
- **Sustained Minor (non-blocking)**: S1 (DataError wrapping fragility — future: dedicated wrapper class)

## Test Results

- 87 tests pass in database package (18 new: 11 CB + 7 shutdown)
- Total across monorepo: all 16 packages pass typecheck + lint + test

## Learnings

- cockatiel `CircuitState` is a numeric enum (0=Closed, 1=Open, 2=HalfOpen, 3=Isolated), not a string
- cockatiel policy `.state` is accessed via `policy.state` (no getter method), but not in TypeScript types — requires `as unknown` cast
- `only-throw-error` lint rule forces Error wrapping for any non-Error thrown objects

---

> **Provenance**: Created 2026-03-30 by Copilot agent.
