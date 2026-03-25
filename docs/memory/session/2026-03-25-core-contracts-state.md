# Implementation State Tracker — Core Contracts

## Session Identity

| Field | Value |
| --- | --- |
| Date | 2026-03-25 |
| Branch | `work/core-contracts` |
| User request | Implement core-contracts spec: monorepo scaffold, contract types, error taxonomy, config schema, unit tests |
| Scope | root (monorepo config), `packages/core/`, `packages/config/`, `packages/eslint-config/`, `packages/testing/` |

## Applicable ADRs

- ADR-001: Monorepo tooling — Turborepo + pnpm layout, package structure
- ADR-013: Configuration management — Zod-validated env vars, loadConfig pattern
- ADR-015: Application architecture — Clean architecture layers, dependency rules
- ADR-016: Coding standards — TypeScript strict, neverthrow, CUPID, naming conventions

## Task Queue

| # | Task | Status | Commit | Notes |
| --- | --- | --- | --- | --- |
| 0 | Monorepo scaffold (package.json, pnpm-workspace, turbo.json, tsconfig) | `done` | `b0a34c0` | Prerequisite — ADR-001. G5 pass. |
| 1 | T-ARCH-001: FetchError discriminated union (9 variants) | `done` | `13c5a5d` | TDD RED→GREEN→REFACTOR |
| 2 | T-ARCH-002: UrlError discriminated union (3 variants) | `done` | `13c5a5d` | TDD RED→GREEN→REFACTOR |
| 3 | T-ARCH-003: CrawlError superset union | `done` | `13c5a5d` | TDD RED→GREEN→REFACTOR |
| 4 | T-ARCH-004: CrawlUrl branded type | `done` | `3795aed` | TDD RED→GREEN→REFACTOR |
| 5 | T-ARCH-005: Frontier interface | `done` | `bc07226` | TDD RED→GREEN→REFACTOR |
| 6 | T-ARCH-006: Fetcher interface | `done` | `bc07226` | TDD RED→GREEN→REFACTOR |
| 7 | T-ARCH-007: Logger interface | `done` | `bc07226` | TDD RED→GREEN→REFACTOR |
| 8 | T-ARCH-008: CrawlMetrics interface | `done` | `bc07226` | TDD RED→GREEN→REFACTOR |
| 9 | T-ARCH-009: JobConsumer interface | `done` | `bc07226` | TDD RED→GREEN→REFACTOR |
| 10 | T-ARCH-010: JobEventSource interface | `done` | `bc07226` | TDD RED→GREEN→REFACTOR |
| 11 | T-ARCH-011: LinkExtractor interface | `done` | `bc07226` | TDD RED→GREEN→REFACTOR |
| 12 | T-ARCH-012: ControlPlane interface | `done` | `bc07226` | TDD RED→GREEN→REFACTOR |
| 13 | T-ARCH-028: Disposable interface | `done` | `bc07226` | TDD RED→GREEN→REFACTOR |
| 14 | T-ARCH-013: Zod config schema | `done` | `5d4b0ad` | TDD RED→GREEN→REFACTOR, 7 tests |
| 15 | T-ARCH-014: loadConfig() with Result | `done` | `5d4b0ad` | TDD RED→GREEN→REFACTOR, 4 tests |
| 16 | T-ARCH-015: Narrow config slice types | `done` | `5d4b0ad` | TDD RED→GREEN→REFACTOR, 4 tests |
| 17 | T-ARCH-022: Error constructor unit tests | `done` | `13c5a5d` | Covered in Phase 1 error TDD |
| 18 | T-ARCH-023: Config loading unit tests | `done` | `5d4b0ad` | Covered in config TDD |
| 19 | G8 Review Council (Phase 1+2) | `done` | `f052239` | 4 Major findings fixed, 2 deferred to tasks.md |
| 20 | Dependency upgrade (TS6, ESLint 10, Zod 4, Vitest 4) | `done` | `5fdd140` | G8 review: no Major findings |
| 21 | T-ARCH-016: Layer boundary ESLint rules | `done` | `ee07cfa` | import-x/no-restricted-paths |
| 22 | T-ARCH-017: Circular dependency detection | `done` | `ee07cfa` | import-x/no-cycle |
| 23 | T-ARCH-018: Test boundary rules | `done` | `ee07cfa` | prod cannot import test files |
| 24 | T-ARCH-019: Contracts purity rule | `done` | `ee07cfa` | no-restricted-syntax, smoke tested |
| 25 | T-ARCH-020: Composition root with phased wiring | `done` | `78f0c4a` | TDD RED→GREEN, factory-based DI |
| 26 | T-ARCH-021: Signal handlers (SIGTERM/SIGINT) | `done` | `78f0c4a` | once-only shutdown, cleanup fn |
| 27 | T-ARCH-026: Singleton guard | `done` | `78f0c4a` | Module-level boolean + throw |
| 28 | T-ARCH-027: Reverse-order cleanup on partial failure | `done` | `78f0c4a` | cleanupReverse with swallowed errors |

## Current State

| Field | Value |
| --- | --- |
| Current task # | Phase 4+5 COMPLETE. Next: G8 review, then Phase 6 (remaining tests) |
| Last completed gate | G6 (commit `78f0c4a` — Phase 4+5 composition root + safety) |
| Guard function status | PASS — typecheck ✅ lint ✅ test ✅ (70 tests) |
| Commits on branch | 14 (`b0a34c0`..`5fbe2ec`, `78f0c4a`) |
| Tests passing | yes (70 tests in 12 files: 53 core + 17 config) |
| Blockers | None |
| Versions | TS 6.0.2, ESLint 10, Zod 4.3.6 (zod/v4), Vitest 4.x, pnpm 10.33.0, Node 22+ |
| New deps | eslint-plugin-import-x ^4.16.2, @types/node ^25.5.0 |

## Recovery Plan

1. ~~Run G5 guard functions on scaffold files~~ ✅ PASS
2. ~~Fix failures~~ ✅ Fixed testing generators, config placeholder
3. ~~G6 commit scaffold~~ ✅ `b0a34c0`
4. ~~G7 update this tracker~~ ✅ (this update)
5. Delete premature production error type files (written before tests — TDD violation)
6. Restart Phase 1 with TDD RED phase (tests first)

## Decisions Log

| # | Decision | Rationale | ADR ref |
| --- | --- | --- | --- |
| 1 | Use `kind` field for error unions (not `_tag`) | Design.md specifies `kind`; `_tag` is for domain entities | ADR-016 |
| 2 | Config loadConfig returns Result, not throws | REQ-ARCH-014 mandates Result return; ADR-013 example throws but spec overrides | ADR-013 |
| 3 | Scaffold monorepo before contracts | No package.json exists yet — prerequisite | ADR-001 |
| 4 | VIOLATION: wrote production error files before tests | Must delete and restart with TDD RED | ADR-007 |
| 5 | VIOLATION: no guard functions or commits after scaffold | Must run G5→G6→G7 before proceeding | ADR-018 |

## Problems & Solutions

| # | Problem | Solution | Task # |
| --- | --- | --- | --- |
| 1 | Wrote ~19 files without running guard functions | Run G5 now, fix failures, commit | 0 |
| 2 | Wrote production error types before tests (TDD violation) | Delete errors/, restart with RED phase | 1-3 |
| 3 | Never stated belief level | State belief before every task going forward | all |
| 4 | Never planned subagents for multi-package work | Plan for Review Agent at G8 | all |
| 5 | Silent decisions (tsconfig module, kind vs _tag) | Log all decisions, show alternatives | all |
