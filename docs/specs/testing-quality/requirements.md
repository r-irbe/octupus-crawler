# Testing & Quality — Requirements

> EARS-format requirements for test structure, coverage, CI pipeline, type system, and test timeouts.
> Source: [REQUIREMENTS-AGNOSTIC.md](../../research/REQUIREMENTS-AGNOSTIC.md) §11

---

## 1. Test Structure

**REQ-TEST-001** (Ubiquitous)
The test suite shall be organized into three tiers: unit tests, integration tests, and end-to-end tests.

**REQ-TEST-002** (Ubiquitous)
Unit tests shall use Vitest as the test runner.

**REQ-TEST-003** (Ubiquitous)
Tests shall be co-located with the source files they test (`.test.ts` suffix in the same directory).

**REQ-TEST-004** (Ubiquitous)
Unit tests shall not import infrastructure modules (Redis, I/O, network) directly.

**REQ-TEST-005** (Ubiquitous)
Integration tests shall use Testcontainers for real infrastructure (Redis, PostgreSQL, S3).

**REQ-TEST-006** (Ubiquitous)
Integration tests shall never mock infrastructure clients.

**REQ-TEST-007** (Ubiquitous)
Unit tests shall cover all domain logic: URL validation, normalization, crawl pipeline stages, error classification, completion detection, and configuration parsing.

**REQ-TEST-008** (Ubiquitous)
Integration tests shall cover: frontier operations (enqueue, dequeue, dedup), worker job processing with a real Redis queue, graceful shutdown with real connections, and metrics endpoint scrapeability.

### Acceptance Criteria — Test Structure

```gherkin
Given a domain module "url-validator.ts"
When tests are created
Then "url-validator.test.ts" exists in the same directory
And it imports only from domain/application layers, not infrastructure

Given an integration test for frontier
When the test runs
Then a real Redis container is started via Testcontainers
And no redis mock is used
```

## 2. Coverage Thresholds

**REQ-TEST-009** (Ubiquitous)
Line coverage shall be at least 80% overall.

**REQ-TEST-010** (Ubiquitous)
Branch coverage shall be at least 75% overall.

**REQ-TEST-011** (Ubiquitous)
Domain layer code (pure functions, value objects) shall have at least 90% line coverage.

**REQ-TEST-012** (Ubiquitous)
Coverage thresholds shall be enforced in CI — a PR that drops coverage below thresholds shall fail the pipeline.

### Acceptance Criteria — Coverage

```gherkin
Given a PR that drops line coverage from 85% to 78%
When CI runs
Then the coverage check fails
And the PR is blocked from merging
```

## 3. CI Pipeline Integration

**REQ-TEST-013** (Ubiquitous)
The CI pipeline shall run: typecheck → lint → unit tests → integration tests, in that order.

**REQ-TEST-014** (Ubiquitous)
CI shall fail fast: if typecheck fails, subsequent stages are skipped.

**REQ-TEST-015** (Ubiquitous)
Test results shall be reported in a machine-readable format (JUnit XML or similar).

**REQ-TEST-016** (Ubiquitous)
Integration tests in CI shall use service containers (GitHub Actions services or Testcontainers).

### Acceptance Criteria — CI

```gherkin
Given a PR with a type error
When CI runs
Then typecheck fails
And lint and test stages are skipped (fail-fast)
```

## 4. Type System

**REQ-TEST-017** (Ubiquitous)
TypeScript strict mode shall be enforced: `strict: true`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `noImplicitOverride`.

**REQ-TEST-018** (Ubiquitous)
The `no-explicit-any` ESLint rule shall be configured as an error.

### Acceptance Criteria — Type System

```gherkin
Given a source file using "any" as a type
When the linter runs
Then an error is reported for no-explicit-any
```

## 5. Test Timeouts & Performance

**REQ-TEST-019** (Ubiquitous)
Unit tests shall complete within 30 seconds total.

**REQ-TEST-020** (Ubiquitous)
Integration tests shall complete within 120 seconds total (including container startup).

### Acceptance Criteria — Performance

```gherkin
Given the full unit test suite
When it runs
Then it completes in under 30 seconds

Given the full integration test suite
When it runs (including Testcontainer startup)
Then it completes in under 120 seconds
```

---

## Traceability Matrix

| Requirement | Source | Priority | Test Type |
| --- | --- | --- | --- |
| REQ-TEST-001 | §11.1 | MUST | Structure review |
| REQ-TEST-002 | §11.1 | MUST | Config review |
| REQ-TEST-003 | §11.1 | MUST | Lint / structure |
| REQ-TEST-004 | §11.1 | MUST | Static analysis |
| REQ-TEST-005 | §11.2 | MUST | Meta-test |
| REQ-TEST-006 | §11.2 | MUST | Static analysis |
| REQ-TEST-007 | §11.1 | MUST | Coverage report |
| REQ-TEST-008 | §11.2 | MUST | Coverage report |
| REQ-TEST-009 | §11.3 | MUST | CI gate |
| REQ-TEST-010 | §11.3 | MUST | CI gate |
| REQ-TEST-011 | §11.3 | MUST | CI gate |
| REQ-TEST-012 | §11.3 | MUST | CI pipeline |
| REQ-TEST-013 | §11.4 | MUST | CI pipeline |
| REQ-TEST-014 | §11.4 | MUST | CI pipeline |
| REQ-TEST-015 | §11.4 | SHOULD | CI pipeline |
| REQ-TEST-016 | §11.4 | MUST | CI pipeline |
| REQ-TEST-017 | §11.5 | MUST | Config review |
| REQ-TEST-018 | §11.5 | MUST | Config review |
| REQ-TEST-019 | §11.6 | SHOULD | CI timing |
| REQ-TEST-020 | §11.6 | SHOULD | CI timing |

---

> **Provenance**: Created 2026-03-25 from REQUIREMENTS-AGNOSTIC.md §11. EARS conversion per ADR-020.
