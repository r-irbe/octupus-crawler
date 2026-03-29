# API Contracts — Requirements

> EARS-format requirements for public API contract definitions (OpenAPI 3.1).
> Source: [ADR-011](../../adr/ADR-011-api-framework.md), [ADR-017](../../adr/ADR-017-service-communication.md) §3

---

## 1. Contract Definition

**REQ-API-001** (Ubiquitous)
The system shall provide an OpenAPI 3.1 specification file at `openapi.yaml` (repository root) that describes all public-facing HTTP endpoints.

**REQ-API-002** (Ubiquitous)
Each endpoint in the OpenAPI spec shall include request body schema, response schema for all status codes, and example values.

**REQ-API-003** (Ubiquitous)
The OpenAPI spec shall define the crawl management endpoints: create crawl session, get crawl status, list crawl sessions, and seed URLs.

**REQ-API-004** (Ubiquitous)
The OpenAPI spec shall define health endpoints: liveness (`/health/live`), readiness (`/health/ready`), and metrics (`/metrics`).

**REQ-API-005** (Ubiquitous)
All request/response schemas in the OpenAPI spec shall match the Zod schemas used in the Fastify route handlers (ADR-011).

## 2. Contract Validation

**REQ-API-006** (Event-driven)
When a PR modifies files under `apps/api-gateway/`, the CI pipeline shall run Spectral lint on the OpenAPI spec and fail on any `error`-severity finding.

**REQ-API-007** (Ubiquitous)
The OpenAPI spec shall pass Spectral's `oas` ruleset with zero errors.

**REQ-API-008** (State-driven)
While the OpenAPI spec exists, the Spectral check in `agent-pr-validation.yml` shall validate it as part of the `architecture-conformance` job.

## 3. Versioning

**REQ-API-009** (Ubiquitous)
The OpenAPI spec shall use URL versioning with `/api/v1/` prefix for all endpoints per ADR-017 §3.

**REQ-API-010** (Ubiquitous)
The OpenAPI spec shall include `info.version` matching the current API version.

### Acceptance Criteria

```gherkin
Feature: API Contract Validation

  Scenario: OpenAPI spec is valid
    Given the OpenAPI spec at docs/specs/api-contracts/openapi.yaml
    When Spectral lints the spec with the oas ruleset
    Then zero errors are reported

  Scenario: Spectral catches contract drift
    Given a modified OpenAPI spec with a missing response schema
    When Spectral lints the spec
    Then at least one error-severity finding is reported

  Scenario: All endpoints documented
    Given the OpenAPI spec
    Then it contains endpoints for POST /api/v1/crawls
    And it contains endpoints for GET /api/v1/crawls/{id}
    And it contains endpoints for POST /api/v1/seed
    And it contains endpoints for GET /health/live
    And it contains endpoints for GET /health/ready
```

## Traceability

| Requirement | ADR Source | Test Type |
| --- | --- | --- |
| REQ-API-001–005 | ADR-011 §Implementation, ADR-017 §3 | Spectral lint |
| REQ-API-006–008 | ADR-020 §Contract-first | CI integration |
| REQ-API-009–010 | ADR-017 §3 versioning | Spectral lint |

---

> **Provenance**: Created 2026-03-29. 10 EARS requirements. Unblocks T-AGENT-107.
