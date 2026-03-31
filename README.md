# IPF — Distributed Web Crawler

A production-grade distributed web crawler built with TypeScript, designed as a monorepo with strict type safety, hexagonal architecture, and comprehensive testing — including property-based tests, integration tests with real infrastructure (Testcontainers), and Kubernetes E2E tests.

## Quick Start

### Prerequisites

- **Node.js** >= 22 (see `.nvmrc`)
- **pnpm** 10.x (`corepack enable && corepack prepare pnpm@10.33.0 --activate`)
- **Docker** (for local infrastructure and integration tests)

### Install & Build

```bash
pnpm install
pnpm build
```

### Run Tests

```bash
# All unit tests (fast, no infrastructure needed)
pnpm test

# Type checking + linting + tests (full guard chain)
pnpm verify:guards
```

### Run Locally (Docker Compose)

```bash
# Infrastructure only (PostgreSQL, Redis, MinIO, Prometheus, Grafana)
docker compose -f infra/docker/docker-compose.dev.yml up

# Full demo — crawler + web simulator generating real traffic
docker compose -f infra/docker/docker-compose.dev.yml --profile demo up
```

The `--profile demo` flag adds the crawler and a web simulator (7-page deterministic site with robots.txt and test scenarios). The crawler fetches pages, populates PostgreSQL/MinIO, and exports metrics — Grafana dashboards at <http://localhost:3000> fill with real data.

| Service | Port | Purpose |
| --------- | ------ | --------- |
| Crawler | 9090, 8081 | Metrics + health endpoints |
| Web Simulator | 8080 | Deterministic crawl target (7 pages) |
| PostgreSQL | 5432 | Crawl metadata storage |
| MinIO | 9000, 9001 | S3-compatible page content |
| Dragonfly | 6379 | Redis-compatible state store |
| Prometheus | 9091 | Metrics scraping + alerting |
| Grafana | 3000 | Dashboards + trace exploration |
| Jaeger | 16686 | Distributed tracing UI |
| Loki | 3100 | Centralized log aggregation |
| Promtail | — | Docker log collection agent |

### Run on Local Kubernetes (k3d)

```bash
pnpm k8s:setup     # Create k3d cluster + install ArgoCD + Chaos Mesh
pnpm k8s:build     # Build and push Docker image
pnpm k8s:e2e       # Run E2E tests against the cluster
pnpm k8s:teardown  # Tear down cluster
```

---

## Accessing the UIs

### Docker Compose

Start the full demo stack:

```bash
docker compose -f infra/docker/docker-compose.dev.yml --profile demo up
```

| UI | URL | What to look for |
| ---- | ----- | ----------------- |
| **Grafana** | <http://localhost:3000> | Pre-provisioned "IPF Crawler Overview" dashboard (no login needed) |
| **Prometheus** | <http://localhost:9091> | Raw PromQL queries, alert rule status |
| **Jaeger** | <http://localhost:16686> | Distributed traces — search by service `ipf-crawler` |
| **MinIO Console** | <http://localhost:9001> | Stored page content (login: `minioadmin` / `minioadmin`) |
| **Web Simulator** | <http://localhost:8080> | The 7-page site the crawler targets |
| **Crawler Health** | <http://localhost:8081> | Liveness + readiness probes |
| **Crawler Metrics** | <http://localhost:9090/metrics> | Raw Prometheus metrics |

#### Grafana Dashboard — IPF Crawler Overview

The dashboard auto-provisions with 8 panels. After starting the demo, allow ~30 seconds for the first scrape cycle, then:

| Panel | What it shows |
| ------- | -------------- |
| **Fetch Rate** | Successful vs errored fetches per second (timeseries) |
| **Error Rate** | Percentage of failed fetches — green/yellow/red gauge |
| **Stalled Jobs** | Rate of jobs stuck in BullMQ (should be zero) |
| **Fetch Latency** | P50/P95/P99 response times as histogram quantiles |
| **Frontier Size** | Current URL queue depth — drops to zero when crawl completes |
| **URLs Discovered** | Rate of new URLs found via link extraction |
| **Worker Utilization** | Percentage of worker capacity in use |
| **Coordinator Restarts** | Restart counter — should stay at zero |

You can also explore traces directly in Grafana under **Explore → Jaeger** datasource.

#### Viewing Traces in Jaeger

Open <http://localhost:16686> and select service **ipf-crawler** from the dropdown. Each trace shows the crawl pipeline for a single URL: DNS resolution → HTTP fetch → SSRF validation → HTML parse → link extraction. Click any trace to see the full span waterfall with timing, status codes, and error details.

### Local Kubernetes (k3d)

Monitoring is not deployed in k8s by default (it uses Prometheus pod annotations for scraping). Use `kubectl port-forward` to access services:

```bash
# Crawler metrics
kubectl port-forward -n ipf deploy/crawler-worker 9090:9090

# MinIO Console
kubectl port-forward -n ipf svc/minio 9001:9001

# PostgreSQL (for debugging)
kubectl port-forward -n ipf svc/postgresql 5432:5432

# Dragonfly/Redis
kubectl port-forward -n ipf svc/dragonfly 6379:6379

# Web Simulator (e2e overlay only)
kubectl port-forward -n ipf svc/web-simulator 8080:8080
```

For full observability in k8s, deploy the Prometheus/Grafana stack (e.g. via `kube-prometheus-stack` Helm chart) — the crawler pods already expose metrics via annotations (`prometheus.io/scrape: "true"`, `prometheus.io/port: "9090"`).

---

## Load Testing & Chaos Engineering

### Mega Simulator — 1000+ Domains at Scale

The mega simulator generates a configurable virtual web of thousands of domains and tens of thousands of pages for realistic large-scale load testing:

```bash
# Build and run the mega simulator
docker build -f infra/docker/Dockerfile.mega-simulator -t mega-simulator .
docker run -p 8080:8080 \
  -e DOMAIN_COUNT=1000 \
  -e PAGES_PER_DOMAIN=50 \
  -e CHAOS_DOMAIN_RATIO=0.2 \
  mega-simulator
```

| Parameter | Default | Description |
| --------- | ------- | ----------- |
| `DOMAIN_COUNT` | 1000 | Number of virtual domains |
| `PAGES_PER_DOMAIN` | 50 | Pages per domain (total: domains × pages) |
| `CHAOS_DOMAIN_RATIO` | 0.2 | 20% of domains inject chaos (slow, 5xx, redirect chains, intermittent, rate limiting) |
| `CROSS_DOMAIN_LINK_RATIO` | 0.1 | Percentage of links that cross domain boundaries |
| `DISALLOWED_PATH_RATIO` | 0.1 | Pages blocked via per-domain `robots.txt` |

Default configuration: **1,000 domains × 50 pages = 50,000 unique URLs** with deterministic content (SHA-256 fingerprints for dedup verification), cross-domain link graphs, per-domain `robots.txt`, and 5 chaos scenario types applied to 200 domains.

### k6 Load Tests

Three load profiles targeting different system properties:

```bash
# Sustained throughput — 100 URL/s for 60s
k6 run packages/testing/src/load/throughput.k6.js

# Burst backpressure — 10,000 URLs at once
k6 run packages/testing/src/load/backpressure.k6.js

# Mega crawl — 500 URL/s for 30 min across 1000 domains
# With real-time Prometheus metrics:
k6 run --out experimental-prometheus-rw \
  -e K6_PROMETHEUS_RW_SERVER_URL=http://localhost:9091/api/v1/write \
  -e SIMULATOR_HOST=http://localhost:8080 \
  packages/testing/src/load/mega-crawl.k6.js
```

### Chaos Testing (Chaos Mesh on k3d)

Five chaos experiment types are pre-defined as Kubernetes CRDs in `infra/k8s/chaos/`:

| Experiment | Type | Effect |
| ----------- | ------ | ------- |
| Pod Kill | PodChaos | Kills one crawler-worker pod randomly |
| Network Delay | NetworkChaos | 200ms latency + 50ms jitter to mega-simulator |
| Network Partition | NetworkChaos | Full partition between crawler-worker ↔ Dragonfly (Redis) |
| CPU Stress | StressChaos | 80% CPU load on 2 cores of one crawler pod |
| DNS Failure | DNSChaos | DNS resolution failures for mega-simulator |

Run the automated 25-minute chaos sequence:

```bash
scripts/run-chaos-test.sh

# Sequence: 5m baseline → 5m pod kills → 5m network delay
#         → 5m CPU stress → 5m recovery
```

### Autoscaling Validation

Test HPA-driven pod scaling under staged load:

```bash
scripts/run-autoscale-test.sh

# Ramp: 3m at 50 URL/s → 5m at 250 URL/s → 5m at 500 URL/s → 5m cool-down
```

### Grafana Dashboard Suite

Seven dashboards auto-provision via `infra/monitoring/dashboards/`:

| Dashboard | Key Panels | Data Sources |
| --------- | ---------- | ------------ |
| **Crawler Overview** | Fetch rate, error rate, latency P50/P95/P99, frontier size, worker utilization | Prometheus |
| **Scenario Timeline** | Crawl throughput with chaos/alert annotations, SLO gauges, log volume | Prometheus, Loki |
| **Chaos Events** | Active experiments, MTTR, circuit breaker state, pod restarts, error rate | Prometheus, Loki |
| **Infrastructure Health** | CPU/memory per pod, Redis/PostgreSQL metrics, ArgoCD sync status | Prometheus |
| **Alert Status** | Firing alerts table, history, evaluation rate, state distribution | Prometheus |
| **Trace Analytics** | Latency heatmap, error by operation, slowest P99, trace search | Jaeger, Prometheus |
| **Log Explorer** | Volume by level, error rate, top errors, live logs, trace-correlated logs | Loki |

Dashboards use color-coded annotations: **blue** (k6 load phases), **red** (chaos events), **green** (ArgoCD syncs), **orange** (alert firings).

### ArgoCD Integration

The setup script installs ArgoCD in k3d with a pre-configured Application CRD:

```bash
# Access ArgoCD UI
kubectl port-forward svc/argocd-server -n argocd 8443:443

# Get initial admin password
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath='{.data.password}' | base64 -d
```

ArgoCD syncs from `infra/k8s/overlays/dev` with automated self-healing and retry. Sync events appear as green annotations on the Scenario Timeline dashboard. The Infrastructure Health dashboard tracks ArgoCD sync status and health in real time.

---

## Problem Statement

Build a web crawler that can:

1. **Crawl websites** starting from seed URLs, following links up to a configurable depth
2. **Respect politeness** — per-domain rate limiting, robots.txt compliance, configurable delays
3. **Handle failures gracefully** — circuit breakers, retries with exponential backoff, dead letter queues
4. **Scale horizontally** — job queue (BullMQ) distributes work, stateless workers, leader election for coordination
5. **Store results** — crawl metadata in PostgreSQL, page content in S3 (MinIO)
6. **Be observable** — structured logging (Pino), metrics (Prometheus), tracing (OpenTelemetry), alerting
7. **Be secure** — SSRF protection with RFC 6890 IP validation on every redirect hop, DNS pinning, input validation via Zod
8. **Detect completion** — know when a crawl session has finished (no more URLs to process)

---

## Architecture

### High-Level Design

```text
                    ┌─────────────┐
                    │ API Gateway │  Fastify + tRPC
                    │  (port 3000)│  Zod-validated requests
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │ URL Frontier│  Priority queue + SHA-256 dedup
                    │  (BullMQ)   │  Per-domain rate limiting
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
        ┌─────▼────┐ ┌────▼─────┐ ┌────▼─────┐
        │ Worker 1 │ │ Worker 2 │ │ Worker N │  Horizontal scaling
        │  (fetch) │ │  (fetch) │ │  (fetch) │  Circuit breakers
        └─────┬────┘ └────┬─────┘ └────┬─────┘
              │            │            │
              └────────────┼────────────┘
                           │
              ┌────────────┼────────────┐
              │                         │
        ┌─────▼──────┐          ┌──────▼──────┐
        │ PostgreSQL │          │    MinIO     │
        │ (metadata) │          │(page content)│
        └────────────┘          └─────────────┘
```

### Hexagonal Architecture

The domain layer has zero dependencies on infrastructure. All external concerns are behind port interfaces:

```text
Domain (pure)          Ports (interfaces)           Adapters (infra)
─────────────          ──────────────────           ────────────────
CrawlURL               Frontier                    BullMQQueueBackend
FetchResult             Fetcher                     HttpFetcher (undici)
CrawlError              PageContentRepository       S3PageContentRepository
DomainEvents            CrawlURLRepository          DrizzleCrawlURLRepository
                        Logger                      PinoLogger
                        CrawlMetrics                PromMetrics
```

### Monorepo Structure

```text
apps/api-gateway/              # Fastify + tRPC HTTP API
packages/
  core/                        # Domain types, errors, contracts (zero deps)
  config/ database/ redis/     # Infrastructure adapters
  job-queue/ url-frontier/     # BullMQ + priority queue + SHA-256 dedup
  http-fetching/ ssrf-guard/   # HTTP client + RFC 6890 SSRF protection
  crawl-pipeline/              # URL normalization, link discovery
  resilience/                  # Circuit breaker, retry, timeout, token bucket
  worker-management/           # Job consumer, utilization tracking
  completion-detection/        # Crawl completion via control plane
  application-lifecycle/       # Startup orchestration, graceful shutdown
  observability/               # OpenTelemetry + Pino + Prometheus
  api-router/ testing/         # tRPC router + Testcontainers helpers
infra/
  docker/                      # Dockerfile + docker-compose.dev.yml
  k8s/                         # Kustomize base + overlays (dev/staging/prod/e2e)
```

---

## Key Design Decisions

Each decision is documented as an Architecture Decision Record (ADR) in `docs/adr/`. Highlights:

- **Error Handling** — `neverthrow` `Result<T, DomainError>` with discriminated unions (9 variants for `FetchError`). `try/catch` only at infrastructure boundaries.
- **SSRF Protection** — Every HTTP redirect validated against RFC 6890 reserved IP ranges before following. Blocks private IPs, loopback, link-local, CGNAT, IPv4-mapped IPv6. Verified with property-based tests.
- **Resilience** — 7-layer stack on `cockatiel`: circuit breaker, retry (exponential + jitter), timeout, bulkhead, token bucket, Redis Lua sliding window, fallback.
- **TypeScript Strict** — `strict: true`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`. Zero `any` types (ESLint error). All input validated with Zod.

### Testing Strategy

| Type | Count | Framework | Infrastructure |
| ------ | ------- | ----------- | --------------- |
| Unit | 129 | Vitest | None — pure logic |
| Integration | 26 | Vitest + Testcontainers | Real Redis, PostgreSQL, MinIO |
| Property | 7 suites | fast-check | None — invariant checking |
| E2E | 18 | Vitest + k3d | Full Kubernetes cluster |
| Load | 3 | k6 | Mega simulator (50K URLs) |
| Chaos | 5 CRDs | Chaos Mesh | k3d cluster |
| **Total** | **180+** | | |

**Zero mock infrastructure** — integration tests use real containers (Testcontainers), never `vi.mock('redis')`. Property tests verify invariants of critical algorithms (circuit breaker state transitions, retry backoff, token bucket capacity, SSRF IP range coverage, URL normalization idempotence).

---

## Tech Stack

| Layer | Technology | Why |
| ------- | ----------- | ----- |
| Runtime | Node.js 22 | Native ESM, `using` keyword support |
| Language | TypeScript 6.0 | Strict mode, `exactOptionalPropertyTypes` |
| Monorepo | Turborepo + pnpm | Fast builds, dependency deduplication |
| HTTP API | Fastify 5 + tRPC 11 | End-to-end type safety, Zod validation |
| Job Queue | BullMQ 5 | Redis-backed, priorities, rate limiting, DLQ |
| Database | PostgreSQL 16 (Drizzle ORM) | Relational metadata, batch operations |
| Object Storage | MinIO (S3-compatible) | Page content, local/cloud parity |
| Cache/State | Dragonfly (Redis-compatible) | High-performance, multi-threaded |
| Resilience | cockatiel | Circuit breaker, retry, timeout (composable) |
| Error Handling | neverthrow | `Result<T, E>` without exceptions |
| Observability | OpenTelemetry + Pino + Prometheus | Traces, structured logs, metrics |
| Testing | Vitest + Testcontainers + fast-check | Real infra tests, property-based testing |
| Infrastructure | Docker + Kustomize + k3d | Multi-stage builds, K8s overlays |

---

## API

Contract-first design (OpenAPI 3.1 + TypeSpec). Internal services communicate via tRPC.

```text
POST   /api/v1/crawls              Create a crawl session
GET    /api/v1/crawls/:id          Get crawl status
GET    /api/v1/crawls/:id/results  Get crawl results
DELETE /api/v1/crawls/:id          Cancel a crawl
GET    /health                     Liveness probe
GET    /readyz                     Readiness probe
GET    /metrics                    Prometheus metrics
```

---

## Observability

Structured logging (Pino → Loki), metrics (Prometheus + 12 alert rules), tracing (OpenTelemetry → Jaeger), centralized log aggregation (Loki + Promtail), dashboards (7 auto-provisioned Grafana dashboards). Full trace-to-log correlation: click a trace ID in Jaeger to see correlated logs in Loki, or click a log entry to jump to the Jaeger trace. See [Accessing the UIs](#accessing-the-uis) and [Load Testing & Chaos Engineering](#load-testing--chaos-engineering) for details.

---

## Project Commands

```bash
pnpm install                 # Install dependencies
pnpm build                   # Build all packages
pnpm test                    # Run unit tests
pnpm verify:guards           # Full guard chain (typecheck + lint + test)
pnpm k8s:setup               # Create local k3d cluster
pnpm k8s:e2e                 # Run E2E tests on cluster
pnpm k8s:teardown            # Tear down cluster
pnpm test:alerts             # Validate Prometheus alert rules
pnpm typespec:compile        # Compile TypeSpec → OpenAPI
```

## Documentation

- **Architecture Decision Records**: `docs/adr/` — 22 ADRs covering every major technical decision
- **Feature Specifications**: `docs/specs/` — 23 features with requirements (EARS format), design, and task tracking
- **Load Test + Observability Spec**: `docs/specs/load-test-observability/` — 35 requirements (mega simulator, Loki, Grafana dashboards, ArgoCD, Chaos Mesh, scaled load tests)
- **Architectural Review**: `docs/architecture-review-2026-03-31.md` — multi-perspective review
- **Worklogs**: `docs/worklogs/` — chronological session logs
