# Worklog: Kustomize Image Tag Update

**Date**: 2026-03-31
**Branch**: `work/kustomize-image-tags`
**Commit**: `8a60643`
**Task**: T-CICD-019 (REQ-CICD-020)

## What Changed

Added `update-kustomize` job to the release pipeline that updates Kustomize base image tags after Docker images are published. ArgoCD auto-syncs on change.

### Files Modified

| File | Change |
| --- | --- |
| `.github/workflows/release.yml` | Added `update-kustomize` job with kustomize edit set image for all 3 services |
| `infra/k8s/base/kustomization.yml` | Added `images:` section with `unreleased` sentinel tags for 3 services |

## Decisions

- All 3 services updated (api-gateway, worker-service, scheduler-service) even though only worker-service has a K8s deployment — forward-looking
- `GITHUB_TOKEN` used (not PAT) to prevent infinite workflow loops
- `[skip ci]` in commit message as additional safety layer
- `git pull --rebase` before push to handle concurrent merge race condition
- `unreleased` sentinel tag instead of `latest` to make pre-first-release failures visible
- Bash-only variables in `run:` blocks for consistency (no mixed `${{ }}` expressions)

## RALPH Review Findings

| ID | Severity | Finding | Resolution |
| --- | --- | --- | --- |
| F-001 | Critical | CI pushes to main without safeguards | Added `[skip ci]`, safety comment, GITHUB_TOKEN (not PAT) |
| F-002 | Major | No image digest verification | Full SHA in commit body; digest pinning deferred |
| F-003 | Critical | Only worker-service updated (3 built) | All 3 services now updated |
| F-004 | Major | Literal `OWNER` placeholder in base | Removed; CI sets newName via kustomize edit |
| F-005 | Major | SHA variable source inconsistency | Single source: `GITHUB_SHA` bash var throughout |
| F-006 | Major | Race condition on concurrent merges | `git pull --rebase origin main` before push |
| F-008 | Minor | `latest` default tag | Changed to `unreleased` sentinel |
| F-010 | Minor | Mixed expression/bash variable patterns | Bash vars only in run blocks |

## Deferred

- Image digest pinning (`@sha256:`) — requires passing digests between matrix jobs
- Separate deploy branch for ArgoCD (long-term architectural improvement)

---

> **Provenance**: Created 2026-03-31. T-CICD-019 complete.
