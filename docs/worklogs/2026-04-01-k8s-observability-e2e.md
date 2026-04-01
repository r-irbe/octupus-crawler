# Worklog — K8s Observability Parity + E2E Test Suite

**Date**: 2026-04-01
**Branch**: `work/k8s-observability-e2e`
**Scope**: K8s monitoring stack parity with docker-compose + comprehensive E2E test script

## What Changed

### New Files (12)

- `infra/k8s/monitoring/prometheus.yml` — Prometheus Deployment with k8s pod discovery RBAC, alert rules, ServiceAccount
- `infra/k8s/monitoring/jaeger.yml` — Jaeger all-in-one with OTLP gRPC/HTTP
- `infra/k8s/monitoring/loki.yml` — Loki log aggregation
- `infra/k8s/monitoring/promtail.yml` — DaemonSet with k8s service discovery, Pino JSON pipeline
- `infra/k8s/monitoring/grafana.yml` — Grafana with provisioned datasources + dashboard provider
- `infra/k8s/monitoring/kustomization.yml` — Monitoring stack kustomization
- `infra/k8s/overlays/e2e/mega-simulator.yml` — Mega simulator k8s Deployment + Service
- `scripts/run-k8s-e2e-test.sh` — Main E2E test (simulator + monitoring + chaos delegation)
- `scripts/run-k8s-chaos-e2e.sh` — Chaos + scaling tests
- `scripts/lib/e2e-helpers.sh` — Shared assertion functions
- `scripts/create-dashboard-configmap.sh` — Creates dashboard ConfigMap from JSON files

### Modified Files (7)

- `infra/k8s/base/crawler-configmap.yml` — OTEL endpoint → in-cluster Jaeger
- `infra/k8s/overlays/dev/kustomization.yml` — Include monitoring
- `infra/k8s/overlays/e2e/kustomization.yml` — Include monitoring + mega-simulator + HPA
- `infra/k8s/overlays/e2e/network-partition-policy.yaml` — Allow mega-simulator egress
- `scripts/setup-local.sh` — Image build, dashboard ConfigMap, monitoring deploy
- `README.md` — Updated k8s section with monitoring parity
- `docs/LOAD-TESTING.md` — Updated k8s guide with E2E script

## Decisions

1. **Kustomize over Helm** for monitoring stack — consistent with existing infra pattern
2. **DaemonSet for Promtail** — standard k8s log collection pattern vs Docker socket approach
3. **Dashboard ConfigMap via script** — kustomize security prevents cross-directory file references
4. **Mega-simulator in e2e only** — RALPH F-003: test fixtures shouldn't pollute dev overlay
5. **Cross-platform millis** — RALPH F-001: `perl -MTime::HiRes` as primary, python3 and seconds fallbacks

## RALPH Review Findings

| # | Severity | Finding | Resolution |
| --- | --- | --- | --- |
| F-001 | Major | `date +%s%N` crashes on macOS | `millis_now()` with perl/python3/seconds fallbacks |
| F-002 | Minor | Malformed Prometheus relabel rule | Removed redundant rule |
| F-003 | Major | Mega-simulator in monitoring (deployed to dev) | Moved to e2e overlay |
| F-004 | Major | Scaling tests assume crawler-worker deployed | Pre-condition check + SKIP |
| F-008 | Major | Network partition blocks mega-simulator | Added egress rule for mega-simulator |

**Verdict**: APPROVED after re-review (all 4 Major + 1 Minor resolved)

## Learnings

- Kustomize `configMapGenerator` cannot reference files outside its root directory (security restriction)
- `jaegertracing/all-in-one:2.6.0` uses env var from v1 (`COLLECTOR_OTLP_ENABLED`) but it's harmless
- macOS `date` does not support `%N` (nanoseconds) — always use cross-platform alternatives
