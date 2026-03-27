# Worklog: Completion Detection Implementation

| Field | Value |
| --- | --- |
| Date | 2026-03-27 |
| Branch | `work/completion-detection` |
| Commits | `d01b5e2`, `c824fa5` |
| Package | `@ipf/completion-detection` |
| Spec | `docs/specs/completion-detection/` |

## Summary

Implemented the completion-detection package covering 16 EARS requirements (REQ-DIST-012 through REQ-DIST-027) across 4 modules with 38 unit tests.

## Files Created

### Source (5 files)
- `packages/completion-detection/src/backoff-controller.ts` (77 lines) — Exponential backoff with skip ticks and abort threshold
- `packages/completion-detection/src/completion-detector.ts` (113 lines) — Poll loop with completion/empty/abort outcomes and restart detection
- `packages/completion-detection/src/control-plane-adapter.ts` (103 lines) — Live state derivation, pause/resume, idempotent cancel with error propagation
- `packages/completion-detection/src/leader-election.ts` (120 lines) — SETNX-based leader election with lease renewal and fencing
- `packages/completion-detection/src/coordinator-config.ts` (16 lines) — Zod schema for coordinator configuration

### Tests (4 files, 38 tests)
- `backoff-controller.unit.test.ts` — 6 tests (exponential backoff, cap, abort, reset, ignore-after-abort, non-Error values)
- `completion-detector.unit.test.ts` — 8 tests (completed, empty-complete, restart detection, aborted, store error, once guard, empty poll reset, skip tick)
- `control-plane-adapter.unit.test.ts` — 13 tests (idle, running, completed, paused, delayed-only, error propagation, progress, pause, resume, cancel dedup, cancel error, cancelled state, close)
- `leader-election.unit.test.ts` — 11 tests (acquire, not acquired, store error, renewal, lost leadership, release, fencing, renewal timer, idempotent start)

### Scaffolding
- `package.json`, `tsconfig.json`, `vitest.config.ts`, `eslint.config.js`

## RALPH Review (G8)

7 findings from 6-reviewer council:

| ID | Severity | Finding | Fix |
| --- | --- | --- | --- |
| F-001 | Major | `deriveState` omitted `delayed` from pending | Added `delayed` to calculation |
| F-002 | Major | `cancel()` swallowed obliterate errors | Propagated error result |
| F-003 | Major | `setInterval` overlapping ticks | Replaced with recursive `setTimeout` |
| F-004 | Minor | TOCTOU in leader release | Documented limitation |
| F-005 | Major | Missing tests (delayed state, cancel failure) | Added 2 tests |
| F-006 | Minor | Wrong REQ reference in test header | Fixed traceability |
| F-007 | Minor | No non-Error backoff test | Added test |

Re-review: **APPROVED** — all findings resolved, no regressions.

## Deferred Items

- **F-008** (Betterment): `AbortSignal` for poll loop composability with graceful shutdown
- **F-004 full fix**: `compareAndDelete` in `LeaseStore` (cross-package, Tier 3)
- **T-COORD-012**: Connection string parsing (infrastructure wiring, belongs in apps/)
- **T-COORD-013**: Error handlers on event emitters (infrastructure wiring)

## Design Decisions

| # | Decision | Rationale |
| --- | --- | --- |
| D1 | `LeaseStore` abstraction for leader election | Avoids direct Redis dependency, enables in-memory testing |
| D2 | `QueueAdapter` abstraction for control plane | Same approach — pure domain, no BullMQ dependency |
| D3 | Recursive `setTimeout` over `setInterval` | Prevents overlapping tick execution under slow network conditions |

## Learnings

1. **Async throw tests**: Use `rejects.toThrow()` for async functions, not `expect(() => fn()).toThrow()`
2. **`recLogger()` pattern**: Standard mock logger across all test files — define as function returning `as Logger` cast
3. **`delayed` jobs in state derivation**: Always include all job states when computing `pending` — easy to miss `delayed` category
4. **Cancel error propagation**: Promise deduplication + fire-and-forget is tempting but violates the interface contract if the return type is `Result<void, Error>`
