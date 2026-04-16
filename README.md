# IPF — Distributed Web Crawler

Horizontally-scalable web crawler. TypeScript, BullMQ workers, hexagonal architecture, real-infrastructure testing.

Crawls URLs via a priority queue, enforces per-domain rate limits, validates every redirect against RFC 6890 SSRF ranges, and stores results in PostgreSQL + S3. Workers scale independently behind circuit breakers. All errors are typed (`Result<T, E>`), never thrown.

## Quick Start

```bash
pnpm install && pnpm build
pnpm test              # 1100+ tests, no infra needed
pnpm verify:guards     # typecheck + lint + test
```

## Run It

```bash
# Docker Compose — full stack in one command
docker compose -f infra/docker/docker-compose.dev.yml --profile demo up

# Kubernetes (k3d) — production-like with autoscaling + chaos testing
scripts/setup-local.sh
scripts/run-k8s-e2e-test.sh
scripts/teardown-local.sh
```

See [Getting Started](docs/GETTING-STARTED.md) for details, port forwards, and what to observe.

## What makes this different

| Problem | Solution |
| ------- | -------- |
| Redirects can hit internal IPs | SSRF validation on every hop (RFC 6890) |
| One failing domain blocks others | Per-domain circuit breakers (cockatiel) |
| Redis/DB failures crash workers | `Result<T, E>` types force error handling at every call site |
| Unit tests prove nothing about infra | Testcontainers — real Redis, PostgreSQL, MinIO. Zero mocks. |
| 7 test pages hide real problems | Mega simulator: 1000 domains × 50K pages with injected chaos |

## Commands

```bash
pnpm test                          # Unit tests
pnpm verify:guards                 # Full guard chain
pnpm test:alerts                   # Prometheus alert rules
pnpm typespec:compile              # TypeSpec → OpenAPI
scripts/setup-local.sh             # Create k3d cluster
scripts/run-k8s-e2e-test.sh        # Full E2E (simulator + monitoring + scaling + chaos)
scripts/run-chaos-test.sh          # 25-min chaos sequence
scripts/run-autoscale-test.sh      # HPA scaling ramp
scripts/teardown-local.sh          # Tear down cluster
```

## Docs

| Doc | Content |
| --- | ------- |
| [Architecture](docs/ARCHITECTURE.md) | Design, hexagonal layout, API, tech stack, CI/CD, testing |
| [Getting Started](docs/GETTING-STARTED.md) | Docker Compose, k3d setup, mega simulator, load/chaos testing |
| [Load Testing](docs/LOAD-TESTING.md) | k6 profiles, Chaos Mesh, autoscaling, Grafana dashboards |
| [ADRs](docs/adr/) | 22 architecture decision records |
| [Specs](docs/specs/) | 22 feature specs (requirements, design, tasks) |
| [Architecture Review](docs/architecture-review-2026-03-31.md) | Multi-perspective RALPH review |
