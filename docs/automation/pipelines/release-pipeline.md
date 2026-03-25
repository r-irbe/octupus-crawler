# Pipeline: Release

**ADRs**: [ADR-014](../../adr/ADR-014-automation-strategy.md), [ADR-012](../../adr/ADR-012-ci-cd-pipeline.md) | **Triggers**: `branch.merged`, `pr.approved`, `deploy.completed`

Automated path from merged code to verified deployment. Zero manual steps.

## Stages

1. **Build**: Turbo build → Docker multi-stage → version tag (SHA + timestamp)
2. **Test**: Full unit + integration suite (100% pass), container security scan (Trivy, no CRITICAL/HIGH), container startup health check, contract tests
3. **Push**: Push to ghcr.io with tag + latest, cosign image signing, syft SBOM generation
4. **Deploy** (GitOps per ADR-004): Update image tags in Kustomize overlays → commit → ArgoCD auto-sync → rolling update
5. **Verify** (5-min window): K8s readiness probes, health endpoint 200, smoke test (submit+verify crawl job), error rate ≤ baseline+1%, latency p99 ≤ baseline+20%, no crash loops

## Rollback Protocol

Deploy failure → revert Kustomize tag → commit rollback → ArgoCD syncs to previous → verify rollback health → create Debug Agent task → fire `task.failed` → notify user.

## Metrics

| Metric | Target |
| --- | --- |
| `release.build_time` | < 3 min |
| `release.total_time` | < 15 min (merge → verified) |
| `release.success_rate` | > 99% |
| `release.rollback_rate` | < 1% |
| `release.mttr` | < 10 min |

## Related

- [ADR-012](../../adr/ADR-012-ci-cd-pipeline.md), [ADR-004](../../adr/ADR-004-gitops-deployment.md)
- [Quality Gates](quality-gates.md), [Security Pipeline](security-pipeline.md)
