# Worklog: TypeSpec API Contracts + Versioning Middleware + CI Split

**Date**: 2026-03-30
**Branch**: `work/typespec-api-contracts`
**Commit**: `0d390b6`

## What Changed

### T-COMM-006: TypeSpec Compiler Setup
- Installed `@typespec/compiler`, `@typespec/http`, `@typespec/rest`, `@typespec/openapi3`, `@typespec/versioning` as workspace devDeps
- Installed `@stoplight/spectral-cli` for OpenAPI linting (REQ-COMM-006)
- Created `specs/` directory with `tspconfig.yaml` and `.spectral.yaml`
- Added `typespec:compile` and `typespec:lint` scripts to root `package.json`

### T-COMM-007: CrawlerAPI TypeSpec Definition
- Defined CrawlerAPI service in `specs/main.tsp` with versioning (`@versioned`)
- Models: CrawlSubmitRequest, CrawlSubmitResponse, CrawlStatusResponse, HealthResponse, ErrorResponse
- Operations: POST /api/v1/crawl, GET /api/v1/crawl/{jobId}, GET /api/v1/health
- Validation constraints mirror Zod schemas: `@minItems`, `@maxItems`, `@minValue`, `@maxValue`, `@maxLength`
- Generated OpenAPI spec committed at `specs/generated/openapi.v1.yaml`
- Spectral lint: 0 errors, 2 warnings (info-contact, unused Versions enum)

### T-COMM-008: TypeSpec CI Step
- Added `typespec-compile` job to `ci-quality.yml`
- Compiles TypeSpec, lints with Spectral, and checks for spec drift via `git diff`

### T-COMM-009: API Versioning Middleware
- Created `packages/api-router/src/api-versioning.ts`
- `extractVersion()`: parses `/api/vN/` prefix with `neverthrow` Result type
- `deprecationHeaders()`: returns RFC 8594 headers (Deprecation, Link) for deprecated versions
- 8 unit tests covering extraction, missing version, unsupported version, nested paths

### CI Split
- Split `ci.yml` from 316 → 143 lines (under 200 target)
- Created `ci-quality.yml` (~175 lines) with: agent branch checks, security scan, integration tests, alert tests, TypeSpec compile
- Updated `agents-ci-validation.unit.test.ts` to validate `ci-quality.yml` instead of superseded workflows

## Files Created/Modified

| File | Action |
| ---- | ------ |
| `specs/main.tsp` | Created |
| `specs/tspconfig.yaml` | Created |
| `specs/.spectral.yaml` | Created |
| `specs/generated/openapi.v1.yaml` | Created (generated) |
| `packages/api-router/src/api-versioning.ts` | Created |
| `packages/api-router/src/api-versioning.unit.test.ts` | Created |
| `.github/workflows/ci-quality.yml` | Created |
| `.github/workflows/ci.yml` | Modified (trimmed) |
| `packages/api-router/package.json` | Modified (added export) |
| `packages/testing/src/agents-ci-validation.unit.test.ts` | Modified (updated for CI split) |
| `package.json` | Modified (typespec scripts, spectral dep) |
| `pnpm-lock.yaml` | Modified |

## Decisions

- **Committed generated OpenAPI**: Contract artifact for downstream consumers; CI drift check catches staleness
- **CI split**: ci.yml core pipeline + ci-quality.yml supplementary checks — file size compliance
- **OpenAPI 3.0 vs 3.1**: Documented as known limitation of `@typespec/openapi3` emitter v1.10.0

## RALPH Review

### Findings Addressed
- **F-001 (Major)**: Documented 3.0 vs 3.1 gap in tspconfig.yaml and main.tsp
- **F-002 (Major)**: Added validation decorators to mirror Zod constraints
- **F-003 (Minor)**: Removed empty `Sunset: ''` header — omit when no date set
- **F-005 (Minor)**: Added TODO for `@useAuth(BearerAuth)` auth scheme
- **F-008 (Informational)**: Removed stale REQ-COMM references from ci.yml

### Re-review: APPROVED (all findings resolved)

## Deferred Items

- `@useAuth(BearerAuth)` — add when auth design is finalized
- OpenAPI 3.1 upgrade — when `@typespec/openapi3` emitter supports it
- T-COMM-005: Wire tRPC into api-gateway (needs `apps/api-gateway` creation)

## Learnings

- TypeSpec `@typespec/openapi3` v1.10.0 generates 3.0.0, not 3.1 — must document gap
- TypeSpec `@service` doesn't support contact/description metadata directly — use `/** doc comments */` for description
- `{project-root}` vs `{output-dir}` in tspconfig.yaml: use `{project-root}` for paths relative to the specs/ directory
- Pre-commit hook blocks commits with a different message format — use shorter first line
