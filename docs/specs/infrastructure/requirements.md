# Infrastructure — Requirements

> EARS-format requirements for container images, orchestration, state store, monitoring, and environment.
> Source: [REQUIREMENTS-AGNOSTIC.md](../../research/REQUIREMENTS-AGNOSTIC.md) §10

---

## 1. Container Image

**REQ-INFRA-001** (Ubiquitous)
The application shall be packaged as an OCI-compliant container image using multi-stage builds to minimize final image size.

**REQ-INFRA-002** (Ubiquitous)
The container shall run as a non-root user.

**REQ-INFRA-003** (Ubiquitous)
A `.dockerignore` shall exclude build artifacts, documentation, and dev-only files.

### Acceptance Criteria — Container Image

```gherkin
Given the Dockerfile
When the image is built
Then the final stage runs as a non-root user
And the image size is less than 200MB

Given the .dockerignore
When docker build runs
Then node_modules, docs/, and .git/ are excluded from the context
```

## 2. Orchestration

**REQ-INFRA-004** (Ubiquitous)
The container orchestrator shall support running multiple worker replicas.

**REQ-INFRA-005** (Ubiquitous)
A liveness probe shall check HTTP `/health` at the configured metrics port.

**REQ-INFRA-006** (Ubiquitous)
A readiness probe shall check HTTP `/readyz` at the configured metrics port.

**REQ-INFRA-007** (Ubiquitous)
The orchestrator shall provide a restart policy that restarts on non-zero exit codes.

**REQ-INFRA-008** (Ubiquitous)
Resource limits (CPU, memory) shall be configurable per container.

### Acceptance Criteria — Orchestration

```gherkin
Given a Kubernetes deployment
When the readiness probe fails
Then traffic is not routed to the pod until recovery

Given a container exiting with code 1
When the orchestrator detects the exit
Then the container is restarted per restart policy
```

## 3. State Store (Redis/Dragonfly)

**REQ-INFRA-009** (Ubiquitous)
The state store shall persist data beyond container restarts (volume mount or appendonly mode).

**REQ-INFRA-010** (Ubiquitous)
The state store shall expose a health endpoint verifiable by orchestration probes.

**REQ-INFRA-011** (Ubiquitous)
Connection parameters (host, port, password, TLS) shall be configurable via environment variables.

### Acceptance Criteria — State Store

```gherkin
Given a Redis/Dragonfly container with appendonly=yes
When the container restarts
Then previously enqueued jobs are still present

Given REDIS_URL environment variable
When the application connects
Then it uses the provided connection parameters
```

## 4. Monitoring System

**REQ-INFRA-012** (Ubiquitous)
A Prometheus instance shall scrape the metrics endpoint of all crawler instances.

**REQ-INFRA-013** (Ubiquitous)
A Grafana instance shall provide pre-configured dashboards for crawler metrics.

**REQ-INFRA-014** (Ubiquitous)
Alert rules shall be loadable into the monitoring system from configuration files.

### Acceptance Criteria — Monitoring

```gherkin
Given a running Prometheus instance
When scrape interval elapses
Then metrics from all crawler pod targets are collected

Given Grafana with provisioned dashboards
When a user opens the crawler dashboard
Then all 8 metrics are displayed with panels
```

## 5. Environment & Configuration

**REQ-INFRA-015** (Ubiquitous)
All environment variables shall be documented in a reference table with name, type, default, and description.

**REQ-INFRA-016** (Ubiquitous)
Secrets (REDIS_URL containing passwords) shall be injected via Kubernetes Secrets, not plain ConfigMaps.

**REQ-INFRA-017** (Ubiquitous)
A local development environment shall be reproducible via `docker compose up` with a single command.

**REQ-INFRA-018** (Ubiquitous)
Environment variable names shall follow SCREAMING_SNAKE_CASE convention.

**REQ-INFRA-019** (Ubiquitous)
The `docker-compose.dev.yml` shall include crawler, Redis/Dragonfly, Prometheus, and Grafana services.

**REQ-INFRA-020** (Ubiquitous)
Prometheus data shall persist across container restarts via a named volume.

**REQ-INFRA-021** (Ubiquitous)
All runbook URLs referenced by alert annotations (REQ-ALERT-017) shall have corresponding runbook documents in the repository under `docs/runbooks/`.

### Acceptance Criteria — Persistence & Runbooks

```gherkin
Given Prometheus is running with a named volume
When the Prometheus container restarts
Then previously scraped metrics data is still available

Given an alert rule with runbook_url annotation
When the URL path is resolved against the repository
Then a corresponding runbook document exists in docs/runbooks/
```

### Environment Variable Reference Table

| Variable | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `REDIS_URL` | string (URL) | Yes | — | Redis/Dragonfly connection URL (redis://host:port) |
| `METRICS_PORT` | number | Yes | — | Port for metrics/health/readyz HTTP server |
| `SEED_URLS` | string (CSV) | Yes | — | Comma-separated list of initial crawl URLs |
| `MAX_DEPTH` | number | Yes | — | Maximum crawl depth from seed URLs |
| `MAX_CONCURRENT_FETCHES` | number | Yes | — | Worker concurrency (parallel jobs) |
| `FETCH_TIMEOUT_MS` | number | Yes | — | HTTP fetch timeout in milliseconds |
| `POLITENESS_DELAY_MS` | number | Yes | — | Minimum delay between requests to same domain |
| `MAX_RETRIES` | number | Yes | — | Maximum retry attempts for failed jobs |
| `NODE_ENV` | string | No | `development` | Runtime environment (development, production) |
| `LOG_LEVEL` | string | No | `info` | Logger severity (debug, info, warn, error, fatal) |
| `WORKER_ID` | string | No | auto-generated | Unique worker identifier for correlation |
| `USER_AGENT` | string | No | product default | HTTP User-Agent header value |
| `ALLOW_PRIVATE_IPS` | boolean | No | `false` | Bypass SSRF blocking (testing only) |
| `MAX_REDIRECTS` | number | No | `5` | Maximum redirect hops |
| `MAX_RESPONSE_BYTES` | number | No | `10485760` | Maximum response body size (10 MiB) |
| `ALLOWED_DOMAINS` | string (CSV) | No | `null` | Domain allow-list (null = all domains) |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | string (URL) | No | — | OpenTelemetry collector endpoint |
| `DNS_FAIL_POLICY` | string | No | `open` | DNS failure behavior: open (allow) or closed (block) |

### Acceptance Criteria — Environment

```gherkin
Given a fresh checkout of the repository
When the developer runs "docker compose -f docker-compose.dev.yml up"
Then all services start (crawler, redis, prometheus, grafana)
And the crawler connects to redis and begins processing

Given a Kubernetes deployment
When secrets are configured via External Secrets Operator
Then REDIS_URL is injected from K8s Secrets, not ConfigMap

Given Prometheus with a named volume
When the Prometheus container restarts
Then previously collected metrics are still available
```

---

## Traceability Matrix

| Requirement | Source | Priority | Test Type |
| --- | --- | --- | --- |
| REQ-INFRA-001 | §10.1 | MUST | Build verification |
| REQ-INFRA-002 | §10.1 | MUST | Build verification |
| REQ-INFRA-003 | §10.1 | SHOULD | Build verification |
| REQ-INFRA-004 | §10.2 | MUST | E2E |
| REQ-INFRA-005 | §10.2 | MUST | Integration |
| REQ-INFRA-006 | §10.2 | MUST | Integration |
| REQ-INFRA-007 | §10.2 | MUST | E2E |
| REQ-INFRA-008 | §10.2 | SHOULD | E2E |
| REQ-INFRA-009 | §10.3 | MUST | Integration |
| REQ-INFRA-010 | §10.3 | MUST | Integration |
| REQ-INFRA-011 | §10.3 | MUST | Unit |
| REQ-INFRA-012 | §10.4 | MUST | E2E |
| REQ-INFRA-013 | §10.4 | SHOULD | Manual |
| REQ-INFRA-014 | §10.4 | MUST | Build verification |
| REQ-INFRA-015 | §10.5 | MUST | Documentation |
| REQ-INFRA-016 | §10.5 | MUST | E2E |
| REQ-INFRA-017 | §10.5 | MUST | Build verification |
| REQ-INFRA-018 | §10.5 | SHOULD | Lint |
| REQ-INFRA-019 | §10.5 | MUST | Build verification |
| REQ-INFRA-020 | §10.4 | MUST | Integration |
| REQ-INFRA-021 | §10 (runbooks) | MUST | Documentation |

---

> **Provenance**: Created 2026-03-25 from REQUIREMENTS-AGNOSTIC.md §10. EARS conversion per ADR-020. Updated 2026-03-25: added REQ-INFRA-020–021, env var reference table per PR Review Council findings.
