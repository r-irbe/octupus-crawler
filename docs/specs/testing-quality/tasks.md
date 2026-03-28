# Testing & Quality — Tasks

> Implementation tasks traceable to [requirements.md](requirements.md). Dependency-ordered.
> Design: [design.md](design.md)

---

## Phase 1: Test Infrastructure

- [x] **T-TEST-001**: Configure Vitest with co-located test patterns → REQ-TEST-002, REQ-TEST-003
- [x] **T-TEST-002**: Configure v8 coverage provider with thresholds (80% line, 75% branch) → REQ-TEST-009, REQ-TEST-010
- [x] **T-TEST-003**: Configure JUnit XML reporter → REQ-TEST-015
- [x] **T-TEST-004**: Add Testcontainers dependency to testing package → REQ-TEST-005

## Phase 2: Type System & Lint

- [x] **T-TEST-005**: Configure tsconfig with strict + exactOptionalPropertyTypes + noUncheckedIndexedAccess + noImplicitOverride → REQ-TEST-017
- [x] **T-TEST-006**: Configure no-explicit-any ESLint rule as error → REQ-TEST-018
- [x] **T-TEST-007**: Configure import-x/no-restricted-paths for domain boundary → REQ-TEST-004

## Phase 3: Unit Tests

- [x] **T-TEST-008**: Write unit tests for URL validation and normalization → REQ-TEST-007
- [x] **T-TEST-009**: Write unit tests for crawl pipeline stages → REQ-TEST-007
- [x] **T-TEST-010**: Write unit tests for error classification → REQ-TEST-007
- [x] **T-TEST-011**: Write unit tests for configuration parsing → REQ-TEST-007
- [x] **T-TEST-012**: Write unit tests for completion detection logic → REQ-TEST-007

## Phase 4: Integration Tests

- [x] **T-TEST-013**: Write integration tests for frontier (enqueue, dequeue, dedup) with real Redis → REQ-TEST-005, REQ-TEST-008
- [x] **T-TEST-014**: Write integration tests for worker job processing with real queue → REQ-TEST-008 — *covered by worker-bullmq.integration.test.ts + frontier-bullmq.integration.test.ts*
- [x] **T-TEST-015**: Write integration tests for graceful shutdown with real connections → REQ-TEST-008
- [ ] **T-TEST-016**: ~~Write integration tests for metrics endpoint scraping~~ → REQ-TEST-008 *(deferred: requires running service with Prometheus metrics endpoint)*

## Phase 5: CI Pipeline

- [x] **T-TEST-017**: Create GitHub Actions workflow with fail-fast chain → REQ-TEST-013, REQ-TEST-014
- [x] **T-TEST-018**: Configure service containers for Redis in CI → REQ-TEST-016
- [x] **T-TEST-019**: Add coverage threshold enforcement as CI gate → REQ-TEST-012
- [x] **T-TEST-020**: Add domain coverage threshold (90%) for domain packages → REQ-TEST-011

## Phase 6: Performance & Cleanup

- [x] **T-TEST-021**: Benchmark unit test suite completes in < 30s → REQ-TEST-019
- [x] **T-TEST-022**: Benchmark integration tests complete in < 120s → REQ-TEST-020
- [x] **T-TEST-023**: Establish performance baselines in CI (unit ≤30s, integration ≤120s, Testcontainer startup ≤15s) with 20% regression warning → REQ-TEST-023
- [x] **T-TEST-024**: Implement deterministic Testcontainer cleanup in `afterAll` with global orphan timeout → REQ-TEST-024

---

## Dependencies

| Task | Depends On | Blocks |
| --- | --- | --- |
| Phase 1 (infrastructure) | core-contracts (package setup) | Phases 3-6 |
| Phase 2 (type/lint) | core-contracts (tsconfig) | Phase 3 |
| Phase 3 (unit tests) | All domain feature implementations | Phase 5 |
| Phase 4 (integration) | url-frontier, worker-management, observability | Phase 5 |
| Phase 5 (CI pipeline) | Phases 3-4 | Phase 6 |
| Phase 6 (perf/cleanup) | Phases 3-4 | — |

---

> **Provenance**: Created 2026-03-25. Implementation Agent task decomposition per ADR-020. Updated 2026-03-25: added T-TEST-023–024 (REQ-TEST-023–024 baselines, cleanup). Updated 2026-03-26: checked completed tasks per G11 spec update gate.
