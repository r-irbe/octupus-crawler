# Worklog: CI/CD Pipeline — Release Pipeline

**Date**: 2026-03-30
**Branch**: `work/ci-cd-release-pipeline`
**Spec**: `docs/specs/ci-cd-pipeline/`

## What Changed

Created `.github/workflows/release.yml` — container build and publish pipeline:

- **T-CICD-012**: Push-to-main trigger with concurrency (no cancel-in-progress)
- **T-CICD-013**: Docker BuildKit + buildx + QEMU for amd64/arm64
- **T-CICD-014**: build-push-action with ghcr.io, SHA + latest tags, GHA layer cache
- **T-CICD-015**: Trivy image scan (OCI tar export) before push — blocks publish on HIGH/CRITICAL
- **T-CICD-016**: Matrix for api-gateway, worker-service, scheduler-service

## Files Created

| File | Lines | Purpose |
| --- | --- | --- |
| `.github/workflows/release.yml` | 95 | Release pipeline |

## Decisions

1. **Gate-before-publish** — build to OCI tar, Trivy scan, then push (scan-then-publish)
2. **`cancel-in-progress: false`** — release builds should complete, not be cancelled
3. **`fail-fast: false`** — each service scanned independently
4. **`cache-to: mode=max`** — cache all layers for subsequent builds

## RALPH Review

- **Result**: 6/6 APPROVE (100% consensus)
- **DE-1 (informational)**: Dockerfile needs `ARG TARGET_APP` when per-service apps exist
- **PE-2 (informational)**: QEMU arm64 emulation slow — future native runners

## Progress

CI/CD Pipeline: 15/26 tasks complete (58%)
