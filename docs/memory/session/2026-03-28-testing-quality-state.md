# Implementation State Tracker — Testing & Quality

| Field | Value |
| --- | --- |
| Date | 2026-03-28 |
| Branch | `work/testing-quality` |
| Spec | `docs/specs/testing-quality/` |
| Scope | vitest configs, CI workflow, ESLint rules, coverage |
| User request | Implement testing-quality spec (15 unchecked tasks) |

## Current State

| Task | Status | Commit | Notes |
| --- | --- | --- | --- |
| G1: Plan | ✅ | — | Tier 1, test infra + CI |
| G2: Branch | ✅ | — | `work/testing-quality` from main@601bde7 |
| G3: Specs | ✅ | — | 24 reqs, 24 tasks, 6 phases |
| G4: State tracker | ✅ | — | This file |
| T-TEST-002 | ✅ | b186034 | v8 coverage, 80%/75% all packages |
| T-TEST-003 | ✅ | b186034 | JUnit XML reporter all packages |
| T-TEST-007 | ✅ | pre-existing | ESLint import boundary T-ARCH-016 |
| T-TEST-012 | ✅ | pre-existing | Completion detection tests exist |
| T-TEST-013 | ✅ | b186034 | Frontier integration test + Redis container |
| T-TEST-017 | ✅ | b186034 | quality-gate.yml fail-fast CI |
| T-TEST-018 | ✅ | b186034 | Redis service container in CI |
| T-TEST-019 | ✅ | b186034 | Coverage threshold enforcement |
| T-TEST-020 | ✅ | b186034 | 90%/85% domain packages |
| T-TEST-024 | ✅ | b186034 | Redis container helper w/ idempotent cleanup |
| G5: Guards | ✅ | b186034 | 577 tests pass, 1/3 attempts |
| G6: Commit | ✅ | b186034 | feat(testing) |
| G7: State update | ✅ | — | This update |
| G8: RALPH | 🔄 | — | Pending |

## Pre-existing State

- vitest.config.ts exists in all 11 packages (basic, no coverage)
- ESLint config has domain boundary enforcement (T-TEST-007 is effectively T-ARCH-016)
- CI workflow exists (agent-pr-validation.yml) but lacks fail-fast, coverage gates, performance checks
- T-TEST-012 (completion detection tests) already exists
- No coverage thresholds configured anywhere
- No JUnit reporter configured

## Decisions

| # | Decision | Rationale |
| --- | --- | --- |
| 1 | Use `redis` npm pkg over `ioredis` | ioredis is CJS-only, incompatible with verbatimModuleSyntax + Node16 |
| 2 | Integration tests excluded from `test`, use `test:integration` | Prevent CI dependency on Docker for unit test runs |
| 3 | Domain packages get 90%/85% thresholds | REQ-TEST-011 requires 90% for domain code |

## Problems

| # | Problem | Resolution |
| --- | --- | --- |
| 1 | ioredis fails TS resolution under Node16+verbatimModuleSyntax | Switched to `redis` package with ESM support |
| 2 | testing/tsconfig.json excluded test files | Removed exclusion, added @types/node |
