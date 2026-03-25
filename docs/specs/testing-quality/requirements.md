# Testing & Quality — Requirements

> EARS-format requirements for test structure, coverage, CI pipeline, type system, and test timeouts.
> Source: [REQUIREMENTS-AGNOSTIC.md](../../research/REQUIREMENTS-AGNOSTIC.md) §11

---

## 1. Test Structure

**REQ-TEST-001** (Ubiquitous)
The test suite shall be organized into five tiers: unit tests, integration tests, property-based tests, contract tests, and end-to-end tests.

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

**REQ-TEST-021** (Ubiquitous)
Property-based tests shall use fast-check to verify invariants for: URL normalization (idempotency, determinism), SSRF IP range checking (no false negatives for known private ranges), error classification (exhaustive variant coverage), and politeness delay (serialization guarantee).

**REQ-TEST-022** (Ubiquitous)
Contract tests shall use Pact to verify inter-service contracts: state-store API compatibility (Redis command set used by BullMQ), metrics endpoint format (Prometheus exposition), and health/readiness endpoint schemas.

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

Given a property-based test for URL normalization
When fast-check generates 1000 random URLs
Then normalize(normalize(url)) === normalize(url) for all inputs

Given a Pact contract test for the metrics endpoint
When the provider verification runs
Then the response matches the Prometheus exposition format
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

**REQ-TEST-023** (Ubiquitous)
Performance baselines shall be established and tracked in CI: unit test suite ≤30s, integration test suite ≤120s, Testcontainer startup ≤15s. Regressions exceeding 20% shall generate a CI warning.

**REQ-TEST-024** (Ubiquitous)
Testcontainer cleanup shall be deterministic: all started containers shall be stopped and removed in the `afterAll` hook, even if tests fail. A global timeout shall kill orphaned containers.

### Acceptance Criteria — Performance

```gherkin
Given the full unit test suite
When it runs
Then it completes in under 30 seconds

Given the full integration test suite
When it runs (including Testcontainer startup)
Then it completes in under 120 seconds

Given a CI run records unit test duration of 25s
When the next run takes 32s (28% regression)
Then a CI warning is generated because 28% exceeds the 20% threshold

Given an integration test starts a Testcontainer
When the test fails mid-execution
Then the afterAll hook stops and removes the container
And no orphaned containers remain
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
| REQ-TEST-021 | §11 (fast-check) | MUST | Property tests |
| REQ-TEST-022 | §11 (Pact) | MUST | Contract tests |
| REQ-TEST-023 | §11.6 (baseline) | MUST | CI timing |
| REQ-TEST-024 | §11 (cleanup) | MUST | Meta-test |

---

> **Provenance**: Created 2026-03-25 from REQUIREMENTS-AGNOSTIC.md §11. EARS conversion per ADR-020. Updated 2026-03-25: added REQ-TEST-021–024 (fast-check, Pact, baselines, cleanup) per PR Review Council findings and ADR-007 updates.
