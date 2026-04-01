# Load Testing & Chaos Engineering Guide

> Detailed guide for running production-grade load tests, chaos experiments, and observability validation.
> For quick start, see the [README](../README.md#load-testing--chaos-engineering).

## Why Load Testing + Chaos Engineering?

A web crawler that works on 7 pages doesn't prove much. Real-world crawling involves:

- **Thousands of domains** with varying response characteristics — slow servers, rate-limited APIs, transient failures, redirect chains
- **Network partitions** where Redis (the job queue) becomes unreachable mid-crawl
- **Pod failures** where Kubernetes kills workers during active fetching
- **CPU pressure** where container resource limits throttle processing
- **DNS failures** where target domains become unresolvable

This test suite validates that the crawler **maintains SLOs** (p95 latency < 5s, error rate < 5%) under all these conditions — not just happy-path unit tests.

## Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                        k3d Cluster                          │
│                                                             │
│  ┌─────────────┐    ┌────────────────┐    ┌──────────────┐ │
│  │  Crawler     │    │ Mega Simulator │    │  Dragonfly   │ │
│  │  Workers (N) │◄──►│  1000 domains  │    │  (Redis)     │ │
│  │              │    │  50K pages     │    │              │ │
│  └──────┬───────┘    └────────────────┘    └──────┬───────┘ │
│         │                                         │         │
│  ┌──────▼───────┐    ┌────────────────┐    ┌──────▼───────┐ │
│  │  Prometheus  │◄───│   Chaos Mesh   │    │  PostgreSQL  │ │
│  │  + Alerting  │    │  (experiments) │    │              │ │
│  └──────┬───────┘    └────────────────┘    └──────────────┘ │
│         │                                                   │
│  ┌──────▼───────┐    ┌────────────────┐    ┌──────────────┐ │
│  │   Grafana    │◄───│     Loki       │◄───│   Promtail   │ │
│  │  7 dashboards│    │  (log store)   │    │ (collector)  │ │
│  └──────────────┘    └────────────────┘    └──────────────┘ │
│                                                             │
│  ┌──────────────┐    ┌────────────────┐                     │
│  │   ArgoCD     │    │    Jaeger      │                     │
│  │  (GitOps)    │    │   (tracing)    │                     │
│  └──────────────┘    └────────────────┘                     │
│                                                             │
│                    ┌─────────────────┐                       │
│                    │   k6 Driver     │ ◄── Prometheus        │
│                    │  500 URL/s      │     Remote Write      │
│                    └─────────────────┘                       │
└─────────────────────────────────────────────────────────────┘
```

## Mega Simulator

The mega simulator generates a parameterized virtual web. Unlike the 7-page demo simulator, it creates **thousands of domains** with realistic characteristics:

| Feature | Description |
| ------- | ----------- |
| **Virtual domains** | Each domain has its own URL namespace (`/domain-NNNN/page-N`), `robots.txt`, and response behavior |
| **Deterministic content** | Pages have SHA-256 fingerprints for deduplication verification — same seed always produces same content |
| **Cross-domain links** | 10% of links cross domain boundaries (configurable), creating a realistic web graph |
| **Chaos scenarios** | 20% of domains inject failures (configurable) — distributed across 5 types |
| **Per-domain robots.txt** | Each domain has its own disallowed paths (10% of pages blocked) |

### Chaos Scenario Types

| Type | Domains | Behavior |
| ---- | ------- | -------- |
| **Slow** | 0, 5, 10, 15... | Random delay 200ms–5s per request |
| **Error** | 1, 6, 11, 16... | Returns 500/502/503 randomly |
| **Redirect Chain** | 2, 7, 12, 17... | 5 redirects (302) before serving content |
| **Intermittent** | 3, 8, 13, 18... | 30% chance of 503, 70% success |
| **Rate Limited** | 4, 9, 14, 19... | First 10 requests OK, then 429 with Retry-After |

### Running Standalone

```bash
# Quick test (100 domains, 2000 pages)
npx tsx packages/testing/src/simulators/mega-simulator-entrypoint.ts

# Full scale (1000 domains, 50K pages)
DOMAIN_COUNT=1000 PAGES_PER_DOMAIN=50 npx tsx packages/testing/src/simulators/mega-simulator-entrypoint.ts

# Docker
docker build -f infra/docker/Dockerfile.mega-simulator -t mega-simulator .
docker run -p 8080:8080 -e DOMAIN_COUNT=1000 mega-simulator
```

### Endpoints

```bash
# Health check
curl http://localhost:8080/health
# → {"status":"ok"}

# Normal page (domain 25, page 3)
curl http://localhost:8080/domain-0025/page-3
# → HTML with links, SHA-256 fingerprint, cross-domain references

# Robots.txt
curl http://localhost:8080/domain-0005/robots.txt
# → Disallow rules for specific pages

# Prometheus metrics
curl http://localhost:8080/metrics
# → simulator_requests_total, simulator_pages_served_total, per-status counts
```

### Configuration

| Variable | Default | Range | Description |
| -------- | ------- | ----- | ----------- |
| `DOMAIN_COUNT` | 1000 | 1–10,000 | Number of virtual domains |
| `PAGES_PER_DOMAIN` | 50 | 1–1,000 | Pages per domain |
| `CHAOS_DOMAIN_RATIO` | 0.2 | 0–1.0 | Fraction of domains with chaos injection |
| `CROSS_DOMAIN_LINK_RATIO` | 0.1 | 0–1.0 | Fraction of links crossing domain boundaries |
| `DISALLOWED_PATH_RATIO` | 0.1 | 0–1.0 | Fraction of pages blocked in robots.txt |
| `LINKS_PER_PAGE` | 10 | 0–100 | Number of links per page |
| `MEGA_SIMULATOR_PORT` | 8080 | — | HTTP listen port |

## k6 Load Tests

Three load profiles, each targeting different system properties:

### 1. Throughput Test (100 URL/s × 60s)

Validates sustained throughput with acceptable latency:

```bash
k6 run packages/testing/src/load/throughput.k6.js
```

**SLO thresholds**: p95 latency < 5s, error rate < 5%.

### 2. Backpressure Test (10,000 URLs burst)

Validates the system handles burst load without OOM or data loss:

```bash
k6 run packages/testing/src/load/backpressure.k6.js
```

**SLO thresholds**: ≥95% seeds accepted, p95 < 10s under burst.

### 3. Mega Crawl (500 URL/s × 30 min)

The full-scale test across 1000+ domains with Prometheus remote write for real-time dashboards:

```bash
k6 run --out experimental-prometheus-rw \
  -e K6_PROMETHEUS_RW_SERVER_URL=http://localhost:9091/api/v1/write \
  -e SIMULATOR_HOST=http://mega-simulator:8080 \
  -e DOMAIN_COUNT=1000 \
  -e TARGET_RATE=500 \
  packages/testing/src/load/mega-crawl.k6.js
```

**SLO thresholds**: p95 < 5s, p99 < 10s, error rate < 5%.

## Chaos Testing (Chaos Mesh)

Five pre-defined chaos experiments in `infra/k8s/chaos/`:

| Experiment | CRD | Target | Duration | What It Tests |
| ---------- | --- | ------ | -------- | ------------- |
| `pod-kill.yml` | PodChaos | 1 crawler pod | 5m | Pod rescheduling, job redelivery, no data loss |
| `network-delay.yml` | NetworkChaos | crawler ↔ simulator | 5m | Circuit breaker trips, retry backoff, timeout handling |
| `network-partition.yml` | NetworkChaos | crawler ↔ Redis | 3m | Queue reconnection, job idempotency, state recovery |
| `stress-cpu.yml` | StressChaos | 1 crawler pod (80% CPU) | 5m | Graceful degradation, HPA trigger, backpressure |
| `dns-failure.yml` | DNSChaos | mega-simulator DNS | 2m | DNS circuit breaker, error classification accuracy |

### Orchestrated Chaos Sequence (25 minutes)

```bash
scripts/run-chaos-test.sh
```

```text
Timeline:
00:00 ─── Baseline (5 min) ──── collect steady-state metrics
05:00 ─── Pod Kill (5 min) ──── random pod deaths every 2m
10:00 ─── Network (5 min) ───── 200ms latency + 50ms jitter
15:00 ─── CPU Stress (5 min) ── 80% load on 1 pod
20:00 ─── Recovery (5 min) ──── all chaos removed, verify SLOs
```

The script automatically pauses ArgoCD self-heal during tests (to prevent it from "fixing" the chaos) and restores it on cleanup.

### Manual Chaos

```bash
# Apply a single experiment
kubectl apply -f infra/k8s/chaos/pod-kill.yml

# Check active experiments
kubectl get podchaos,networkchaos,stresschaos,dnschaos -A

# Remove
kubectl delete -f infra/k8s/chaos/pod-kill.yml
```

## Autoscaling Validation

Test HPA (Horizontal Pod Autoscaler) behavior under staged load:

```bash
scripts/run-autoscale-test.sh
```

```text
Phase 1: 3 min at 50 URL/s ──── baseline (2 pods)
Phase 2: 5 min at 250 URL/s ─── expect scale to 3+ pods
Phase 3: 5 min at 500 URL/s ─── expect scale to 5+ pods
Phase 4: 5 min cool-down ────── expect scale back to 2 pods
```

## Grafana Dashboard Suite

Seven dashboards auto-provision. Color-coded annotations link events across dashboards:

- **Blue** — k6 load test phases
- **Red** — Chaos Mesh experiment start/end
- **Green** — ArgoCD sync events
- **Orange** — Alert firings

### Dashboard Detail

| Dashboard | Panels | Use Case |
| --------- | ------ | -------- |
| **Crawler Overview** | Fetch rate, error %, latency percentiles, frontier depth, worker utilization, stalled jobs | Day-to-day monitoring |
| **Scenario Timeline** | Throughput with event annotations, SLO gauges, error log volume | During load/chaos tests — the "war room" view |
| **Chaos Events** | Active experiments, MTTR, circuit breaker state, pod restarts, error rate | Chaos test analysis |
| **Infrastructure Health** | CPU/memory per pod, Redis connections, PostgreSQL, ArgoCD sync/health, network I/O | Resource monitoring |
| **Alert Status** | Firing alerts table, alert history, evaluation rate, state pie chart | Alert triage |
| **Trace Analytics** | Latency heatmap, error by operation, P99 bar gauge, trace search | Performance debugging |
| **Log Explorer** | Volume by level, error rate, top errors, live tail, trace-correlated logs | Log analysis with trace jump |

### Trace-Log Correlation

Click a `traceId` in the Log Explorer → jumps to the Jaeger trace. Click a trace in Trace Analytics → see correlated logs in Loki. This works because:

1. Crawler emits Pino JSON logs with `traceId` and `spanId` fields (from OpenTelemetry)
2. Promtail extracts these as structured metadata
3. Grafana's Loki datasource has `derivedFields` that link `traceId` → Jaeger URL

## ArgoCD Integration

ArgoCD provides GitOps continuous deployment. The setup script installs it in k3d:

```bash
# Access ArgoCD UI
kubectl port-forward svc/argocd-server -n argocd 8443:443

# Get admin password
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath='{.data.password}' | base64 -d
```

The Application CRD (`infra/k8s/argocd/ipf-application.yml`) syncs from `infra/k8s/overlays/dev` with auto-heal and retry. During chaos tests, auto-sync is paused to prevent interference.

## Running Everything Together

### On k3d (Full Production Simulation)

```bash
# 1. Create cluster with ArgoCD + Chaos Mesh
pnpm k8s:setup

# 2. Build and deploy crawler
pnpm k8s:build

# 3. Deploy mega simulator
docker build -f infra/docker/Dockerfile.mega-simulator -t mega-simulator .
docker tag mega-simulator k3d-ipf-registry.localhost:5111/mega-simulator:latest
docker push k3d-ipf-registry.localhost:5111/mega-simulator:latest

# 4. Port-forward Grafana, then run chaos test
scripts/run-chaos-test.sh

# 5. In parallel, run mega crawl
k6 run --out experimental-prometheus-rw \
  -e K6_PROMETHEUS_RW_SERVER_URL=http://prometheus:9090/api/v1/write \
  packages/testing/src/load/mega-crawl.k6.js
```

### On Docker Compose (Quick Local)

```bash
# Start full stack with demo profile
docker compose -f infra/docker/docker-compose.dev.yml --profile demo up

# Open Grafana
open http://localhost:3000

# Run throughput test against the demo simulator
k6 run -e API_URL=http://localhost:3000 packages/testing/src/load/throughput.k6.js
```

## Feature Specification

Full EARS requirements (35 requirements: REQ-LTO-001..035), architecture design, and implementation tasks are in `docs/specs/load-test-observability/`.

---

> **Provenance**: Created 2026-03-31. Verified with manual testing of mega simulator (all 5 chaos types confirmed working), Loki + Grafana datasource provisioning (7 dashboards auto-provisioned).
