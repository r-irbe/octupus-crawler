# API Contracts — Tasks

> Implementation tasks for REQ-API-001 through REQ-API-010.
> Traces to: [requirements.md](requirements.md) | [design.md](design.md)

---

## Phase 1: Contract Definition

- [x] **T-API-001** — Create `docs/specs/api-contracts/openapi.yaml` with OpenAPI 3.1 spec for all endpoints (crawls, seed, health, metrics)
  - Validates: REQ-API-001, REQ-API-002, REQ-API-003, REQ-API-004
  - Acceptance: `npx @stoplight/spectral-cli lint openapi.yaml` exits 0

- [x] **T-API-002** — Define CrawlRequest, CrawlSession, SeedRequest, HealthStatus schemas matching Zod definitions from ADR-011
  - Validates: REQ-API-005
  - Acceptance: Schema properties match Zod schemas in `packages/validation/`

## Phase 2: Validation Setup

- [x] **T-API-003** — Create `.spectral.yml` with `spectral:oas` extended ruleset
  - Validates: REQ-API-007
  - Acceptance: Spectral uses oas ruleset by default

- [x] **T-API-004** — Verify `architecture-conformance` CI job lints `openapi.yaml` via Spectral
  - Validates: REQ-API-006, REQ-API-008
  - Acceptance: CI job finds and lints the spec file

## Phase 3: Versioning

- [x] **T-API-005** — Ensure all paths use `/api/v1/` prefix in spec
  - Validates: REQ-API-009
  - Acceptance: All paths start with `/api/v1/`

- [x] **T-API-006** — Set `info.version` in spec to `1.0.0`
  - Validates: REQ-API-010
  - Acceptance: `info.version` field present and follows semver

---

## Provenance

| Field | Value |
| --- | --- |
| Created | 2026-03-29 |
| Total tasks | 6 |
| Completed | 6 / 6 (100%) |
| ADR refs | ADR-011, ADR-017, ADR-020 |

> All tasks completed in `work/deferred-unblock-final-2` branch.
