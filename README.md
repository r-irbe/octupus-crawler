# IPF — Distributed Web Crawler

A production-grade distributed web crawler built with TypeScript, designed as a monorepo with strict type safety, hexagonal architecture, and comprehensive testing — including property-based tests, integration tests with real infrastructure (Testcontainers), chaos engineering with Chaos Mesh, and Kubernetes E2E tests.

## Why This Architecture?

Every design choice solves a specific problem encountered in production web crawling:

| Problem | Solution | Why Not Simpler? |
| ------- | -------- | ---------------- |
| Crawl at scale needs horizontal workers | BullMQ job queue + stateless workers | In-process queues can't survive crashes or scale across nodes |
| Following redirects can hit internal IPs | RFC 6890 SSRF validation on every hop | Validating only the initial URL misses redirect-based SSRF |
| 500s from one domain shouldn't stop others | cockatiel circuit breaker per domain | Global error handling would block healthy domains |
| Redis/DB failures shouldn't crash workers | `neverthrow` Result types, not exceptions | Thrown exceptions cross boundaries silently; Results force handling |
| "It passes unit tests" proves nothing | Testcontainers (real Redis/PG/MinIO), never mocks | Mocked Redis doesn't catch Lua script bugs or connection pool leaks |
| Crawling 7 test pages isn't realistic | Mega simulator: 1000 domains × 50K pages with chaos | Happy-path tests don't reveal backpressure, rate limiting, or recovery gaps |

## Quick Start

### Prerequisites

- **Node.js** >= 22 (see `.nvmrc`)
- **pnpm** 10.x (`corepack enable && corepack prepare pnpm@10.33.0 --activate`)
- **Docker** (for local infrastructure and integration tests)

```bash
pnpm install && pnpm build
pnpm test                     # Unit tests (fast, no infra)
pnpm verify:guards            # Full guard chain (typecheck + lint + test)
```

## Running with Docker Compose

The fastest way to see everything working — one command starts the full stack:

```bash
# Full demo: crawler + web simulator + all monitoring
docker compose -f infra/docker/docker-compose.dev.yml --profile demo up
```

This starts the crawler targeting a 7-page deterministic web simulator. Within 30 seconds, Grafana dashboards fill with real metrics, traces appear in Jaeger, and logs flow into Loki.

| UI | URL | What You'll See |
| -- | --- | --------------- |
| **Grafana** | <http://localhost:3000> | 7 auto-provisioned dashboards — start with "IPF Crawler Overview" |
| **Jaeger** | <http://localhost:16686> | Trace waterfall: DNS → HTTP fetch → SSRF check → HTML parse → links |
| **Prometheus** | <http://localhost:9091> | 12 alert rules, PromQL queries, target health |
| **MinIO** | <http://localhost:9001> | Stored page content (login: `minioadmin` / `minioadmin`) |

**Services**: PostgreSQL (:5432), Dragonfly/Redis (:6379), Loki (:3100), Promtail (log collector), Crawler (:9090 metrics, :8081 health), Web Simulator (:8080).

### What to Observe in the Demo

1. **Grafana → IPF Crawler Overview**: Watch fetch rate climb, then frontier size drop to zero as the crawl completes. Error rate should stay green (< 5%).
2. **Jaeger**: Select service `ipf-crawler` → each trace shows the full pipeline for one URL. Click spans to see timing, status codes, SSRF validation results.
3. **Grafana → Explore → Loki**: Query `{job="docker"} | json` to see structured crawler logs with `traceId` fields. Click a traceId to jump directly to the Jaeger trace.

## Running on Kubernetes (k3d)

For production-like testing with full observability parity, HPA autoscaling, ArgoCD GitOps, and Chaos Mesh fault injection. The k8s deployment includes the **same monitoring stack** as Docker Compose — Prometheus, Jaeger, Loki, Grafana with all 7 dashboards:

```bash
scripts/setup-local.sh        # Creates k3d cluster + ArgoCD + Chaos Mesh + monitoring
scripts/run-k8s-e2e-test.sh   # Full E2E: simulator, monitoring, scaling, chaos (all scenarios)
scripts/teardown-local.sh     # Tears down everything
```

### What the E2E Test Verifies

The test script (`scripts/run-k8s-e2e-test.sh`) runs 25+ assertions across 5 phases:

1. **Mega Simulator** — health, pages, robots.txt, metrics, all 5 chaos types (slow/error/redirect/rate-limit/intermittent)
2. **Monitoring Stack** — Prometheus scraping, Grafana datasources (Prometheus+Jaeger+Loki), Loki ready, Jaeger UI
3. **Scale Up** — `kubectl scale` to 5 replicas, verify all ready, generate load
4. **Scale Down** — scale to 1 replica, verify termination
5. **Chaos** — Pod Kill (recovery), Network Delay (latency), CPU Stress (survival), DNS Failure (survival), Network Partition (worker↔Redis)

### Access Services in k3d

```bash
kubectl port-forward -n ipf svc/grafana 3000:3000              # Grafana (7 dashboards)
kubectl port-forward -n ipf svc/jaeger 16686:16686             # Jaeger tracing
kubectl port-forward -n ipf svc/prometheus 9091:9090           # Prometheus
kubectl port-forward -n ipf svc/loki 3100:3100                 # Loki logs
kubectl port-forward -n ipf svc/mega-simulator 8080:8080       # Mega simulator
kubectl port-forward svc/argocd-server -n argocd 8443:443      # ArgoCD UI
kubectl port-forward svc/chaos-dashboard -n chaos-mesh 2333:2333  # Chaos Mesh
```

ArgoCD admin password: `kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 -d`

---

## Load Testing & Chaos Engineering

A crawler that works on 7 pages doesn't prove much. Real-world crawling involves thousands of domains with varying response characteristics, network partitions, pod failures, and DNS outages. This suite validates the crawler **maintains SLOs under chaos**.

> Full guide: [docs/LOAD-TESTING.md](docs/LOAD-TESTING.md)

### Mega Simulator — 50,000 URLs at Scale

The mega simulator generates a virtual web of **1,000 domains × 50 pages** with cross-domain links, per-domain `robots.txt`, SHA-256 content fingerprints for dedup verification, and 5 chaos scenario types injected into 20% of domains:

| Chaos Type | Effect | Why It Matters |
| ---------- | ------ | -------------- |
| **Slow** (200ms–5s) | Tests timeout handling + circuit breaker activation |
| **Error** (500/502/503) | Tests error classification + retry policy |
| **Redirect Chain** (5 hops) | Tests SSRF validation on every redirect + loop detection |
| **Intermittent** (30% fail) | Tests circuit breaker state transitions (closed→open→half-open) |
| **Rate Limited** (429 after 10 req) | Tests per-domain rate limiting + Retry-After compliance |

```bash
# Quick local test (2,000 pages)
DOMAIN_COUNT=100 PAGES_PER_DOMAIN=20 \
  npx tsx packages/testing/src/simulators/mega-simulator-entrypoint.ts

# Docker (50,000 pages)
docker build -f infra/docker/Dockerfile.mega-simulator -t mega-simulator .
docker run -p 8080:8080 mega-simulator
```

### k6 Load Profiles

```bash
# 100 URL/s sustained for 60s — validates steady-state SLOs
k6 run packages/testing/src/load/throughput.k6.js

# 10,000 URLs burst — validates backpressure without OOM
k6 run packages/testing/src/load/backpressure.k6.js

# 500 URL/s for 30 min with real-time Grafana metrics
k6 run --out experimental-prometheus-rw \
  -e K6_PROMETHEUS_RW_SERVER_URL=http://localhost:9091/api/v1/write \
  packages/testing/src/load/mega-crawl.k6.js
```

### Chaos Testing on k3d

Five Chaos Mesh experiments test resilience under real Kubernetes failure modes:

```bash
# Automated 25-minute chaos sequence
scripts/run-chaos-test.sh
# → 5m baseline → 5m pod kills → 5m network delay → 5m CPU stress → 5m recovery

# HPA autoscaling validation
scripts/run-autoscale-test.sh
# → 50 URL/s → 250 URL/s → 500 URL/s → cool-down, verify pod scaling
```

### Grafana Dashboard Suite

Seven dashboards auto-provision with trace-to-log correlation:

| Dashboard | Purpose |
| --------- | ------- |
| **Crawler Overview** | Day-to-day: fetch rate, error %, latency P50/P95/P99 |
| **Scenario Timeline** | Load/chaos tests: throughput + event annotations (blue=k6, red=chaos, green=ArgoCD) |
| **Chaos Events** | Chaos analysis: MTTR, circuit breaker state, pod restarts |
| **Infrastructure Health** | Resources: CPU/memory, Redis, PostgreSQL, ArgoCD sync |
| **Alert Status** | Alert triage: firing table, history, evaluation rate |
| **Trace Analytics** | Performance: latency heatmap, P99 by operation, trace search |
| **Log Explorer** | Debugging: live tail, error patterns, click traceId → Jaeger |

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
packages/                      # 18 shared libraries (never depend on apps/)
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
  virtual-memory/              # Context budget, chunking, eviction
  api-router/ testing/         # tRPC router + Testcontainers helpers
  eslint-config/               # Shared ESLint config
infra/
  docker/                      # Dockerfile + docker-compose.dev.yml
  k8s/                         # Kustomize base + overlays (dev/staging/prod/e2e)
  prometheus/ monitoring/      # Alert rules, Grafana dashboards
```

---

## Key Design Decisions

Each decision is documented as an Architecture Decision Record (ADR) in `docs/adr/`. Highlights:

- **Error Handling** — `neverthrow` `Result<T, DomainError>` with discriminated unions (9 variants for `FetchError`). `try/catch` only at infrastructure boundaries.
- **SSRF Protection** — Every HTTP redirect validated against RFC 6890 reserved IP ranges before following. Blocks private IPs, loopback, link-local, CGNAT, IPv4-mapped IPv6. Verified with property-based tests.
- **Resilience** — 7-layer stack on `cockatiel`: circuit breaker, retry (exponential + jitter), timeout, bulkhead, token bucket, Redis Lua sliding window, fallback.
- **TypeScript Strict** — `strict: true`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`. Zero `any` types (ESLint error). All input validated with Zod.

---

## Testing Strategy

| Type | Files | Assertions | Framework | What It Proves |
| ---- | ----- | ---------- | --------- | -------------- |
| Unit | 128 | 880+ | Vitest | Pure logic correctness — no infra needed |
| Integration | 26 | 150+ | Vitest + Testcontainers | Real Redis/PG/MinIO behavior, not mock assumptions |
| Property | 7 | 80+ | fast-check | Invariants hold for _all_ inputs (circuit breaker, SSRF, URL normalization) |
| E2E | 18 | — | Vitest + k3d | Full K8s cluster: pod scheduling, service discovery, health checks |
| Load | 3 | — | k6 | Sustained throughput, burst backpressure, 30-min mega crawl |
| Chaos | 5 CRDs | — | Chaos Mesh | Pod kill, network partition, CPU stress, DNS failure recovery |
| **Total** | **187** | **1,116** | | **Across 18 packages** |

**Zero mock infrastructure** — integration tests use real containers (Testcontainers), never `vi.mock('redis')`. Property tests verify invariants of critical algorithms (circuit breaker state transitions, retry backoff, token bucket capacity, SSRF IP range coverage, URL normalization idempotence).

---

## Observability Stack

```text
Crawler Pods ──► Prometheus ──► Grafana (7 dashboards, 12 alert rules)
             ──► Jaeger     ──► Grafana (trace analytics, latency heatmap)
             ──► Loki       ──► Grafana (log explorer, error analysis)
                    ▲
                    └── Full correlation: traceId links logs ↔ traces ↔ metrics
```

Click a trace ID in Loki → jumps to Jaeger trace. Click a trace in Jaeger → see correlated logs. Prometheus exemplars link metrics → traces. All three signals connected.

---

## Tech Stack

| Layer | Technology | Why |
| ----- | ---------- | --- |
| Runtime | Node.js 22 | Native ESM, `using` keyword support |
| Language | TypeScript 6.0 | Strict mode, `exactOptionalPropertyTypes` |
| Monorepo | Turborepo + pnpm | Fast builds, dependency deduplication |
| HTTP API | Fastify 5 + tRPC 11 | End-to-end type safety, Zod validation |
| Job Queue | BullMQ 5 | Redis-backed, priorities, rate limiting, DLQ |
| Database | PostgreSQL 16 (Drizzle) | Relational metadata, batch operations |
| Object Storage | MinIO (S3-compatible) | Page content, local/cloud parity |
| Cache/State | Dragonfly (Redis-compatible) | High-performance, multi-threaded |
| Resilience | cockatiel | Circuit breaker, retry, timeout (composable) |
| Error Handling | neverthrow | `Result<T, E>` without exceptions |
| Observability | OTel + Pino + Prometheus + Loki | Traces, structured logs, metrics, log aggregation |
| Testing | Vitest + Testcontainers + fast-check + k6 + Chaos Mesh | Real infra, property-based, load, chaos |
| Deployment | Docker + Kustomize + k3d + ArgoCD | Multi-stage builds, GitOps, chaos experiments |
| CI/CD | GitHub Actions (6 workflows) | Guard functions, security scanning, release pipeline |

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

## Project Commands

```bash
pnpm install                       # Install dependencies
pnpm build                         # Build all packages
pnpm test                          # Run unit tests
pnpm verify:guards                 # Full guard chain (typecheck + lint + test)
scripts/setup-local.sh             # Create k3d cluster + ArgoCD + Chaos Mesh + monitoring
scripts/run-k8s-e2e-test.sh       # Full E2E: simulator, monitoring, scaling, chaos
scripts/run-k8s-chaos-e2e.sh      # Chaos + scaling tests only (requires port-forwards)
scripts/run-chaos-test.sh          # 25-min orchestrated chaos sequence
scripts/run-autoscale-test.sh      # HPA autoscaling ramp test
scripts/teardown-local.sh          # Tear down k3d cluster
pnpm test:alerts                   # Validate Prometheus alert rules
pnpm typespec:compile              # Compile TypeSpec → OpenAPI
```

## CI/CD Pipeline

Fully validated GitHub Actions pipeline (6 PRs merged, all passing):

| Workflow | Trigger | Jobs |
| -------- | ------- | ---- |
| **CI** | PR to main | Guard functions (typecheck → lint → test), affected-package matrix |
| **Security** | PR to main | pnpm audit, Trivy filesystem scan, gitleaks, Spectral OpenAPI lint |
| **CI Quality** | PR to main | Spec drift detection, context file lint, property test coverage, alert rule tests |
| **K8s E2E** | PR to main | K8s manifest validation (kustomize build) |
| **Release** | Push to main | Multi-arch Docker build, Trivy image scan, ghcr.io publish, Kustomize tag update |
| **Version Packages** | Push to main | Changesets version PR automation |

PR pipeline completes in ~3 minutes. All K8s workloads run with security contexts (non-root, seccomp, drop ALL capabilities).

### Container Images

The release pipeline builds, scans (Trivy), and publishes a multi-arch (amd64 + arm64) container image to GitHub Container Registry on every merge to main:

```text
ghcr.io/r-irbe/octupus-crawler/api-gateway:latest
ghcr.io/r-irbe/octupus-crawler/worker-service:latest
ghcr.io/r-irbe/octupus-crawler/scheduler-service:latest
```

> **Note**: Currently all three images are built from the same Dockerfile and entrypoint (`packages/application-lifecycle/src/main.ts`) — the crawler runs as a monolith. The separate image names prepare for the planned microservice split (API gateway, fetch workers, URL scheduler) per ADR-015. The K8s Deployment (`ipf-crawler`) uses the `worker-service` image via Kustomize image mapping.

SHA-tagged images are also published for pinned deployments. Kustomize overlays are automatically updated with new image tags, triggering ArgoCD auto-sync.

## Documentation

- **[Load Testing & Chaos Engineering Guide](docs/LOAD-TESTING.md)** — Full guide: mega simulator, k6 profiles, Chaos Mesh, autoscaling, Grafana dashboards
- **Architecture Decision Records**: `docs/adr/` — 22 ADRs covering every major technical decision
- **Feature Specifications**: `docs/specs/` — 23 features with requirements (EARS format), design, and task tracking
- **Architectural Review**: `docs/architecture-review-2026-03-31.md` — multi-perspective RALPH review
- **Worklogs**: `docs/worklogs/` — 72 chronological session logs
