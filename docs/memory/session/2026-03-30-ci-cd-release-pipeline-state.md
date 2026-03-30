# Implementation State Tracker — CI/CD Release Pipeline

## Session Identity

| Field | Value |
| --- | --- |
| Date | 2026-03-30 |
| Branch | `work/ci-cd-release-pipeline` |
| User request | Create release workflow for container builds on merge to main |
| Scope | `.github/workflows/release.yml` (new), `docs/specs/ci-cd-pipeline/tasks.md` |

## Applicable ADRs

- ADR-012: CI/CD pipeline — container builds, ghcr.io, multi-arch, Trivy image scan
- ADR-004: GitOps deployment — ArgoCD, Kustomize

## Task Queue

| # | Task | Status | Commit | Notes |
| --- | --- | --- | --- | --- |
| 1 | T-CICD-012: Create release.yml | `in-progress` | — | — |
| 2 | T-CICD-013: Docker BuildKit + buildx | `in-progress` | — | — |
| 3 | T-CICD-014: build-push-action + SHA tags | `in-progress` | — | — |
| 4 | T-CICD-015: Trivy image scan before publish | `in-progress` | — | — |
| 5 | T-CICD-016: Build matrix for 3 services | `in-progress` | — | — |

## Current State

| Field | Value |
| --- | --- |
| Current task # | 1-5 (single file) |
| Last completed gate | G4 |
| Guard function status | `not-run` |
| Commits on branch | 0 |
| Tests passing | 1080 (baseline) |
| Blockers | none |

## Decisions Log

| # | Decision | Rationale |
| --- | --- | --- |
| 1 | Shared Dockerfile with matrix | Single Dockerfile at infra/docker/Dockerfile, matrix for service names |
| 2 | Trivy scan before push | REQ-CICD-013 requires zero HIGH/CRITICAL CVEs in published images |
| 3 | OIDC for ghcr.io auth | Design doc recommends OIDC tokens over long-lived credentials |
