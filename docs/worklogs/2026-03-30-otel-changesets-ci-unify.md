# Worklog: OTel + Changesets + CI Unification

**Date**: 2026-03-30
**Branch**: `work/otel-changesets-ci-unify`
**Tasks**: T-COMM-004, T-CICD-017, T-CICD-018, T-CICD-022, T-CICD-023

## Changes

### T-COMM-004: OTel tRPC Middleware

- Created `packages/api-router/src/otel-middleware.ts` (87 lines)
- `otelMiddlewareFn`: plain function (not bound to specific tRPC context) for W3C trace propagation
- `injectTraceHeaders`: client-side helper for carrier injection
- `extractParentContext`: runtime-narrowed extraction from `ctx.meta`
- Added `@opentelemetry/api` dependency to api-router
- 6 unit tests covering span creation, error recording, meta extraction, header injection

### T-CICD-017: Changesets Configuration

- Installed `@changesets/cli` + `@changesets/changelog-github`
- Created `.changeset/config.json` with linked versioning groups
- Added `changeset`, `version-packages`, `release` scripts to root package.json

### T-CICD-018: Version Packages GitHub Action

- Created `.github/workflows/version-packages.yml`
- Runs on push to main, creates "Version Packages" PR via `changesets/action@v1`

### T-CICD-022: ADR Compliance Scan

- Created `scripts/check-adr-compliance.sh` (advisory, always exits 0)
- Checks: pnpm lockfile, Jest configs, direct process.env, barrel imports, any type, file size, feature specs

### T-CICD-023: CI Workflow Unification

- Integrated unique jobs from `agent-pr-validation.yml` and `quality-gate.yml` into `ci.yml`
- Migrated: spec-drift, context-file-lint, property-test-coverage, security-scan, integration-tests, alert-tests
- Disabled triggers in superseded workflows (changed to `workflow_dispatch`)
- Added ADR compliance scan job

## RALPH Review

- Round 1: 1 Critical (S-001: security scan not migrated) + 6 Major
- All fixed: S-001, A-001, P-001/P-002, R-001, T-001/T-002
- Re-review: N-001 (dead artifact upload) fixed by moving into guard-functions job
- N-002 (pin Trivy action), N-003 (fix silent test failure) also fixed

## Decisions

- `otelMiddlewareFn` is a plain function, not a tRPC middleware builder, to decouple from specific context types
- Changesets uses linked versioning: core/config/validation, redis/database, api-router/observability
- Old CI workflows retained with `workflow_dispatch` trigger (not deleted) for reference

## Deferred

- `ci.yml` is 292 lines (over 200 target, under 300 hard limit) — may need splitting via reusable workflows later
