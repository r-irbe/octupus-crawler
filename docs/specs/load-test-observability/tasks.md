# Load Test + Observability Suite — Tasks

> Implementation tasks traceable to REQ-LTO requirements.
> Dependency order: Phase 1 → 2 → 3 → 4 → 5 → 6

## Phase 1: Loki + Centralized Logging

### T-LTO-001: Add Loki to docker-compose

- [x] Add `loki` service (grafana/loki:3.0, port 3100)
- [x] Add `promtail` service (grafana/promtail:3.0, Docker socket mount)
- [x] Add Promtail config (`infra/monitoring/promtail-config.yml`)
- [x] Add Loki datasource to Grafana provisioning with trace correlation
- Validates: REQ-LTO-008, REQ-LTO-009, REQ-LTO-010, REQ-LTO-012

### T-LTO-002: Log Explorer Dashboard

- [x] Create `infra/monitoring/dashboards/log-explorer.json`
- [x] Panels: log volume by level, error rate, top error messages, per-domain logs
- [x] Template variables: `level`, `service`, `domain`
- Validates: REQ-LTO-011, REQ-LTO-019

## Phase 2: Grafana Dashboard Suite

### T-LTO-003: Scenario Timeline Dashboard

- [x] Create `infra/monitoring/dashboards/scenario-timeline.json`
- [x] Annotation queries for: test start/end, chaos events, SLO violations, ArgoCD syncs
- [x] Panels: timeline, SLO gauges, active scenario status
- Validates: REQ-LTO-013, REQ-LTO-019

### T-LTO-004: Chaos Events Dashboard

- [x] Create `infra/monitoring/dashboards/chaos-events.json`
- [x] Panels: active experiments, affected pods, MTTR gauge, recovery timeline
- Validates: REQ-LTO-014, REQ-LTO-019

### T-LTO-005: Infrastructure Health Dashboard

- [x] Create `infra/monitoring/dashboards/infrastructure-health.json`
- [x] Panels: CPU/memory heatmaps, Redis connections, PostgreSQL pool, MinIO storage, network I/O
- [x] Include ArgoCD sync status panel (REQ-LTO-023)
- Validates: REQ-LTO-015, REQ-LTO-019, REQ-LTO-023

### T-LTO-006: Alert Status Dashboard

- [x] Create `infra/monitoring/dashboards/alert-status.json`
- [x] Panels: alert state table, firing history, rule evaluation timeline
- Validates: REQ-LTO-016, REQ-LTO-019

### T-LTO-007: Trace Analytics Dashboard

- [x] Create `infra/monitoring/dashboards/trace-analytics.json`
- [x] Panels: latency heatmap, error rate by operation, service graph, slowest traces
- [x] Exemplar links: metric → trace drill-down (REQ-LTO-018)
- Validates: REQ-LTO-017, REQ-LTO-018, REQ-LTO-019

## Phase 3: Mega Simulator

### T-LTO-008: Domain Generator Module

- [x] Create `packages/testing/src/simulators/mega-simulator-config.ts`
- [x] `MegaSimulatorConfig` type with all REQ-LTO-001..003 parameters
- [x] Deterministic domain/page generation with seeded PRNG
- Validates: REQ-LTO-001, REQ-LTO-004

### T-LTO-009: Mega Simulator HTTP Server

- [x] Create `packages/testing/src/simulators/mega-simulator.ts`
- [x] Route: `/domain-{id}/page-{num}` → HTML with links
- [x] Route: `/domain-{id}/robots.txt` → per-domain robots
- [x] Cross-domain links (REQ-LTO-002)
- [x] Chaos scenario injection per domain (REQ-LTO-003)
- [x] Content fingerprints (REQ-LTO-004)
- [x] Disallowed paths in robots.txt (REQ-LTO-005)
- Validates: REQ-LTO-001..005

### T-LTO-010: Simulator Metrics

- [x] Add Prometheus metrics endpoint to mega simulator
- [x] Metrics: requests_total, response_duration, active_domains, pages_served
- Validates: REQ-LTO-006

### T-LTO-011: Simulator Entrypoint + Dockerfile

- [x] Create `mega-simulator-entrypoint.ts` for Docker
- [x] Create `Dockerfile.mega-simulator`
- [x] K8s Deployment + Service for multi-replica (REQ-LTO-007)
- Validates: REQ-LTO-007

## Phase 4: ArgoCD Integration

### T-LTO-012: ArgoCD Installation in setup-local.sh

- [x] Add ArgoCD namespace + manifest install to `scripts/setup-local.sh`
- [x] Wait for ArgoCD server readiness
- [x] Create ArgoCD Application CRD (`infra/k8s/argocd/ipf-application.yml`)
- Validates: REQ-LTO-020

### T-LTO-013: ArgoCD Grafana Integration

- [x] Add ArgoCD metrics scraping to Prometheus config
- [x] Add ArgoCD sync annotations to Grafana
- [x] ArgoCD panels in infrastructure dashboard
- Validates: REQ-LTO-021, REQ-LTO-023

## Phase 5: Chaos Mesh Integration

### T-LTO-014: Chaos Mesh Installation

- [x] Add Chaos Mesh Helm install to `scripts/setup-local.sh`
- [x] Configure for k3d containerd socket
- Validates: REQ-LTO-024

### T-LTO-015: Chaos Experiment CRDs

- [x] Create `infra/k8s/chaos/pod-kill.yml` (REQ-LTO-025)
- [x] Create `infra/k8s/chaos/network-delay.yml` (REQ-LTO-026)
- [x] Create `infra/k8s/chaos/network-partition.yml` (REQ-LTO-026)
- [x] Create `infra/k8s/chaos/stress-cpu.yml` (REQ-LTO-027)
- [x] Create `infra/k8s/chaos/dns-failure.yml` (REQ-LTO-028)
- Validates: REQ-LTO-025..028

### T-LTO-016: Chaos Metrics + Annotations

- [x] Scrape Chaos Mesh metrics in Prometheus
- [x] Create Grafana annotation queries for chaos events
- Validates: REQ-LTO-029

## Phase 6: Load Test Scenarios

### T-LTO-017: Mega Crawl k6 Script

- [x] Create `packages/testing/src/load/mega-crawl.k6.js`
- [x] 500 URL/s sustained for 30 min against mega simulator
- [x] SLO thresholds: p95 <5s, error <5%
- Validates: REQ-LTO-031

### T-LTO-018: Chaos Orchestration Script

- [x] Create `scripts/run-chaos-test.sh`
- [x] Sequence: baseline → pod kill → network → stress → recovery
- [x] Configurable phase durations
- Validates: REQ-LTO-030, REQ-LTO-032

### T-LTO-019: ArgoCD Rolling Update Test

- [x] Add rolling update trigger to chaos sequence
- [x] Verify zero-downtime during sync
- Validates: REQ-LTO-022, REQ-LTO-034

### T-LTO-020: k6 Prometheus Remote Write

- [x] Configure k6 `--out experimental-prometheus-rw`
- [x] Add k6 metrics to Grafana scenario timeline dashboard
- Validates: REQ-LTO-035

### T-LTO-021: Autoscale Test Script

- [x] Create `scripts/run-autoscale-test.sh`
- [x] Ramp: 2 replicas → load → scale-up → reduce → scale-down
- Validates: REQ-LTO-033

### T-LTO-022: Update README

- [x] Add load test + observability section to README
- [x] Document all new UIs, dashboards, commands
- [x] Add architecture diagram for observability stack

## Task Summary

| Phase | Tasks | REQs Covered |
| ----- | ----- | ------------ |
| 1. Loki | T-LTO-001..002 | REQ-LTO-008..012 |
| 2. Dashboards | T-LTO-003..007 | REQ-LTO-013..019 |
| 3. Mega Simulator | T-LTO-008..011 | REQ-LTO-001..007 |
| 4. ArgoCD | T-LTO-012..013 | REQ-LTO-020..021, 023 |
| 5. Chaos Mesh | T-LTO-014..016 | REQ-LTO-024..029 |
| 6. Load Tests | T-LTO-017..022 | REQ-LTO-030..035, 022 |
| **Total** | **22 tasks** | **35 REQs** |
