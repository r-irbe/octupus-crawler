# Pipeline: Release

| Field | Value |
| --- | --- |
| **Status** | Active |
| **Created** | 2026-03-24 |
| **ADR** | [ADR-014](../../adr/ADR-014-automation-strategy.md), [ADR-012](../../adr/ADR-012-ci-cd-pipeline.md) |
| **Triggers** | `branch.merged`, `pr.approved`, `deploy.completed` |

## Overview

Automates the full path from merged code to running deployment with automated verification and rollback. Zero manual steps from merge to production.

## Pipeline Flow

```text
branch.merged (to main)
    │
    ▼
┌────────────────────────┐
│ 1. BUILD               │
│   • All packages       │
│   • Container images   │
│   • Version tagging    │
└──────────┬─────────────┘
           │
    ▼
┌────────────────────────┐
│ 2. TEST (Release)      │
│   • Full test suite    │
│   • Container scan     │
│   • Integration verify │
└──────────┬─────────────┘
           │ (all pass)
    ▼
┌────────────────────────┐
│ 3. PUSH                │
│   • Push to ghcr.io    │
│   • Sign images        │
│   • Generate SBOM      │
└──────────┬─────────────┘
           │
    ▼
┌────────────────────────┐
│ 4. DEPLOY              │
│   • Update Kustomize   │
│   • Commit tag update  │
│   • ArgoCD auto-sync   │
└──────────┬─────────────┘
           │
    ▼
┌────────────────────────┐
│ 5. VERIFY              │
│   • Health checks      │
│   • Smoke tests        │
│   • Metric baselines   │
│   • Error rate check   │
└──────────┬─────────────┘
           │
    ┌──────┴──────┐
    ▼             ▼
 SUCCESS       FAILURE
    │             │
    ▼             ▼
 Metrics     ROLLBACK
 Record      │
             ▼
          Notify + Investigate
```

## Stage Details

### Stage 1: Build

```text
For each service (scheduler, worker, api):
  1. Turbo build with full dependency graph
  2. Docker multi-stage build (ADR-001)
  3. Version tag: git SHA short (7 chars) + timestamp
  4. Build metadata: git commit, branch, build time, builder
```

### Stage 2: Release Tests

```text
Post-build verification:
  1. Unit tests (all packages) — must pass 100%
  2. Integration tests (all packages) — must pass 100%
  3. Container security scan (Trivy) — no CRITICAL/HIGH CVEs
  4. Container startup test — each container starts and responds to health check
  5. Contract tests — API schemas match expectations
```

### Stage 3: Push

```text
Container registry operations:
  1. Push tagged images to ghcr.io/<org>/<service>:<tag>
  2. Push tagged images to ghcr.io/<org>/<service>:latest
  3. Sign images with cosign
  4. Generate and attach SBOM (syft)
  5. Verify signatures after push
```

### Stage 4: Deploy

```text
GitOps deployment (per ADR-004):
  1. Update image tags in k8s/overlays/<env>/kustomization.yaml
  2. Commit with: "release: <service> <tag>"
  3. Push to deploy branch
  4. ArgoCD detects change and syncs automatically
  5. ArgoCD applies rolling update strategy
```

### Stage 5: Verify

```text
Post-deploy health verification (5-minute window):
  1. K8s readiness probes passing for all pods
  2. Health endpoint returns 200 OK
  3. Smoke test: submit test crawl job, verify completion
  4. Metric comparison:
     - Error rate ≤ baseline + 1%
     - Latency p99 ≤ baseline + 20%
     - No crash loops detected
  5. If all pass: deployment SUCCESS
  6. If any fail: trigger ROLLBACK
```

### Rollback Protocol

```text
On deploy failure:
  1. Revert Kustomize tag to previous version
  2. Commit with: "rollback: <service> <tag> → <prev-tag>"
  3. Push → ArgoCD syncs to previous version
  4. Verify rollback health (same checks)
  5. Create incident task:
     - Assign to Debug Agent
     - Include: failed verification details, metrics snapshot
  6. Fire task.failed event → Self-Improvement Loop
  7. Notify user
```

## Metrics Collected

| Metric | Target | Description |
| --- | --- | --- |
| `release.build_time` | < 3 min | Time to build all services |
| `release.test_time` | < 5 min | Release test suite duration |
| `release.deploy_time` | < 5 min | Tag update to pods running |
| `release.total_time` | < 15 min | End-to-end merge to verified |
| `release.success_rate` | > 99% | Deploys that pass verification |
| `release.rollback_rate` | < 1% | Deploys requiring rollback |
| `release.mttr` | < 10 min | Mean time to rollback |
| `release.frequency` | Tracked | Deploys per day/week |

## Related

- [ADR-012: CI/CD](../../adr/ADR-012-ci-cd-pipeline.md) — Pipeline architecture
- [ADR-004: GitOps](../../adr/ADR-004-gitops-deployment.md) — ArgoCD deployment
- [Quality Gates](quality-gates.md) — Pre-merge quality
- [Security Pipeline](security-pipeline.md) — Container scanning

---

> **Provenance**: Created 2026-03-24 as part of ADR-014 automation strategy. Defines the automated release pipeline from merge to verified deployment.
