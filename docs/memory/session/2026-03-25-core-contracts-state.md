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
| 1 | T-ARCH-001: FetchError discriminated union (9 variants) | `pending` | — | — |
| 2 | T-ARCH-002: UrlError discriminated union (3 variants) | `pending` | — | — |
| 3 | T-ARCH-003: CrawlError superset union | `pending` | — | — |
| 4 | T-ARCH-004: CrawlUrl branded type | `pending` | — | — |
| 5 | T-ARCH-005: Frontier interface | `pending` | — | — |
| 6 | T-ARCH-006: Fetcher interface | `pending` | — | — |
| 7 | T-ARCH-007: Logger interface | `pending` | — | — |
| 8 | T-ARCH-008: CrawlMetrics interface | `pending` | — | — |
| 9 | T-ARCH-009: JobConsumer interface | `pending` | — | — |
| 10 | T-ARCH-010: JobEventSource interface | `pending` | — | — |
| 11 | T-ARCH-011: LinkExtractor interface | `pending` | — | — |
| 12 | T-ARCH-012: ControlPlane interface | `pending` | — | — |
| 13 | T-ARCH-028: Disposable interface | `pending` | — | — |
| 14 | T-ARCH-013: Zod config schema | `pending` | — | — |
| 15 | T-ARCH-014: loadConfig() with Result | `pending` | — | — |
| 16 | T-ARCH-015: Narrow config slice types | `pending` | — | — |
| 17 | T-ARCH-022: Error constructor unit tests | `pending` | — | — |
| 18 | T-ARCH-023: Config loading unit tests | `pending` | — | — |

## Current State

| Field | Value |
| --- | --- |
| Current task # | 1 (T-ARCH-001: FetchError — TDD RED phase next) |
| Last completed gate | G7 (state tracker updated after scaffold commit) |
| Guard function status | PASS — typecheck ✅ lint ✅ test ✅ |
| Commits on branch | 1 (`b0a34c0` scaffold) |
| Tests passing | yes (0 test files, passWithNoTests) |
| Blockers | Must delete premature production error files before TDD RED |

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
