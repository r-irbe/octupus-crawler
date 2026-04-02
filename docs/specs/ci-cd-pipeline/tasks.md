# CI/CD Pipeline — Tasks

> Implementation tasks traceable to [requirements.md](requirements.md). Dependency-ordered.
> Design: [design.md](design.md) | ADR: [ADR-012](../../adr/ADR-012-ci-cd-pipeline.md)

---

## Phase 1: PR Pipeline

- [x] **T-CICD-001**: Create `.github/workflows/ci.yml` with pull_request trigger on main → REQ-CICD-002
- [x] **T-CICD-002**: Add `dorny/paths-filter` job to detect changed packages → REQ-CICD-004
- [x] **T-CICD-003**: Add guard-functions job: pnpm install --frozen-lockfile, turbo typecheck lint test → REQ-CICD-005, REQ-CICD-007
- [x] **T-CICD-004**: Configure Turborepo remote cache for CI → REQ-CICD-006
- [x] **T-CICD-005**: Add matrix test job: only test affected packages from paths-filter → REQ-CICD-004
- [x] **T-CICD-006**: Verify PR pipeline completes < 5 min for incremental changes → REQ-CICD-003 — *verified: ~3 min (PR #1, run 23891819260)*

## Phase 2: Security Scanning

- [x] **T-CICD-007**: Create `.github/workflows/security.yml` or add security jobs to ci.yml → REQ-CICD-010
- [x] **T-CICD-008**: Add `pnpm audit --audit-level=high` step (blocking) → REQ-CICD-010
- [x] **T-CICD-009**: Add Trivy filesystem scan (CRITICAL, HIGH, exit-code 1) → REQ-CICD-011
- [x] **T-CICD-010**: Add gitleaks-action for secret detection → REQ-CICD-012
- [x] **T-CICD-011**: Add Spectral lint step for OpenAPI specs → REQ-CICD-021

## Phase 3: Container Builds

- [x] **T-CICD-012**: Create `.github/workflows/release.yml` with push-to-main trigger → REQ-CICD-014
- [x] **T-CICD-013**: Add Docker BuildKit + buildx setup for multi-arch builds → REQ-CICD-015, REQ-CICD-017
- [x] **T-CICD-014**: Add build-push-action with ghcr.io registry and SHA tagging → REQ-CICD-016
- [x] **T-CICD-015**: Add Trivy image scan before publish (blocking) → REQ-CICD-013
- [x] **T-CICD-016**: Build matrix for api-gateway, worker-service, scheduler-service → REQ-CICD-014

## Phase 4: Release & Versioning

- [x] **T-CICD-017**: Configure Changesets with `@changesets/cli` → REQ-CICD-018
- [x] **T-CICD-018**: Add Changesets GitHub Action for "Version Packages" PR automation → REQ-CICD-019
- [x] **T-CICD-019**: Add Kustomize image tag update step in release workflow → REQ-CICD-020
- [ ] **T-CICD-020**: Verify ArgoCD auto-sync within 1 min of tag update → REQ-CICD-020 — *deferred: requires running ArgoCD cluster*

## Phase 5: Architecture Conformance

- [x] **T-CICD-021**: Add architecture conformance CI job: barrel import check, circular deps, file size → REQ-CICD-022
- [x] **T-CICD-022**: Add ADR compliance scan as advisory (non-blocking) check → REQ-CICD-023
- [x] **T-CICD-023**: Integrate existing agent-pr-validation.yml and quality-gate.yml into unified pipeline → REQ-CICD-009

## Phase 6: Validation

- [x] **T-CICD-024**: End-to-end: open PR, verify all CI jobs run and pass → REQ-CICD-002 — *verified: PR #1-#5, all 4 workflows (CI, Security, CI Quality, K8s E2E) pass*
- [x] **T-CICD-025**: End-to-end: merge PR, verify release pipeline builds + pushes images → REQ-CICD-014 — *verified: Release + Version Packages pass on merge (run 23914894309), 3 services + kustomize update*
- [ ] **T-CICD-026**: Verify Turborepo cache hit rate > 80% on incremental PR → REQ-CICD-006 — *deferred: requires TURBO_TOKEN secret for remote cache*

## MVP Critical Path

T-CICD-001 → T-CICD-003 → T-CICD-007 → T-CICD-008 → T-CICD-012 → T-CICD-014

## Completion Summary

| Metric | Count |
| --- | --- |
| Total tasks | 26 |
| Completed | 24 |
| Remaining | 2 (deferred) |
| Completion rate | 92% |

---

> **Provenance**: Created 2026-03-29 per ADR-020 Spec-Driven Development. Source: ADR-012.
