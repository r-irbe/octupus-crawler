# Worklog — Testing & Quality Infrastructure

| Field | Value |
| --- | --- |
| Date | 2026-03-28 |
| Branch | `work/testing-quality` |
| Commits | `b186034`, `30f91bb` |
| Spec | `docs/specs/testing-quality/` |

## Summary

Implemented testing & quality infrastructure: coverage thresholds, JUnit reporters, CI pipeline, Testcontainer helpers, and frontier integration tests.

## Changes

### Coverage Configuration (T-TEST-002, T-TEST-020)
- All 11 package vitest.config.ts: v8 coverage provider with thresholds
- Two-tier model: domain packages (90%/85%), base packages (80%/75%)
- Domain tier: core, url-frontier, crawl-pipeline, completion-detection, worker-management, ssrf-guard
- Integration test files excluded from coverage metrics

### JUnit XML Reporter (T-TEST-003)
- All 11 packages produce JUnit XML at `./test-results/junit.xml`
- `test-results/` added to `.gitignore`

### CI Pipeline (T-TEST-017–T-TEST-019)
- `.github/workflows/quality-gate.yml`: fail-fast chain
- Jobs: typecheck → lint → unit-tests → integration-tests → alert-tests
- Redis 7-alpine service container for integration tests
- Coverage threshold enforcement via `--coverage`
- Performance baseline checks (30s unit, 120s integration, 20% regression warning)
- Promtool alert rule validation

### Testcontainer Infrastructure (T-TEST-024)
- `packages/testing/src/containers/redis-container.ts`: Managed container with idempotent stop()
- Redis container integration test validating lifecycle
- Dependencies: testcontainers, redis (ESM-compatible)

### Integration Tests (T-TEST-013)
- `packages/url-frontier/src/frontier-adapter.integration.test.ts`
- Tests frontier enqueue, cross-batch dedup, within-batch dedup with real Redis
- Redis-backed QueueBackend implementation for testing

### Turbo Configuration
- Added `test:integration` (uncached), `test:property`, `test:alerts` tasks

## Decisions

| Decision | Rationale |
| --- | --- |
| `redis` npm package over `ioredis` | ioredis is CJS-only, fails under verbatimModuleSyntax + Node16 |
| Integration tests excluded from default `test` | Prevent Docker dependency for unit test CI |
| ssrf-guard classified as domain-tier | Contains security-critical pure domain logic (RALPH F-013) |

## RALPH Review Council

### Round 1: 13 findings (2 Major, 5 Minor, 6 Info)
### Round 3: 6 sustained (F-001, F-002, F-003, F-007, F-010, F-013)
### Delta re-review: All 6 resolved → APPROVED

Key findings:
- F-001: Coverage exclude must include `*.integration.test.ts`
- F-002: Design.md must document two-tier threshold model
- F-003: CI must not silently swallow integration test failures
- F-013: ssrf-guard promoted to domain-tier thresholds

## Deferred Items

- T-TEST-014: Worker job processing integration test (needs BullMQ adapter)
- T-TEST-015: Graceful shutdown integration test (needs real connections)
- T-TEST-016: Metrics endpoint scraping test (needs Prometheus integration)
- T-TEST-024 partial: Global orphan timeout not implemented (idempotent stop done)
- DRY refactor of 11 vitest configs (F-005, not sustained)
- Supply-chain hardening for CI binaries (F-006, not sustained)

---

> Agent: GitHub Copilot | Requirement: testing-quality spec
