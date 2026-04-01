# Worklog: K8s Security Contexts

**Date**: 2026-04-01
**Branch**: `work/k8s-security-contexts`
**Commits**: `69597b6`, `2d8208b`

## Summary

Added pod-level and container-level security contexts to all 11 K8s workloads. This was flagged as a critical gap during the architectural review (2026-03-31).

## Changes

### Files Modified (11 manifests + 1 state tracker)

| File | Change |
| --- | --- |
| `infra/k8s/base/crawler-deployment.yml` | Pod: runAsNonRoot, uid 1000, fsGroup 2000, RuntimeDefault. Container: no escalation, readOnlyRootFilesystem, drop ALL |
| `infra/k8s/base/dragonfly-statefulset.yml` | Pod: runAsNonRoot, uid 999, fsGroup 999. Container: no escalation, drop ALL |
| `infra/k8s/base/minio-statefulset.yml` | Pod: runAsNonRoot, uid 1000, fsGroup 1000. Container: no escalation, drop ALL |
| `infra/k8s/base/postgresql-statefulset.yml` | Pod: runAsNonRoot, uid 999, fsGroup 999. Container: no escalation, drop ALL |
| `infra/k8s/monitoring/prometheus.yml` | Pod: runAsNonRoot, uid 65534 (nobody). Container: readOnlyRootFilesystem, drop ALL |
| `infra/k8s/monitoring/jaeger.yml` | Pod: runAsNonRoot, uid 10001. Container: readOnlyRootFilesystem, drop ALL |
| `infra/k8s/monitoring/loki.yml` | Pod: runAsNonRoot, uid 10001. Container: readOnlyRootFilesystem, drop ALL |
| `infra/k8s/monitoring/grafana.yml` | Pod: runAsNonRoot, uid 472. Container: readOnlyRootFilesystem, drop ALL |
| `infra/k8s/monitoring/promtail.yml` | Pod: fsGroup 0 (root for host log access). Container: uid 0, readOnlyRootFilesystem, drop ALL + DAC_READ_SEARCH |
| `infra/k8s/overlays/e2e/web-simulator.yml` | Pod: runAsNonRoot, uid 1000. Container: readOnlyRootFilesystem, drop ALL |
| `infra/k8s/overlays/e2e/mega-simulator.yml` | Pod: runAsNonRoot, uid 1000. Container: readOnlyRootFilesystem, drop ALL |

### Security Pattern Applied

- **Pod-level**: `runAsNonRoot`, `runAsUser`, `fsGroup`, `seccompProfile: RuntimeDefault`
- **Container-level**: `allowPrivilegeEscalation: false`, `readOnlyRootFilesystem: true` (where applicable), `capabilities: drop: ["ALL"]`

### Design Decisions

1. **Stateful services without readOnlyRootFilesystem**: PostgreSQL, Dragonfly, MinIO omit `readOnlyRootFilesystem` because they write to paths beyond volume mounts (PID files, temp dirs)
2. **Promtail as root**: DaemonSet requires host `/var/log` access — minimized to `DAC_READ_SEARCH` capability only
3. **Service-specific UIDs**: postgresql=999, dragonfly=999, prometheus=65534 (nobody), grafana=472 — matching official image defaults

## RALPH Review

- **Result**: 6/6 APPROVE
- S-001 (informational): stateful services missing `readOnlyRootFilesystem` — justified
- S-002 (fixed): state tracker updated
- S-003 (withdrawn): promtail `runAsNonRoot` omission clearer than explicit `false`

## Validation

- Kustomize build: both `dev` and `e2e` overlays build successfully
- Guards: 18/18 pass (no TS code changed)
