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
docker compose -f infra/docker/docker-compose.dev.yml up
```

This starts the full stack:

| Service | Port | Purpose |
|---------|------|---------|
| Crawler | 9090, 8081 | Metrics + health endpoints |
| PostgreSQL | 5432 | Crawl metadata storage |
| MinIO | 9000, 9001 | S3-compatible page content |
| Dragonfly | 6379 | Redis-compatible state store |
| Prometheus | 9091 | Metrics scraping + alerting |
| Grafana | 3000 | Dashboards (no auth in dev) |

### Run on Local Kubernetes (k3d)

```bash
pnpm k8s:setup     # Create k3d cluster + install ArgoCD
pnpm k8s:build     # Build and push Docker image
pnpm k8s:e2e       # Run E2E tests against the cluster
pnpm k8s:teardown  # Tear down cluster
```

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

```
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

```
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

```
apps/
  api-gateway/              # Fastify + tRPC HTTP API
packages/
  core/                     # Domain types, errors, contracts (zero deps)
  config/                   # Zod-validated environment config
  database/                 # PostgreSQL (Drizzle) + S3 (MinIO) repositories
  redis/                    # Redis connection, streams, pub/sub, circuit breaker
  job-queue/                # BullMQ adapters (queue, consumer, DLQ)
  http-fetching/            # HTTP client with SSRF guard, retry, politeness
  url-frontier/             # URL priority queue + SHA-256 deduplication
  crawl-pipeline/           # URL normalization, link discovery, pipeline stages
  ssrf-guard/               # RFC 6890 IP validation, DNS pinning, per-hop SSRF checks
  resilience/               # Circuit breaker, retry, timeout, token bucket, bulkhead
  worker-management/        # Job consumer adapter, utilization tracking
  completion-detection/     # Crawl completion via control plane + leader election
  application-lifecycle/    # Startup orchestration, graceful shutdown
  observability/            # OpenTelemetry + Pino + Prometheus metrics
  api-router/               # tRPC router, Zod schemas, domain events
  testing/                  # Testcontainers, generators, web simulator, E2E helpers
  virtual-memory/           # Context budgeting for AI agent workflows
  eslint-config/            # Shared strict ESLint configuration
infra/
  docker/                   # Dockerfile (multi-stage) + docker-compose.dev.yml
  k8s/                      # Kustomize base + overlays (dev/staging/prod/e2e)
```

---

## Key Design Decisions

Each decision is documented as an Architecture Decision Record (ADR) in `docs/adr/`.

### Error Handling — `neverthrow` Result Types

Domain errors use `Result<T, DomainError>` (not thrown exceptions). Errors are discriminated unions:

```typescript
type FetchError =
  | { kind: 'timeout'; url: string; ms: number }
  | { kind: 'network'; url: string; cause: string }
  | { kind: 'ssrf_blocked'; url: string; ip: string }
  | { kind: 'too_many_redirects'; url: string; count: number }
  // ... 5 more variants
```

`try/catch` is only used at infrastructure boundaries (HTTP handlers, database adapters).

### SSRF Protection — Per-Hop Validation

Every HTTP redirect is validated against RFC 6890 reserved IP ranges before following. This prevents attackers from using redirects to reach internal services:

```
Client → example.com → 302 → http://169.254.169.254/metadata → BLOCKED
```

The SSRF guard validates: private IPs, loopback, link-local, CGNAT, IPv4-mapped IPv6, multicast, and broadcast ranges. Verified with property-based tests (fast-check).

### Resilience — 7-Layer Stack

Built on `cockatiel` (ADR-009):

1. **Circuit Breaker** — trips open after N failures, half-open recovery
2. **Retry** — exponential backoff with jitter
3. **Timeout** — cooperative cancellation
4. **Bulkhead** — concurrency limits per domain
5. **Token Bucket** — rate limiting
6. **Sliding Window Rate Limiter** — Redis Lua for distributed rate limiting
7. **Fallback** — degraded mode with metrics

### TypeScript Strict Mode

```json
{
  "strict": true,
  "exactOptionalPropertyTypes": true,
  "noUncheckedIndexedAccess": true,
  "noImplicitOverride": true
}
```

Zero `any` types across the entire codebase — enforced by ESLint as an error. All external input validated with Zod schemas. Array/map access returns `T | undefined`.

### Testing Strategy

| Type | Count | Framework | Infrastructure |
|------|-------|-----------|---------------|
| Unit | 129 | Vitest | None — pure logic |
| Integration | 26 | Vitest + Testcontainers | Real Redis, PostgreSQL, MinIO |
| Property | 7 suites | fast-check | None — invariant checking |
| E2E | 18 | Vitest + k3d | Full Kubernetes cluster |
| **Total** | **180** | | |

**Zero mock infrastructure** — integration tests use real containers (Testcontainers), never `vi.mock('redis')`. Property tests verify invariants of critical algorithms (circuit breaker state transitions, retry backoff, token bucket capacity, SSRF IP range coverage, URL normalization idempotence).

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
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

Contract-first design (OpenAPI 3.1 at `openapi.yaml`, TypeSpec source at `specs/`).

```
POST   /api/v1/crawls              Create a crawl session
GET    /api/v1/crawls/:id          Get crawl status
GET    /api/v1/crawls/:id/results  Get crawl results
DELETE /api/v1/crawls/:id          Cancel a crawl

GET    /health                     Liveness probe
GET    /readyz                     Readiness probe (checks DB + Redis)
GET    /metrics                    Prometheus metrics
```

Internal services communicate via tRPC (end-to-end typed, no codegen needed).

---

## Observability

- **Logging**: Pino (structured JSON), request-scoped via AsyncLocalStorage
- **Metrics**: Prometheus with 12 alert rules (fetch errors, queue depth, memory, latency)
- **Tracing**: OpenTelemetry SDK with context propagation across services
- **Dashboards**: Grafana (auto-provisioned in dev via Docker Compose)

Alert rules are tested with `promtool` (`pnpm test:alerts`).

---

## Project Commands

```bash
pnpm install                 # Install dependencies
pnpm build                   # Build all packages
pnpm test                    # Run unit tests
pnpm lint                    # ESLint (strict mode)
pnpm typecheck               # TypeScript type checking

pnpm verify:guards           # Full guard chain (typecheck + lint + test)

pnpm k8s:setup               # Create local k3d cluster
pnpm k8s:build               # Build + push Docker image
pnpm k8s:e2e                 # Run E2E tests on cluster
pnpm k8s:teardown            # Tear down cluster

pnpm k6:load                 # Load test (throughput)
pnpm k6:backpressure         # Load test (backpressure)

pnpm test:alerts             # Validate Prometheus alert rules
pnpm typespec:compile        # Compile TypeSpec → OpenAPI
pnpm typespec:lint           # Lint OpenAPI spec
```

---

## Documentation

- **Architecture Decision Records**: `docs/adr/` — 22 ADRs covering every major technical decision
- **Feature Specifications**: `docs/specs/` — 22 features with requirements (EARS format), design, and task tracking
- **Architectural Review**: `docs/architecture-review-2026-03-31.md` — comprehensive multi-perspective review
- **Worklogs**: `docs/worklogs/` — chronological session logs of all implementation work
