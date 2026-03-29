# Worklog: Test Coverage Hardening

**Date**: 2026-03-29
**Branch**: `work/test-coverage-hardening`
**Commits**: 04e3ed5, 3386946

## What Changed

### Pre-Commit Gate Enhancements (T-TCH-001–003)

- `scripts/verify-pre-commit-gates.sh`: Added file size check (>300 hard limit, >200 warning), test naming convention check (`*.{unit,integration,e2e,property,contract}.test.ts`), eslint-disable justification check

### Guard Chain Completeness (T-TCH-004–005)

- `scripts/verify-guard-chain.sh`: Added `test:integration` and `test:property` stages after unit tests, with container info reporting on integration failure

### Missing Unit Tests (T-TCH-006–011)

- `packages/core/src/errors/queue-error.unit.test.ts` — 4 tests for `createQueueError` factory
- `packages/crawl-pipeline/src/normalized-url.unit.test.ts` — 3 tests for `brandNormalizedUrl`
- `packages/application-lifecycle/src/exit-codes.unit.test.ts` — 7 tests for exit code constants + `exitCodeForReason`
- `packages/virtual-memory/src/page-table.unit.test.ts` — 11 tests for `createPageTable`, `estimateReloadCost`, `summarizePages`
- `packages/virtual-memory/src/selective-loader.unit.test.ts` — 10 tests for `selectiveLoad`, `filterTaskScoped`, `totalTokenCost`, `shouldLoadBySection`
- `packages/virtual-memory/src/state-tracker.unit.test.ts` — 12 tests for `stateTrackerPath`, `parseStateTracker`, `formatUpdate`

### E2E Alerting Validation (T-TCH-012–014)

- `packages/testing/src/e2e/alerting-rules.e2e.test.ts` — 11 tests: promtool syntax validation, all 12 alert rules defined, runbook annotation check, metric coverage (all alert-referenced metrics exist in crawler /metrics), threshold validation for HighErrorRate and ZeroFetchRate
- `packages/testing/src/e2e/helpers/metrics-helper.ts` — Added `extractAlertMetricNames` helper

### Spec Documents

- `docs/specs/test-coverage-hardening/requirements.md` — 16 EARS requirements (REQ-TCH-001–016)
- `docs/specs/test-coverage-hardening/design.md` — Architecture
- `docs/specs/test-coverage-hardening/tasks.md` — 14 tasks (14/14 complete)

## RALPH Review Findings

- F-001 (Minor): Replaced `execSync` with `execFileSync` (array args) to avoid shell metacharacter risks
- F-006/F-008 (Minor): Moved `extractAlertMetricNames` to `metrics-helper.ts`, reducing alerting E2E from 223→194 lines
- F-003 (Minor): Audited scripts — all variables already properly quoted

## Decisions

- Targeted 6 implementation files for unit tests (excluded pure type/interface files like contracts/*.ts)
- E2E alerting test validates alert rules against live crawler metrics (not mocked)
- Used `execFileSync` (array form) instead of `execSync` (template literal) per security best practice

## Deferred

- None

## Learnings

- `EvictionPriority` is `0|1|2|3|4` (numeric), not a string like `'normal'`
- `StateTrackerError` is a discriminated union — must narrow with `_tag` check before accessing `message`
