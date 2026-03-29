# Test Coverage Hardening — Requirements

> EARS-format requirements for closing testing gaps and enhancing verification pipeline.
> Source: [ADR-007](../../adr/ADR-007-testing-strategy.md), [ADR-018](../../adr/ADR-018-agentic-coding-conventions.md)

---

## 1. Pre-Commit Gate Enhancements

**REQ-TCH-001** (Ubiquitous)
The pre-commit gate script shall verify that no staged `.ts` file exceeds the 300-line hard limit.

**REQ-TCH-002** (Ubiquitous)
The pre-commit gate script shall verify that all staged test files follow the naming convention (`*.unit.test.ts`, `*.integration.test.ts`, `*.e2e.test.ts`, `*.property.test.ts`, `*.contract.test.ts`).

**REQ-TCH-003** (Ubiquitous)
The pre-commit gate script shall verify that no staged file contains `eslint-disable` without a justification comment on the same or preceding line.

## 2. Guard Chain Completeness

**REQ-TCH-004** (Ubiquitous)
The guard function chain shall run unit tests, integration tests, and property tests before a commit is allowed.

**REQ-TCH-005** (Event-driven)
When integration tests fail, the guard chain shall report which Testcontainer-backed test failed and the container logs.

## 3. Unit Test Coverage Gaps

**REQ-TCH-006** (Ubiquitous)
Every production source file in `packages/*/src/` that contains executable logic (functions, classes) shall have a co-located unit test file.

**REQ-TCH-007** (Ubiquitous)
The `createQueueError` factory in `packages/core` shall have unit tests verifying error construction and message formatting.

**REQ-TCH-008** (Ubiquitous)
The `brandNormalizedUrl` function in `packages/crawl-pipeline` shall have unit tests verifying brand type construction.

**REQ-TCH-009** (Ubiquitous)
The `exitCodeForReason` function in `packages/application-lifecycle` shall have unit tests covering all `ShutdownReason` variants.

**REQ-TCH-010** (Ubiquitous)
The `createPageTable` factory in `packages/virtual-memory` shall have unit tests for load, eviction, fault, and pin audit log entries.

**REQ-TCH-011** (Ubiquitous)
The `selectiveLoad` function in `packages/virtual-memory` shall have unit tests for full-file loading (≤200 lines) and section-based partial loading (>200 lines).

**REQ-TCH-012** (Ubiquitous)
The `stateTrackerPath` and `parseStateTracker` functions in `packages/virtual-memory` shall have unit tests for path generation and markdown parsing.

## 4. E2E Alerting Validation

**REQ-TCH-013** (Ubiquitous)
The E2E test suite shall include a test that verifies Prometheus alert rules evaluate correctly against real crawler metrics in a K8s cluster.

**REQ-TCH-014** (Event-driven)
When the crawl error rate exceeds 50%, the `HighErrorRate` alert rule shall evaluate as firing when checked against live Prometheus metrics.

**REQ-TCH-015** (Event-driven)
When no successful fetches occur for 5 minutes with a non-empty frontier, the `ZeroFetchRate` alert rule shall evaluate as firing.

**REQ-TCH-016** (Ubiquitous)
The E2E alert validation test shall use `promtool` or Prometheus API to evaluate alert rules against live metrics scraped from the crawler.

---

## Acceptance Criteria (Gherkin)

```gherkin
Feature: Pre-commit gate enhancements
  Scenario: File size gate blocks oversized files
    Given a staged .ts file with 310 lines
    When the pre-commit gate runs
    Then the commit is blocked with a file size warning

Feature: Guard chain completeness
  Scenario: All test types run before commit
    Given the guard chain is invoked
    When the chain completes
    Then unit, integration, and property tests have all executed

Feature: Unit test coverage
  Scenario: All production source files have tests
    Given a production .ts file in packages/*/src/
    When I search for a co-located test file
    Then a test file with matching name exists

Feature: E2E alerting validation
  Scenario: HighErrorRate alert fires on error spike
    Given the crawler is running in K8s with error rate > 50%
    When Prometheus evaluates the HighErrorRate rule
    Then the alert is in firing state
```

## Traceability

| Requirement | ADR | Task |
| --- | --- | --- |
| REQ-TCH-001 | ADR-018 §file-size | T-TCH-001 |
| REQ-TCH-002 | ADR-007 §naming | T-TCH-002 |
| REQ-TCH-003 | AGENTS.md §NEVER-6 | T-TCH-003 |
| REQ-TCH-004 | ADR-007 §pyramid | T-TCH-004 |
| REQ-TCH-005 | ADR-007 §testcontainers | T-TCH-005 |
| REQ-TCH-006–012 | ADR-007 §coverage | T-TCH-006–012 |
| REQ-TCH-013–016 | ADR-007 §e2e, alerting spec | T-TCH-013–016 |

---

> **Provenance**: Created 2026-03-29. Spec-writer Phase 2 per ADR-020.
