# Worklog: Critical Specs — Data Layer & CI/CD Pipeline

| Field | Value |
| --- | --- |
| Date | 2026-03-29 |
| Branch | `work/critical-specs` |
| Commit | `5b2834c` |
| Scope | `docs/specs/data-layer/`, `docs/specs/ci-cd-pipeline/`, `docs/specs/index.md` |

## Summary

Created two critical feature specifications identified through ADR gap analysis. All 18 existing specs were at 100% completion — these are new specs for previously unspecced ADR mandates.

## Changes

### Files Created

- `docs/specs/data-layer/requirements.md` — 27 EARS requirements (REQ-DATA-001 to 027)
- `docs/specs/data-layer/design.md` — Architecture, Prisma/Drizzle schema, repository pattern, S3 layout
- `docs/specs/data-layer/tasks.md` — 36 tasks across 7 phases (0% complete)
- `docs/specs/ci-cd-pipeline/requirements.md` — 23 EARS requirements (REQ-CICD-001 to 023)
- `docs/specs/ci-cd-pipeline/design.md` — Pipeline diagrams, workflow YAML, security gates
- `docs/specs/ci-cd-pipeline/tasks.md` — 26 tasks across 6 phases (0% complete)

### Files Modified

- `docs/specs/index.md` — Added 2 new specs, updated requirement count (392 → 442)

## Gap Analysis Results

- Audited all 22 ADRs against 18 existing specs
- Found 6 critical/important gaps; selected top 2 for immediate speccing
- Remaining gaps: service-communication (ADR-017), resilience-patterns (ADR-009), IaC (ADR-003), GitOps (ADR-004)

## RALPH Review Findings

- **AR-1 (Minor, SUSTAINED)**: Missing Redis cache dependency note in data-layer design → added "Dependencies & Out-of-Scope" section
- **S-1 (Minor, SUSTAINED)**: Missing OIDC auth note in CI/CD design → added "Security Notes" section
- All other findings rejected (informational or acceptable scope)

## Decisions

| # | Decision | Rationale |
| --- | --- | --- |
| D-1 | Spec data-layer and CI/CD first | Most critical blockers per ADR gap analysis |
| D-2 | Redis cache out-of-scope | Separate concern; repository accepts cache param but spec covers PG+S3 only |
| D-3 | OIDC as design note not requirement | Implementation detail of workflow auth, not a functional requirement |
