# Load Test + Observability Suite — Requirements

> Feature: Mega-scale load testing with full observability, chaos engineering, and ArgoCD integration.
> EARS format per ADR-020. Extends REQ-PROD, REQ-OBS, REQ-K8E, REQ-INFRA (does not duplicate).

## 1. Mega Web Simulator

### REQ-LTO-001: Parameterized Domain Generation

When the simulator receives configuration `DOMAIN_COUNT` and `PAGES_PER_DOMAIN`, the system **shall** generate `DOMAIN_COUNT` virtual domains, each containing `PAGES_PER_DOMAIN` interlinked pages with deterministic content.

**Acceptance**: Given `DOMAIN_COUNT=1000` and `PAGES_PER_DOMAIN=50`, When the simulator starts, Then 50,000 unique URL paths are routable and each page contains links to other pages within the same virtual domain.

### REQ-LTO-002: Cross-Domain Link Injection

The system **shall** inject configurable cross-domain links (controlled by `CROSS_DOMAIN_LINK_RATIO`, default 0.1) so that 10% of links on each page point to pages in other virtual domains.

**Acceptance**: Given `CROSS_DOMAIN_LINK_RATIO=0.1` and 10 links per page, When a page is rendered, Then ~1 link targets a different virtual domain.

### REQ-LTO-003: Scenario Injection Per Domain

The system **shall** assign chaos scenarios to a configurable percentage of domains (controlled by `CHAOS_DOMAIN_RATIO`, default 0.2). Scenario types: `slow` (200–5000ms delay), `error` (random 500/502/503), `redirect-chain` (3–10 hops), `intermittent` (alternating success/failure), `rate-limited` (429 after N requests).

**Acceptance**: Given 1000 domains with `CHAOS_DOMAIN_RATIO=0.2`, When the simulator starts, Then 200 domains exhibit one of the defined chaos behaviors.

### REQ-LTO-004: Deterministic Content with Unique Fingerprints

Each generated page **shall** contain a unique SHA-256 content fingerprint derived from the domain+path, enabling deduplication verification across crawler instances.

**Acceptance**: Given the same simulator configuration, When requested twice, Then the same URL returns identical content with identical fingerprint.

### REQ-LTO-005: Robots.txt Per Virtual Domain

Each virtual domain **shall** serve a `/robots.txt` that disallows a configurable percentage of paths (default 10%), enabling robots.txt compliance verification at scale.

### REQ-LTO-006: Simulator Metrics Endpoint

The simulator **shall** expose a Prometheus metrics endpoint reporting: `simulator_requests_total` (by domain, status), `simulator_response_duration_seconds` (histogram), `simulator_active_domains` (gauge), `simulator_pages_served_total`.

### REQ-LTO-007: Multi-Pod Simulator Deployment

When deployed on Kubernetes, the simulator **shall** run as a Deployment with N replicas behind a Service, with each replica serving the complete domain set (stateless, deterministic).

## 2. Centralized Logging (Loki)

### REQ-LTO-008: Loki Log Aggregation

The system **shall** deploy Loki as a centralized log store, collecting structured JSON logs from all crawler pods via Promtail sidecars.

**Acceptance**: Given a running crawler pod, When the crawler emits a Pino JSON log line, Then the log appears in Loki within 5 seconds and is queryable via LogQL.

### REQ-LTO-009: Grafana Loki Datasource

The system **shall** provision Loki as a Grafana datasource, enabling LogQL queries in Grafana Explore and dashboard panels.

### REQ-LTO-010: Log Correlation with Traces

When a log line contains `traceId` and `spanId` fields (injected by OTel), the system **shall** enable click-through from Grafana Logs to the corresponding Jaeger trace.

**Acceptance**: Given a log line with `traceId=abc123`, When clicked in Grafana, Then the Jaeger trace `abc123` opens in a split view.

### REQ-LTO-011: Log-Based Dashboard Panels

The system **shall** provide Grafana dashboard panels showing: log volume over time (by level), error log rate, top error messages, and per-domain log aggregation.

### REQ-LTO-012: Docker Compose Loki Stack

The docker-compose dev environment **shall** include Loki + Promtail services, collecting logs from all containers and making them available in Grafana without additional configuration.

## 3. Grafana Dashboard Suite

### REQ-LTO-013: Scenario Execution Timeline Dashboard

The system **shall** provide a Grafana dashboard showing a timeline of all test scenario executions with annotations marking: scenario start/end, chaos events injected, SLO violations detected, and ArgoCD sync events.

### REQ-LTO-014: Chaos Events Dashboard

The system **shall** provide a dashboard showing chaos experiment status (active, completed, failed), affected pods/services, and recovery time metrics.

### REQ-LTO-015: Infrastructure Health Dashboard

The system **shall** provide a dashboard showing: CPU/memory usage per pod, Redis connection pool utilization, PostgreSQL connection count, MinIO storage usage, network I/O.

### REQ-LTO-016: Alert Status Dashboard

The system **shall** provide a dashboard showing all Prometheus alert rules with current state (firing, pending, inactive), last transition time, and alert history over the selected time range.

### REQ-LTO-017: Trace Analytics Dashboard

The system **shall** provide a dashboard with trace-derived panels: request latency heatmap, error rate by operation, service dependency graph, and slowest traces table.

### REQ-LTO-018: Exemplar Links (Metrics to Traces)

When Prometheus metrics include exemplar data, clicking a data point in Grafana **shall** open the corresponding Jaeger trace, enabling drill-down from aggregate metrics to individual request traces.

### REQ-LTO-019: Dashboard Provisioning

All dashboards **shall** be auto-provisioned via Grafana provisioning (JSON files), requiring zero manual configuration after `docker compose up` or k8s deployment.

## 4. ArgoCD Integration

### REQ-LTO-020: ArgoCD Deployment in k3d

The `setup-local.sh` script **shall** install ArgoCD into the k3d cluster and create an ArgoCD Application pointing to the IPF Kustomize overlay.

**Acceptance**: After `pnpm k8s:setup`, ArgoCD UI is accessible via port-forward on port 8443, and the IPF application shows as Synced/Healthy.

### REQ-LTO-021: ArgoCD Grafana Datasource

The system **shall** provision ArgoCD notifications as Grafana annotations, marking deployment sync events on all dashboards.

### REQ-LTO-022: ArgoCD Sync During Load Test

The load test scenario **shall** include an ArgoCD sync (config change or image tag update) during active crawling to verify zero-downtime rolling updates.

**Acceptance**: Given a running load test at 100 URL/s, When ArgoCD syncs a new image tag, Then no requests are lost (error rate stays below 5%) and the rollout completes within 120 seconds.

### REQ-LTO-023: ArgoCD Health in Dashboard

The Grafana infrastructure dashboard **shall** include an ArgoCD panel showing: application sync status, health status, last sync time, and sync history.

## 5. Chaos Mesh Integration

### REQ-LTO-024: Chaos Mesh Deployment

The k3d setup **shall** install Chaos Mesh CRDs and controller, enabling declarative chaos experiments as Kubernetes resources.

### REQ-LTO-025: Pod Kill Experiments

The system **shall** provide PodChaos experiments that randomly kill crawler pods during load tests, with configurable kill interval and target percentage.

### REQ-LTO-026: Network Chaos Experiments

The system **shall** provide NetworkChaos experiments: latency injection (50–500ms), packet loss (1–50%), network partition (worker ↔ Redis, worker ↔ PostgreSQL), and bandwidth limiting.

### REQ-LTO-027: CPU/Memory Stress Experiments

The system **shall** provide StressChaos experiments applying CPU pressure and memory pressure to crawler pods during load tests.

### REQ-LTO-028: DNS Chaos Experiments

The system **shall** provide DNSChaos experiments causing DNS resolution failures for configured services, verifying DNS-fail-closed behavior.

### REQ-LTO-029: Chaos Experiment Metrics

All chaos experiments **shall** emit events/metrics consumable by Prometheus, enabling Grafana annotations that mark when chaos was injected and when recovery completed.

### REQ-LTO-030: Chaos Experiment Orchestration

The load test runner **shall** orchestrate chaos experiments in defined sequences: baseline (5 min) → pod kill (5 min) → network partition (5 min) → stress test (5 min) → recovery verification (5 min), with configurable durations.

## 6. Scaled Load Test Scenarios

### REQ-LTO-031: Mega Crawl Scenario

The system **shall** provide a k6 load test that seeds 10,000 URLs across 1,000 domains against the mega simulator, running 10 concurrent crawler workers, sustaining 500+ URL/s for 30 minutes.

**SLOs**: p95 latency <5s, error rate <5%, no OOM (RSS <512MB/pod), all URLs eventually crawled.

### REQ-LTO-032: Chaos Crawl Scenario

The mega crawl scenario **shall** run concurrently with Chaos Mesh experiments (REQ-LTO-030 sequence), verifying SLO compliance under failure conditions.

**SLOs**: p95 latency <10s (relaxed), error rate <15% during active chaos, full recovery within 60s after chaos ends.

### REQ-LTO-033: Autoscale Under Load Scenario

The load test **shall** verify HPA autoscaling: start with 2 replicas, increase load to trigger scale-up to 5+, then reduce load and verify scale-down, all while maintaining SLO compliance.

### REQ-LTO-034: ArgoCD Rolling Update Scenario

During the mega crawl, the test **shall** trigger an ArgoCD sync (image tag change), verifying rolling update with zero request loss and continued SLO compliance.

### REQ-LTO-035: Load Test Result Visualization

k6 test results **shall** be exported to Prometheus (via k6 Prometheus remote write), enabling Grafana dashboards to show real-time load test metrics alongside system metrics.

## Requirement Summary

| Category | IDs | Count |
| -------- | --- | ----- |
| Mega Simulator | REQ-LTO-001..007 | 7 |
| Centralized Logging | REQ-LTO-008..012 | 5 |
| Grafana Dashboards | REQ-LTO-013..019 | 7 |
| ArgoCD Integration | REQ-LTO-020..023 | 4 |
| Chaos Mesh | REQ-LTO-024..030 | 7 |
| Scaled Load Tests | REQ-LTO-031..035 | 5 |
| **Total** | | **35** |
