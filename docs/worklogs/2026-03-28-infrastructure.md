# Worklog — Infrastructure Configuration

| Field | Value |
| --- | --- |
| Date | 2026-03-28 |
| Branch | `work/infrastructure` |
| Commits | 16d66c9, 548fe46, aff84da, e55e634 |
| Spec | `docs/specs/infrastructure/` (21 reqs, 26 tasks) |

## What Changed

### Container (infra/docker/)
- Multi-stage Dockerfile: node:22-slim, pnpm 10.33.0, turbo build, non-root user
- `.dockerignore`: excludes node_modules, dist, docs, .git, test files, infra
- `docker-compose.dev.yml`: 4 services (crawler, Dragonfly v1.37.2, Prometheus v2.50, Grafana v10)

### Kubernetes (infra/k8s/)
- Base: Namespace, Deployment (2 replicas, probes, resources), ConfigMap, Secrets, Dragonfly StatefulSet (5Gi PVC)
- Overlays: dev (1 replica), staging (2), prod (4 replicas, higher resources)
- Kustomize uses `labels:` (not deprecated `commonLabels`)

### Monitoring (infra/monitoring/)
- Prometheus scrape config (compose dev only, K8s uses annotation-based SD)
- Grafana dashboard: 8 panels (fetch rate, error rate, stalled jobs, latency P50/P95/P99, frontier, discovery, utilization, restarts)
- Dashboard provisioning + datasource config

### Documentation (docs/runbooks/)
- 9 SRE runbooks: high-error-rate, zero-fetch-rate, stalled-jobs, high-latency, frontier-capacity, worker-utilization, worker-down, coordinator-restart, zero-discovery
- Environment variable reference table
- Runbook index

### Alert fixes (infra/prometheus/)
- Aligned 4 runbook_url annotations to match doc filenames
- Updated promtool test expectations

## Decisions

| # | Decision | Rationale |
| --- | --- | --- |
| 1 | `--ignore-scripts` in Dockerfile pnpm install | `prepare` script runs setup-hooks.sh not in Docker context |
| 2 | REDIS_URL not STATE_STORE_URL | Matches config-schema.ts; updated specs (living spec) |
| 3 | Pin Dragonfly to v1.37.2 | RALPH F-007: `:latest` tag is mutable, production risk |
| 4 | EXPOSE both 8081 and 9090 | RALPH F-004: app has two HTTP servers (metrics + readiness) |

## RALPH Review

8 sustained findings (2 Major, 6 Minor), all resolved in commit e55e634.

## Deferred

- F-003: Production image includes source .ts files (~377MB). Future optimization.
- F-013: Alert runbook_url anchors point to wiki, docs live in repo. URLs need updating when wiki is set up.
- F-015: design.md §1 Dockerfile pseudocode is simplified vs actual. Future spec update.

## Learnings

- Dockerfile `pnpm install` triggers `prepare` scripts even with `--frozen-lockfile` — always use `--ignore-scripts` in Docker builds
- Kustomize `commonLabels` is deprecated, use `labels:` with `pairs:` instead
- Promtool test expectations must match annotations exactly (including runbook_url)
