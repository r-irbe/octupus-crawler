# Observability — Requirements

> EARS-format requirements for structured logging, metrics, metrics server, and distributed tracing.
> Source: [REQUIREMENTS-AGNOSTIC.md](../../research/REQUIREMENTS-AGNOSTIC.md) §7

---

## 1. Structured Logging

**REQ-OBS-001** (Ubiquitous)
The Logger contract shall provide five severity methods: `debug`, `info`, `warn`, `error`, `fatal`.

**REQ-OBS-002** (Ubiquitous)
The Logger shall provide a `child(bindings)` method returning a new Logger with merged context bindings, chainable to arbitrary depth.

**REQ-OBS-003** (Ubiquitous)
The production logger shall output structured (e.g., JSON/ndjson) log records with ISO 8601 timestamps and configurable initial bindings.

**REQ-OBS-004** (Event-driven)
When a job is processed, the system shall create a per-job child logger carrying `jobId`, `url`, and `depth` correlation fields.

**REQ-OBS-005** (Optional feature)
Where distributed tracing is enabled, the system shall inject trace context (trace ID, span ID) into every log record.

**REQ-OBS-006** (Ubiquitous)
Unique request IDs shall be generated for HTTP requests for correlation.

**REQ-OBS-007** (Ubiquitous)
A null/no-op Logger implementation shall be provided for use in tests.

### Acceptance Criteria — Logging

```gherkin
Given a production logger with bindings {service: "worker", workerId: "w1"}
When logger.child({jobId: "j1"}).info("fetched") is called
Then the output is a JSON record with service, workerId, jobId, level, msg, and ISO 8601 timestamp

Given a test environment
When the null logger is used
Then no output is produced and no errors occur
```

## 2. Metrics

**REQ-OBS-008** (Ubiquitous)
The CrawlMetrics contract shall abstract all metric recording behind a technology-neutral interface.

**REQ-OBS-009** (Ubiquitous)
The system shall record a `fetches_total` counter with `status` and `error_kind` labels.

**REQ-OBS-010** (Ubiquitous)
The system shall record a `fetch_duration_seconds` histogram with configurable buckets (default: `[0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]`). Duration shall only be recorded when `> 0`.

**REQ-OBS-011** (Event-driven)
When URLs are discovered during parsing, the system shall increment `urls_discovered_total` (only when count > 0).

**REQ-OBS-012** (Ubiquitous)
The system shall maintain a `frontier_size` gauge.

**REQ-OBS-013** (Ubiquitous)
The system shall maintain a `stalled_jobs_total` counter.

**REQ-OBS-014** (Ubiquitous)
The system shall maintain an `active_jobs` gauge.

**REQ-OBS-015** (Ubiquitous)
The system shall maintain a `worker_utilization_ratio` gauge (`[0.0, 1.0]`).

**REQ-OBS-016** (Ubiquitous)
The system shall maintain a `coordinator_restarts_total` counter.

**REQ-OBS-017** (Ubiquitous)
Per-process metric registry isolation shall prevent metric-name collisions in multi-instance deployments.

**REQ-OBS-018** (Ubiquitous)
A null/no-op Metrics implementation shall be provided for use in tests.

### Acceptance Criteria — Metrics

```gherkin
Given a successful fetch of 0.5s duration
When metrics are recorded
Then fetches_total{status="success"} is incremented
And fetch_duration_seconds observes 0.5

Given two worker processes in the same deployment
When both register metrics
Then their registries are isolated (no name collisions)
```

## 3. Metrics Server

**REQ-OBS-019** (Ubiquitous)
The system shall serve `GET /metrics` returning metrics in a standard exposition format.

**REQ-OBS-020** (Ubiquitous)
The system shall serve `GET /health` returning a liveness status with a timestamp.

**REQ-OBS-021** (Ubiquitous)
The system shall serve `GET /readyz` returning readiness status. The readiness check should verify state-store connectivity.

**REQ-OBS-022** (Unwanted behaviour)
If an unknown path is requested, then the server shall return 404. If a handler fails, then the server shall return 500 with a generic error body (no internal details leaked).

### Acceptance Criteria — Metrics Server

```gherkin
Given the metrics server is running
When GET /metrics is called
Then status 200 is returned with metrics in exposition format

When GET /health is called
Then status 200 with {"status": "ok", "timestamp": "..."} is returned

When GET /unknown is called
Then status 404 is returned
```

## 4. Distributed Tracing

**REQ-OBS-023** (Optional feature)
Where tracing is configured, the system shall export traces to a configurable trace exporter endpoint.

**REQ-OBS-024** (Optional feature)
Where tracing is enabled, the system shall automatically instrument HTTP requests. It should also instrument the job queue for cross-job trace propagation.

**REQ-OBS-025** (Ubiquitous)
A pluggable trace exporter shall be available for tests (e.g., in-memory exporter).

**REQ-OBS-026** (Ubiquitous)
Tracer shutdown shall be non-throwing: exceptions are caught and logged at error level.

### Acceptance Criteria — Tracing

```gherkin
Given tracing is enabled with an OTLP endpoint
When an HTTP fetch is performed
Then a span is created with the fetch URL and duration

Given a tracer shutdown is triggered
When the exporter throws an error
Then the error is caught and logged, not propagated
```

---

## Traceability Matrix

| Requirement | Source | Priority | Test Type |
| --- | --- | --- | --- |
| REQ-OBS-001 | §7.1 | MUST | Unit |
| REQ-OBS-002 | §7.1 | MUST | Unit |
| REQ-OBS-003 | §7.1 | MUST | Integration |
| REQ-OBS-004 | §7.1 | MUST | Unit |
| REQ-OBS-005 | §7.1 | SHOULD | Integration |
| REQ-OBS-006 | §7.1 | MUST | Unit |
| REQ-OBS-007 | §7.1 | MUST | Unit |
| REQ-OBS-008 | §7.2 | MUST | Unit |
| REQ-OBS-009 | §7.2 | MUST | Unit |
| REQ-OBS-010 | §7.2 | MUST | Unit |
| REQ-OBS-011 | §7.2 | MUST | Unit |
| REQ-OBS-012 | §7.2 | MUST | Unit |
| REQ-OBS-013 | §7.2 | MUST | Unit |
| REQ-OBS-014 | §7.2 | MUST | Unit |
| REQ-OBS-015 | §7.2 | MUST | Unit |
| REQ-OBS-016 | §7.2 | MUST | Unit |
| REQ-OBS-017 | §7.2 | MUST | Integration |
| REQ-OBS-018 | §7.2 | MUST | Unit |
| REQ-OBS-019 | §7.3 | MUST | Integration |
| REQ-OBS-020 | §7.3 | MUST | Integration |
| REQ-OBS-021 | §7.3 | MUST | Integration |
| REQ-OBS-022 | §7.3 | MUST | Integration |
| REQ-OBS-023 | §7.4 | SHOULD | Integration |
| REQ-OBS-024 | §7.4 | SHOULD | Integration |
| REQ-OBS-025 | §7.4 | MUST | Unit |
| REQ-OBS-026 | §7.4 | MUST | Unit |

---

> **Provenance**: Created 2026-03-25 from REQUIREMENTS-AGNOSTIC.md §7. EARS conversion per ADR-020.
