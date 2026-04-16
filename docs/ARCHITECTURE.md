# Architecture

## Design

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

## Hexagonal Architecture

Domain layer has zero infrastructure dependencies. External concerns sit behind port interfaces:

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

## Monorepo Layout

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
  api-router/ testing/         # tRPC router + Testcontainers helpers
  eslint-config/               # Shared ESLint config
infra/
  docker/                      # Dockerfile + docker-compose.dev.yml
  k8s/                         # Kustomize base + overlays (dev/staging/prod/e2e)
  prometheus/ monitoring/      # Alert rules, Grafana dashboards
```

## Key Decisions

Each decision has an ADR in `docs/adr/`. Highlights:

- **Error Handling** — `neverthrow` `Result<T, DomainError>` with discriminated unions (9 `FetchError` variants). `try/catch` only at infrastructure boundaries.
- **SSRF Protection** — Every HTTP redirect validated against RFC 6890 reserved IP ranges. Blocks private IPs, loopback, link-local, CGNAT, IPv4-mapped IPv6. Verified with property-based tests.
- **Resilience** — 7-layer `cockatiel` stack: circuit breaker, retry (exponential + jitter), timeout, bulkhead, token bucket, Redis Lua sliding window, fallback.
- **TypeScript Strict** — `strict: true`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`. Zero `any` (ESLint error). All input validated with Zod.

## API

Contract-first (OpenAPI 3.1 + TypeSpec). Internal services use tRPC.

```text
POST   /api/v1/crawls              Create a crawl session
GET    /api/v1/crawls/:id          Get crawl status
GET    /api/v1/crawls/:id/results  Get crawl results
DELETE /api/v1/crawls/:id          Cancel a crawl
GET    /health                     Liveness probe
GET    /readyz                     Readiness probe
GET    /metrics                    Prometheus metrics
```

## Observability

```text
Crawler Pods ──► Prometheus ──► Grafana (7 dashboards, 12 alert rules)
             ──► Jaeger     ──► Grafana (trace analytics, latency heatmap)
             ──► Loki       ──► Grafana (log explorer, error analysis)
                    ▲
                    └── Full correlation: traceId links logs ↔ traces ↔ metrics
```

Seven auto-provisioned Grafana dashboards:

| Dashboard | Purpose |
| --------- | ------- |
| Crawler Overview | Fetch rate, error %, latency P50/P95/P99 |
| Scenario Timeline | Throughput + event annotations (k6, chaos, ArgoCD) |
| Chaos Events | MTTR, circuit breaker state, pod restarts |
| Infrastructure Health | CPU/memory, Redis, PostgreSQL, ArgoCD sync |
| Alert Status | Firing alerts, history, evaluation rate |
| Trace Analytics | Latency heatmap, P99 by operation, trace search |
| Log Explorer | Live tail, error patterns, traceId → Jaeger |

## Testing

| Type | Count | Framework | What It Proves |
| ---- | ----- | --------- | -------------- |
| Unit | 880+ | Vitest | Pure logic correctness |
| Integration | 150+ | Vitest + Testcontainers | Real Redis/PG/MinIO behavior |
| Property | 80+ | fast-check | Invariants hold for all inputs |
| E2E | 25+ | k3d + scripts | Full K8s: pods, services, health |
| Load | 3 | k6 | Throughput, backpressure, sustained crawl |
| Chaos | 5 CRDs | Chaos Mesh | Pod kill, network partition, CPU stress, DNS failure |

Zero mock infrastructure. Integration tests use real containers (Testcontainers). Property tests cover circuit breaker state transitions, SSRF IP range coverage, URL normalization idempotence.

## Tech Stack

| Layer | Technology |
| ----- | ---------- |
| Runtime | Node.js 22, TypeScript 6.0 |
| Monorepo | Turborepo + pnpm |
| HTTP API | Fastify 5 + tRPC 11 |
| Job Queue | BullMQ 5 (Redis-backed) |
| Database | PostgreSQL 16 (Drizzle) |
| Object Storage | MinIO (S3-compatible) |
| Cache/State | Dragonfly (Redis-compatible) |
| Resilience | cockatiel |
| Error Handling | neverthrow |
| Observability | OTel + Pino + Prometheus + Loki |
| Testing | Vitest + Testcontainers + fast-check + k6 + Chaos Mesh |
| Deployment | Docker + Kustomize + k3d + ArgoCD |
| CI/CD | GitHub Actions (6 workflows) |

## CI/CD

| Workflow | Trigger | Purpose |
| -------- | ------- | ------- |
| CI | PR | Guard functions (typecheck → lint → test) |
| Security | PR | pnpm audit, Trivy, gitleaks, Spectral |
| CI Quality | PR | Spec drift, context lint, property coverage, alert tests |
| K8s E2E | PR | Kustomize manifest validation |
| Release | Push to main | Multi-arch Docker build, Trivy scan, ghcr.io publish |
| Version Packages | Push to main | Changesets version PR |

Container images published to `ghcr.io/r-irbe/octupus-crawler/crawler:{latest,sha-<commit>}`. Kustomize overlays auto-update, triggering ArgoCD sync.
