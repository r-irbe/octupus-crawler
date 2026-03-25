# Software Requirements Specification (Technology-Agnostic)

**Distributed Web Crawler**

> This document specifies *what* the system must do and *how well* it must do it, without mandating any particular technology, framework, or library. Any architecture that satisfies these requirements is a valid implementation.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architectural Requirements](#2-architectural-requirements)
3. [Core Crawl Pipeline Requirements](#3-core-crawl-pipeline-requirements)
4. [Security Requirements](#4-security-requirements)
5. [HTTP Fetching Requirements](#5-http-fetching-requirements)
6. [Distributed System Requirements](#6-distributed-system-requirements)
7. [Observability Requirements](#7-observability-requirements)
8. [Application Lifecycle Requirements](#8-application-lifecycle-requirements)
9. [Alerting Requirements](#9-alerting-requirements)
10. [Infrastructure & Deployment Requirements](#10-infrastructure--deployment-requirements)
11. [Testing & Quality Requirements](#11-testing--quality-requirements)
12. [Gap Analysis & Improvement Recommendations](#12-gap-analysis--improvement-recommendations)

---

## 1. Executive Summary

### 1.1 Project Purpose

This document specifies the software requirements for a distributed web crawler system developed as a take-home programming test for IP Fabric. The assignment calls for building a web crawler that demonstrates **horizontal scalability**, with particular emphasis on how the system might operate across a grid of machines.

The system serves as both a functional crawler and an architectural proof-of-concept, demonstrating production-grade patterns for distributed job coordination, fault tolerance, and observability.

### 1.2 Solution Characteristics

The solution is a horizontally scalable web crawler following a **clean-architecture** pattern with strict dependency boundaries. The design is fully symmetric: every node seeds the frontier, processes crawl jobs, and participates in distributed completion detection. There is **no designated coordinator** — any node can join or leave the cluster without special orchestration.

Key properties:

- **Decentralized coordination** — all workers are peers; consensus-free completion detection via distributed counters and atomic operations in the shared state store.
- **Fault tolerance** — the system tolerates worker crashes (stalled-job recovery), transient state-store outages (reconnection with backoff), and duplicate URL discoveries (atomic deduplication at the frontier).
- **Clean dependency boundaries** — domain logic is isolated from infrastructure concerns (HTTP clients, queue backends, storage), enabling testability and future substitution of components.

### 1.3 Scope

The system encompasses the following functional and operational areas:

- **URL frontier management** — distributed queue with priority scheduling, atomic deduplication, and depth limiting.
- **HTTP fetching** — politeness enforcement (per-host rate limiting), SSRF protection, and configurable timeouts.
- **Link extraction** — HTML parsing with URL normalization, same-domain filtering, and fragment removal.
- **Distributed job coordination** — work distribution, stalled-job recovery, graceful shutdown, and quiescent-state completion detection.
- **Observability** — metrics exposition, distributed tracing, and structured logging.
- **Deployment** — container orchestration with multi-worker scaling, health checks, and resource constraints.
- **Alerting** — alert rules covering queue depth, error rates, worker health, and state-store connectivity.

---

## 2. Architectural Requirements

### 2.1 Clean Architecture with Dependency Inversion

**REQ-ARCH-001: Layered Structure with Strict Dependency Direction**
The system SHALL follow a clean architecture with at minimum four conceptual layers:

| Layer | Responsibility |
|---|---|
| **Contracts** | Abstract interface definitions (type-only contracts with no runtime code) |
| **Core / Domain** | Domain logic, error types, URL normalization, crawl pipeline |
| **Infrastructure** | Concrete implementations of contracts (HTTP clients, queue adapters, loggers, metrics) |
| **Application** | Orchestration, worker logic, and composition root |

The core domain SHALL never depend on concrete infrastructure implementations. All inter-layer communication crosses contract boundaries. The dependency graph is strictly inward: infrastructure and application depend on contracts and core; core depends only on contracts; contracts depend on nothing outside domain types.

**REQ-ARCH-002: Contracts as a Pure Type Boundary**
The contracts layer SHALL be a pure type boundary containing zero runtime code. It SHALL define only interface or type-level constructs.

The following contracts are required:

| Contract | Responsibility |
|---|---|
| `Frontier` | Manages the URL frontier: enqueue, dequeue, size queries, deduplication |
| `Fetcher` | Fetches a URL and returns a typed result-or-error |
| `Logger` | Structured logging with severity levels and child-logger support |
| `CrawlMetrics` | Records crawl metrics (fetch counts, durations, discovery counts, etc.) |
| `JobEventSource` | Subscribes to job lifecycle events (completed, failed, stalled) |
| `JobConsumer` | Consumes and processes jobs from the work queue |
| `LinkExtractor` | Extracts links from HTML content |
| `ControlPlane` | Manages crawl lifecycle (pause, resume, cancel, progress) |

**REQ-ARCH-003: Core Domain Isolation**
The core domain SHALL depend only on contract type imports and its own modules. It SHALL NOT import from infrastructure or application layers.

**REQ-ARCH-004: Infrastructure Independence from Application Layer**
Infrastructure adapters SHALL implement contract interfaces and SHALL NOT import from the application layer. They may depend on core types and contract types.

**REQ-ARCH-005: Application Module Infrastructure Isolation**
Application orchestration modules SHALL NOT import infrastructure adapters or libraries directly. They SHALL depend exclusively on contract types and core exports. Only the composition root is exempt.

**REQ-ARCH-006: Single Composition Root**
There SHALL be exactly one composition root — the sole location where infrastructure adapters are instantiated and wired to contracts. No other module SHALL import the composition root.

The composition root SHALL:
1. Load and validate configuration
2. Instantiate all infrastructure adapters
3. Wire adapters into application modules via dependency injection
4. Register process signal handlers for graceful shutdown
5. Execute a phased shutdown sequence

### 2.2 Dependency Rules (Statically Enforced)

**REQ-ARCH-007: No Circular Dependencies**
The system SHALL have zero circular dependencies across all source and test modules. This constraint SHALL be enforced by static analysis tooling at build time.

The full set of enforced architectural rules:

| Rule | Constraint |
|---|---|
| No circular dependencies | No circular dependency chains anywhere in the dependency graph |
| Contracts must be pure | Contracts layer SHALL NOT import infrastructure, application, or third-party libraries |
| Core depends only on contracts | Core SHALL NOT import infrastructure, application, or third-party infrastructure libraries |
| Infrastructure must not import application | Infrastructure SHALL NOT import application modules |
| Application must not import infrastructure | Application modules (except composition root) SHALL NOT import infrastructure |
| Composition root is not importable | No module SHALL import the composition root |
| No orphan modules | Unreferenced modules are flagged as potential dead code |

**REQ-ARCH-008: Test Boundary Enforcement**
Test helpers SHALL NOT import test suites. Production code SHALL NOT import any test code.

### 2.3 Resource Management

**REQ-ARCH-009: Deterministic Cleanup for Stateful Contracts**
All stateful contracts that hold infrastructure resources (connections, event listeners, background loops) SHALL provide a deterministic cleanup mechanism (e.g., `close()` or disposable pattern). The following contracts require cleanup:

| Contract | Resource Held | Cleanup Responsibility |
|---|---|---|
| Frontier | Queue/store connection | Close connection |
| ControlPlane | State store connection, queue handle | Close connections |
| JobConsumer | Long-poll or subscription loop | Drain in-flight jobs, close consumer |
| JobEventSource | Event stream connection | Close event stream |

**REQ-ARCH-010: Synchronous vs. Asynchronous Contract Signatures**
Synchronous, CPU-bound contracts SHALL use synchronous interfaces. I/O-bound contracts SHALL use asynchronous wrappers with typed error channels.

| Contract | Interface Style | Rationale |
|---|---|---|
| LinkExtractor | Synchronous | Pure CPU-bound HTML parsing; no I/O |
| Logger | Synchronous | Buffered stream write |
| CrawlMetrics | Synchronous | Counter/gauge increment |
| Fetcher | Async with typed error | Network I/O |
| Frontier (enqueue) | Async with typed error | State-store I/O |
| Frontier (size/counts) | Async | State-store I/O |

### 2.4 Error Handling

**REQ-ARCH-011: Typed Error Channel (No Exception-Based Flow)**
The system SHALL use a typed error channel for domain errors. Domain errors SHALL NOT be thrown as exceptions — they SHALL be returned as typed values within a result-or-error wrapper (e.g., `Result<T, E>`, `Either<E, T>`, or equivalent).

Pipeline stages compose via monadic chaining: each stage receives the success output of the previous stage, and any stage failure short-circuits the remainder.

The only locations where exceptions are permitted are: (a) the composition root for fatal startup errors, and (b) the worker where a queue-infrastructure error needs to be re-thrown so the job queue retries the job.

**REQ-ARCH-012: Discriminated Union Error Taxonomy**
All errors SHALL use discriminated unions keyed by a `kind` field. The system defines three error families:

**FetchError** (9 variants):

| `kind` | Trigger |
|---|---|
| `timeout` | Fetch exceeded configured timeout |
| `network` | Generic network failure |
| `http` | Non-success HTTP status code |
| `ssrf_blocked` | SSRF guard blocked a private IP |
| `too_many_redirects` | Redirect chain exceeded limit |
| `body_too_large` | Response body exceeded size limit |
| `dns_resolution_failed` | DNS lookup failure |
| `ssl_error` | TLS/SSL handshake or certificate error |
| `connection_refused` | TCP connection refused by remote host |

**UrlError** (3 variants):

| `kind` | Trigger |
|---|---|
| `invalid_url` | URL parsing or normalization failed |
| `disallowed_scheme` | Non-HTTP(S) scheme detected |
| `empty_url` | Empty string passed to URL processing |

**CrawlError** (superset of the above, plus 3 crawl-specific variants):

| `kind` | Trigger |
|---|---|
| `depth_exceeded` | Entry depth exceeds configured maximum |
| `domain_not_allowed` | Domain not in allow-list |
| `queue_error` | Infrastructure failure during enqueue |

**REQ-ARCH-013: Typed Error Constructors**
The system SHALL provide typed error constructor functions that enforce correct fields at compile time.

### 2.5 Configuration

**REQ-ARCH-014: Environment-Based Configuration with Schema Validation**
All configuration SHALL be loaded from environment variables and validated at startup via a schema validator. Configuration loading SHALL return a typed result-or-error — never throw. On validation failure, it SHALL produce a structured error with a human-readable message.

**REQ-ARCH-015: Interface Segregation for Configuration Consumers**
Consumers SHALL define narrow configuration types containing only the fields they require, relying on structural subtyping to accept any superset (Interface Segregation Principle).

---

## 3. Core Crawl Pipeline Requirements

### 3.1 URL Processing

**REQ-CRAWL-001 — Scheme Restriction**
Only the `http:` and `https:` URI schemes SHALL be permitted. Any URL bearing a different scheme SHALL be rejected with a typed error (`disallowed_scheme`).

**REQ-CRAWL-002 — URL Normalization**
Every accepted URL SHALL be normalized according to the following rules:

| Rule | Behavior |
|---|---|
| Hash fragments | Strip the fragment and its leading `#` |
| `www.` prefix | Do **not** strip; `www.example.com` and `example.com` are distinct |
| Trailing slashes | Remove trailing `/` characters from the path component |
| Root path | Remove a bare `/` path |
| Query parameters | Lexicographically sort query parameters by key |
| Directory index files | Do **not** remove directory index filenames |

The normalized form SHALL be deterministic: identical logical URLs MUST produce identical normalized strings.

**REQ-CRAWL-003 — CrawlUrl Structure**
Each successfully processed URL SHALL produce a structured value containing: `raw` (original string), `normalized` (a branded/newtype form preventing accidental interchange with raw strings at compile time), and `domain` (lowercased hostname).

**REQ-CRAWL-004 — Invalid URL Errors**
Empty and syntactically invalid URLs SHALL produce typed errors (`empty_url`, `invalid_url`) returned through the typed error channel rather than thrown as exceptions.

### 3.2 Pipeline Stages

**REQ-CRAWL-005 — Pipeline Composition**
The crawl pipeline SHALL be composed as a linear chain of four stages:

```
validate → fetch → discover links → enqueue
```

Each stage receives the success output of the previous stage. Any stage failure short-circuits the remainder.

**REQ-CRAWL-006 — Dependency Injection and Testability**
Each pipeline stage SHALL accept its external dependencies via constructor or function parameters. No stage SHALL directly instantiate or import concrete infrastructure.

**REQ-CRAWL-007 — Depth Guard**
During the validate stage, any entry whose `depth` exceeds the configured maximum SHALL be rejected **before** any HTTP request is issued.

**REQ-CRAWL-008 — Domain Allow-List**
When an allow-list is configured, any entry whose domain is not in the list SHALL be rejected **before** any HTTP request is issued.

**REQ-CRAWL-009 — Content-Type Gate for Link Extraction**
Only responses with `text/html` content type SHALL trigger link extraction. Other content types yield an empty set of discovered URLs.

**REQ-CRAWL-010 — Relative URL Resolution**
Relative `href` values SHALL be resolved against the **final URL** of the fetch (after all redirects), not the original request URL.

**REQ-CRAWL-011 — Per-Page Deduplication**
Discovered URLs from a single page SHALL be deduplicated by their normalized form before enqueue.

**REQ-CRAWL-012 — Graceful Handling of Invalid Hrefs**
Any `href` that fails URL parsing or scheme validation SHALL be silently skipped. The pipeline SHALL NOT crash due to a malformed href.

### 3.3 Frontier Entry Metadata

**REQ-CRAWL-013 — FrontierEntry Structure**
Each FrontierEntry SHALL carry: `url` (structured URL), `depth` (non-negative integer), `discoveredBy` (worker identifier), `discoveredAt` (epoch ms), and `parentUrl` (normalized URL or null).

**REQ-CRAWL-014 — Child Depth Calculation**
Discovered URLs SHALL be assigned `depth = parent.depth + 1`. Seed URLs have `depth = 0`.

**REQ-CRAWL-015 — Enqueue Failure Mapping**
Enqueue failures SHALL produce a CrawlError with discriminant `queue_error`.

### 3.4 Fetch Result

**REQ-CRAWL-016 — FetchResult Structure**
Each fetch SHALL produce a FetchResult containing: `requestedUrl`, `finalUrl` (after redirects, null if none), `statusCode`, `contentType`, `body`, `fetchTimestamp`, and `fetchDurationMs`.

---

## 4. Security Requirements

### 4.1 SSRF Protection

| ID | Requirement | Priority |
|---|---|---|
| REQ-SEC-001 | Block outbound requests to private IPv4 ranges: `10.0.0.0/8`, `192.168.0.0/16`, `127.0.0.0/8`, `169.254.0.0/16`, `0.0.0.0/8`, `172.16.0.0/12` | MUST |
| REQ-SEC-002 | Block outbound requests to private IPv6 addresses: `::1`, `::`, `fc00::/7`, `fe80::/10` | MUST |
| REQ-SEC-003 | DNS resolution SHALL be performed and validated against blocked ranges before requests are dispatched | MUST |
| REQ-SEC-004 | SSRF validation SHALL be applied to EVERY redirect hop, not only the initial URL | MUST |
| REQ-SEC-005 | Literal IP addresses SHALL be checked directly without DNS resolution | MUST |
| REQ-SEC-006 | DNS resolution failures SHALL fail-open, allowing the fetch to proceed | SHOULD |
| REQ-SEC-007 | SSRF protection SHALL be bypassable via configuration (default: blocked) for testing environments | MUST |

### 4.2 Fetch Hardening

| ID | Requirement | Priority |
|---|---|---|
| REQ-SEC-008 | Configurable redirect limit (default: 5); exceeding produces `too_many_redirects` | MUST |
| REQ-SEC-009 | Configurable response body size limit (default: 10 MiB) via streaming byte counting | MUST |
| REQ-SEC-010 | Configurable fetch timeout; cumulative across the entire redirect chain | MUST |
| REQ-SEC-011 | Only `http:` and `https:` URI schemes permitted | MUST |

### 4.3 Container Security

| ID | Requirement | Priority |
|---|---|---|
| REQ-SEC-012 | Production container image SHALL run as a non-root user | MUST |
| REQ-SEC-013 | Production install SHALL exclude dev dependencies and disable install scripts | MUST |

### 4.4 Known Security Gaps

| ID | Description | Risk | Mitigation |
|---|---|---|---|
| GAP-SEC-001 | IPv4-mapped IPv6 addresses (`::ffff:127.0.0.1`) not blocked | **High** | Normalize IPv4-mapped IPv6 to IPv4 before validation |
| GAP-SEC-002 | Missing ranges: CGNAT `100.64.0.0/10`, multicast `224.0.0.0/4`, broadcast `255.255.255.255/32` | **Medium** | Extend blocked ranges per RFC 6890 |
| GAP-SEC-003 | DNS rebinding TOCTOU between validation and HTTP client resolution | **High** | Pin resolved IP for HTTP connection |
| GAP-SEC-004 | DNS fail-open policy allows bypass when DNS is unreachable | **Medium** | Add configurable DNS fail policy (open/closed) |
| GAP-SEC-005 | Metrics server error handler leaks internal details to clients | **Low** | Return generic error body; log full details server-side |

---

## 5. HTTP Fetching Requirements

### 5.1 HTTP Client

**REQ-FETCH-001** — The system SHALL use a performant, non-blocking HTTP client for fetching.

**REQ-FETCH-002** — Every request SHALL include a configurable `User-Agent` header.

**REQ-FETCH-003** — The HTTP client SHALL be injectable/replaceable for deterministic testing.

### 5.2 Redirect Handling

**REQ-FETCH-004** — The fetcher SHALL follow redirects (301, 302, 303, 307, 308) up to a configurable maximum limit.

**REQ-FETCH-005** — Relative `Location` headers SHALL be resolved against the current request URL.

**REQ-FETCH-006** — A 3xx response without a `Location` header SHALL be treated as an HTTP error.

**REQ-FETCH-007** — SSRF validation SHALL be invoked at every redirect hop.

**REQ-FETCH-008** — When the final URL differs from the original, it SHALL be recorded in the FetchResult.

### 5.3 Politeness

**REQ-FETCH-009** — Per-domain politeness: requests to the same domain SHALL be serialized with a configurable minimum delay between consecutive requests.

**REQ-FETCH-010** — The first request to a domain SHALL proceed immediately (no delay).

**REQ-FETCH-011** — Failed fetches SHALL NOT break the domain's serialization chain.

**REQ-FETCH-012** — Stale domain entries SHALL be pruned automatically to prevent unbounded memory growth.

**REQ-FETCH-013** — The domain tracking structure SHALL enforce a hard cap (e.g., 10,000 entries) with eviction of least-recently-used domains.

### 5.4 Response Processing

**REQ-FETCH-014** — Response bodies SHALL be consumed via streaming with byte counting. Exceeding the size limit destroys the stream and returns `body_too_large`.

**REQ-FETCH-015** — A `Content-Length` pre-flight check SHALL fast-path reject oversized responses before streaming the body.

**REQ-FETCH-016** — Response bodies SHALL be decoded as UTF-8 text.

**REQ-FETCH-017** — Redirect and non-2xx response bodies SHALL be drained/discarded to free underlying connections.

### 5.5 Error Classification

**REQ-FETCH-018** — All fetch failures SHALL be classified into the 9 typed error variants defined in REQ-ARCH-012.

**REQ-FETCH-019** — Wall-clock duration SHALL be tracked for every fetch (success and failure).

---

## 6. Distributed System Requirements

### 6.1 Job Queue

**REQ-DIST-001 — URL Deduplication**
The frontier SHALL derive job identifiers deterministically from the normalized URL (e.g., via cryptographic hash). The queue SHALL silently discard duplicate entries, guaranteeing idempotent enqueue.

**REQ-DIST-002 — BFS Ordering via Priority**
Each job's priority SHALL reflect its depth so that breadth-first traversal order is maintained.

**REQ-DIST-003 — Retry with Exponential Backoff**
Failed jobs SHALL be retried with exponential backoff. Default: 3 attempts, 1-second base delay.

**REQ-DIST-004 — Bulk Enqueue**
Entries from a single page SHALL be enqueued in a single batch operation (one round-trip to the state store).

**REQ-DIST-005 — Bounded Job Retention**
Completed and failed job metadata SHALL be retained up to configurable limits (e.g., 10,000 completed, 5,000 failed) enforced as sliding windows.

**REQ-DIST-006 — Shared Queue Name**
All components SHALL reference a single, constant queue name.

### 6.2 Worker Management

**REQ-DIST-007 — Configurable Concurrency**
Worker concurrency (number of simultaneously processed jobs) SHALL be configurable.

**REQ-DIST-008 — Stalled Job Detection**
The system SHALL detect stalled jobs (workers that have taken a job but stopped sending heartbeats). Stalled jobs SHALL be returned to the waiting queue. Detection interval and lock duration SHALL be configurable, with lock duration being at minimum 2x the detection interval.

**REQ-DIST-009 — Race-Free Startup**
All event listeners SHALL be registered before the worker begins consuming jobs, preventing missed events.

**REQ-DIST-010 — Single-Start Guard**
The job consumer's `start()` method SHALL be callable exactly once. Subsequent invocations SHALL throw.

**REQ-DIST-011 — In-Process Utilization Tracking**
Worker utilization SHALL be tracked via in-process counters (not state-store queries) based on job lifecycle events, with guards against negative values.

### 6.3 Completion Detection

**REQ-DIST-012 — Normal Completion**
The crawl is complete when `pending === 0 AND done > 0`, where pending = waiting + active + delayed + prioritized jobs, and done = completed + failed jobs.

**REQ-DIST-013 — Empty-Queue Guard**
If `pending === 0 AND done === 0` persists for two consecutive polls, the system SHALL resolve with zero stats and log a warning.

**REQ-DIST-014 — Coordinator Restart Detection**
If `done > 0` but no live events have been observed on the first poll, the system SHALL log a warning and emit a restart metric.

**REQ-DIST-015 — State-Store Failure Backoff and Abort**
On state-store failures during polling, the system SHALL apply exponential backoff in skipped poll ticks (capped at a maximum interval). After a configurable number of consecutive failures (e.g., 25 failures, ~12 minutes), the system SHALL abort with a typed `aborted` outcome.

**REQ-DIST-016 — Single Completion-Wait Call**
The completion-wait function SHALL be callable at most once per coordinator instance. Overlapping polls SHALL be prevented.

### 6.4 Control Plane

**REQ-DIST-017 — Lifecycle States**
Four lifecycle states: `running`, `paused`, `completed`, `cancelled`. State SHALL be derived from live state-store queries.

**REQ-DIST-018 — Pause and Resume**
Queue-level pause and resume. Active jobs run to completion during pause.

**REQ-DIST-019 — Idempotent Cancel**
Cancel SHALL be idempotent: concurrent calls SHALL converge to a single operation.

**REQ-DIST-020 — Idempotent Seeding**
Seeding SHALL be idempotent via the deduplication mechanism (REQ-DIST-001).

### 6.5 State-Store Connection

**REQ-DIST-021 — Connection String Parsing**
The state-store connection SHALL support: host, port, password, username (ACL), database/namespace selection, and TLS.

**REQ-DIST-022 — Mandatory Error Handlers**
Every event-emitting component SHALL have an error handler attached immediately after construction to prevent unhandled-error crashes.

---

## 7. Observability Requirements

### 7.1 Structured Logging

**REQ-OBS-001** — The Logger contract SHALL provide five severity methods: `debug`, `info`, `warn`, `error`, `fatal`.

**REQ-OBS-002** — `child(bindings)` method returning a new Logger with merged context bindings, chainable to arbitrary depth.

**REQ-OBS-003** — Production logger SHALL output structured (e.g., JSON/ndjson) log records with ISO 8601 timestamps and configurable initial bindings.

**REQ-OBS-004** — Per-job child logger carrying `jobId`, `url`, and `depth` correlation fields.

**REQ-OBS-005** — Trace context (trace ID, span ID) SHALL be injected into every log record when distributed tracing is enabled.

**REQ-OBS-006** — Unique request IDs SHALL be generated for HTTP requests for correlation.

**REQ-OBS-007** — A null/no-op Logger implementation SHALL be provided for use in tests.

### 7.2 Metrics

**REQ-OBS-008** — The CrawlMetrics contract SHALL abstract all metric recording behind a technology-neutral interface.

**REQ-OBS-009** — `fetches_total` counter with `status` and `error_kind` labels.

**REQ-OBS-010** — `fetch_duration_seconds` histogram with configurable buckets (default: `[0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]`). Duration only recorded when `> 0`.

**REQ-OBS-011** — `urls_discovered_total` counter (incremented only when count > 0).

**REQ-OBS-012** — `frontier_size` gauge.

**REQ-OBS-013** — `stalled_jobs_total` counter.

**REQ-OBS-014** — `active_jobs` gauge.

**REQ-OBS-015** — `worker_utilization_ratio` gauge (`[0.0, 1.0]`).

**REQ-OBS-016** — `coordinator_restarts_total` counter.

**REQ-OBS-017** — Per-process metric registry isolation to prevent metric-name collisions in multi-instance deployments.

**REQ-OBS-018** — A null/no-op Metrics implementation SHALL be provided for use in tests.

### 7.3 Metrics Server

**REQ-OBS-019** — `GET /metrics` endpoint returning metrics in a standard exposition format.

**REQ-OBS-020** — `GET /health` endpoint returning a liveness status with a timestamp (liveness probe).

**REQ-OBS-021** — `GET /readyz` endpoint returning readiness status (readiness probe). **IMPROVEMENT:** Should verify state-store connectivity.

**REQ-OBS-022** — Unknown paths return 404. Handler failures return 500 with a generic error body (no internal details).

### 7.4 Distributed Tracing

**REQ-OBS-023** — Distributed tracing with a configurable trace exporter endpoint.

**REQ-OBS-024** — Automatic instrumentation of HTTP requests. **IMPROVEMENT:** Should also instrument the job queue for cross-job trace propagation.

**REQ-OBS-025** — Pluggable trace exporter for tests (e.g., in-memory exporter).

**REQ-OBS-026** — Non-throwing tracer shutdown (catches exceptions, logs at error level).

---

## 8. Application Lifecycle Requirements

### 8.1 Startup Sequence

| ID | Requirement |
|----|-------------|
| REQ-LIFE-001 | Configuration SHALL be validated before boot proceeds. Invalid config aborts immediately. |
| REQ-LIFE-002 | At least one seed URL is required. Empty seed list refuses to start. |
| REQ-LIFE-003 | Observability stack (logger, tracer, metrics, metrics server) SHALL be initialized before application-level wiring. |
| REQ-LIFE-004 | Logger SHALL include worker ID and service name bindings. |
| REQ-LIFE-005 | Tracer SHALL be started before the crawl begins. |
| REQ-LIFE-006 | Job consumer SHALL be started before seeding the frontier. |

### 8.2 Seeding

| ID | Requirement |
|----|-------------|
| REQ-LIFE-007 | Invalid seed URLs SHALL be logged as warnings and skipped, not abort seeding. |
| REQ-LIFE-008 | Valid seeds enqueued with `depth: 0` and `discoveredBy: 'coordinator'`. |
| REQ-LIFE-009 | Enqueue failures SHALL be logged, not silently swallowed. |
| REQ-LIFE-010 | Frontier size metric SHALL be recorded after seeding completes. |

### 8.3 Signal Handling

| ID | Signal / Event | Behaviour | Exit Code |
|----|----------------|-----------|-----------|
| REQ-LIFE-011 | Interrupt signal (e.g., `SIGINT`) | Graceful shutdown | 0 |
| REQ-LIFE-012 | Termination signal (e.g., `SIGTERM`) | Graceful shutdown | 0 |
| REQ-LIFE-013 | Uncaught exception | Log fatal, exit | 1 |
| REQ-LIFE-014 | Unhandled async rejection | Log fatal, exit | 1 |
| REQ-LIFE-015 | Main entry point failure | Log fatal, exit | 1 |
| REQ-LIFE-016 | State-store exhaustion (aborted) | Log fatal, exit | 3 |
| REQ-LIFE-017 | Successful completion | Normal exit | 0 |

### 8.4 Graceful Shutdown

| ID | Requirement |
|----|-------------|
| REQ-LIFE-018 | Shutdown SHALL be idempotent (re-entrant guard). |
| REQ-LIFE-019 | Two phases: **(1) Drain** — job consumer close with configurable timeout (e.g., 15s); **(2) Teardown** — parallel infrastructure teardown with configurable timeout (e.g., 8s). |
| REQ-LIFE-020 | Teardown SHALL use settle-all semantics (one failure does not block others). |
| REQ-LIFE-021 | Each teardown failure SHALL be logged with component name and error details. |
| REQ-LIFE-022 | Shutdown reason SHALL be typed (signal, completion, error, abort, etc.). |
| REQ-LIFE-023 | Coordinator close SHALL clear the poll interval and settle any pending promise. |
| REQ-LIFE-024 | Coordinator SHALL NOT close shared resources that it does not own (composition root ownership). |

### 8.5 Worker Processing

| ID | Requirement |
|----|-------------|
| REQ-LIFE-025 | Job payload SHALL be validated at runtime via a type guard or schema check. |
| REQ-LIFE-026 | `queue_error` errors SHALL be re-thrown to the job queue for retry (not swallowed). |
| REQ-LIFE-027 | Metrics SHALL be recorded for both successful and failed fetches. |
| REQ-LIFE-028 | The fetcher instance SHALL be created once and reused across jobs (preserving politeness chains). |

---

## 9. Alerting Requirements

### 9.0 Alert Summary

The system SHALL define alert rules covering the following conditions:

| ID | Condition | Severity | Sustained Duration | Category |
|----|-----------|----------|--------------------|----------|
| REQ-ALERT-001 | Error rate exceeds 50% while throughput > 0.1 req/s | warning | 2 min | Error |
| REQ-ALERT-002 | Frontier non-empty but successful fetch rate is zero | critical | 5 min | Error |
| REQ-ALERT-003 | Stalled job rate exceeds 0.05/s | warning | 2 min | Error |
| REQ-ALERT-004 | P95 fetch latency exceeds 10s | warning | 3 min | Performance |
| REQ-ALERT-005 | P99 fetch latency exceeds 15s | critical | 5 min | Performance |
| REQ-ALERT-006 | Frontier size exceeds 5,000 | warning | 5 min | Capacity |
| REQ-ALERT-007 | Frontier growth rate exceeds 100 URLs/min | warning | 3 min | Capacity |
| REQ-ALERT-008 | Average worker utilization exceeds 80% | warning | 3 min | Capacity |
| REQ-ALERT-009 | Average worker utilization below 20% (but > 0%) | info | 10 min | Capacity |
| REQ-ALERT-010 | Worker instance is unreachable | critical | 1 min | Infrastructure |
| REQ-ALERT-011 | Coordinator restart detected | warning | 0 min | Infrastructure |
| REQ-ALERT-012 | Zero discoveries despite successful fetches and large frontier (>100) | warning | 10 min | Discovery |

### 9.1 Alert Testing

**REQ-ALERT-013: Alert Rule Unit Tests**
All alert rules SHALL have automated unit tests with both fire and no-fire test cases.

### 9.2 Alert Gaps

- **GAP-ALERT-001:** 4 alert rules lack unit tests.
- **GAP-ALERT-002:** Alert testing not integrated into CI pipeline.
- **GAP-ALERT-003:** No alert routing/notification configuration (alerts fire but are never delivered to operators).

---

## 10. Infrastructure & Deployment Requirements

### 10.1 Container Image

**REQ-INFRA-001:** Multi-stage container build (build stage with compiler, production stage with only compiled output and runtime dependencies).

**REQ-INFRA-002:** Non-root execution in production.

**REQ-INFRA-003:** Production install SHALL exclude dev dependencies and disable install scripts.

**REQ-INFRA-004:** Entrypoint SHALL run pre-compiled application code (no runtime transpilation).

**REQ-INFRA-005:** Container HEALTHCHECK probing the liveness endpoint at a regular interval.

### 10.2 Container Orchestration

**REQ-INFRA-006:** Support for running multiple worker instances, each with a unique worker ID, using shared configuration.

**REQ-INFRA-007:** Worker readiness healthcheck probing the readiness endpoint.

**REQ-INFRA-008:** Worker restart policy: restart on failure only (not unconditionally).

**REQ-INFRA-009:** Workers SHALL depend on the state store being healthy before starting.

**REQ-INFRA-010:** Metrics endpoints SHALL be accessible to the monitoring system but not published to external networks.

### 10.3 State Store

**REQ-INFRA-011:** Persistent state store with durability guarantees (data survives restarts).

**REQ-INFRA-012:** State-store healthcheck at regular intervals.

**REQ-INFRA-013:** State-store data SHALL be stored on a named/persistent volume.

### 10.4 Monitoring System

**REQ-INFRA-014:** Time-series monitoring system with configurable retention period (default: 7 days).

**REQ-INFRA-015:** Configurable scrape/evaluation interval (default: 15s). Static targets for all workers. Alert rules loaded from configuration.

**REQ-INFRA-016:** Monitoring data SHALL be stored on a named/persistent volume.

**REQ-INFRA-017:** Monitoring system SHALL start after all worker services are available.

### 10.5 Configuration

**REQ-INFRA-018: Required Environment Variables**

| Variable | Constraint | Description |
|----------|-----------|-------------|
| `STATE_STORE_URL` | Valid connection URL | State-store connection string |
| `METRICS_PORT` | Positive integer | Metrics/health endpoint port |
| `SEED_URLS` | Comma-separated URLs | Initial crawl URLs |
| `MAX_DEPTH` | Non-negative integer | Maximum crawl depth |
| `MAX_CONCURRENT_FETCHES` | Positive integer | Parallel fetches per worker |
| `FETCH_TIMEOUT_MS` | Positive integer | Per-request timeout in milliseconds |
| `POLITENESS_DELAY_MS` | Non-negative integer | Per-domain delay in milliseconds |
| `MAX_RETRIES` | Non-negative integer | Retry attempts |

**REQ-INFRA-019: Optional Environment Variables**

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Runtime environment |
| `LOG_LEVEL` | `info` | Logging verbosity |
| `WORKER_ID` | Auto-generated | Unique process identifier |
| `USER_AGENT` | Product-specific default | HTTP User-Agent string |
| `ALLOW_PRIVATE_IPS` | `false` | SSRF bypass for testing |
| `MAX_REDIRECTS` | `5` | Redirect hop limit |
| `MAX_RESPONSE_BYTES` | `10485760` | Response body size limit in bytes |
| `ALLOWED_DOMAINS` | `null` | Domain allowlist (comma-separated) |

### 10.6 Infrastructure Improvements

- **IMP-INFRA-001:** Add resource limits (memory, CPU) to worker services.
- **IMP-INFRA-002:** Add a trace collector to the deployment stack for local tracing.
- **IMP-INFRA-003:** Add alert routing/notification system for alert delivery.
- **IMP-INFRA-004:** Reconcile liveness vs. readiness healthcheck paths across container and orchestration configurations.
- **IMP-INFRA-005:** Provide a documented example configuration file.

---

## 11. Testing & Quality Requirements

### 11.1 Test Architecture

**REQ-TEST-001: Three-Tier Test Structure**

| Tier | Scope | Infrastructure |
|------|-------|----------------|
| Unit | Pure logic, adapters, data types | In-memory only |
| Scenario / Integration | End-to-end crawl workflows | Real TCP servers, in-process frontier |
| Distributed | Multi-component integration with shared state store | Containerized state store |

**REQ-TEST-002:** Unit tests SHALL use in-memory frontier, null logger, null metrics, and mock fetchers. All test configs SHALL disable SSRF blocking to allow local-network test servers.

**REQ-TEST-003:** Scenario tests SHALL use a mock internet with real TCP servers. Mock site definitions SHALL support static HTML and dynamic handler functions.

**REQ-TEST-004:** Distributed tests SHALL use a containerized state store. Execution SHALL be sequential (single worker) to avoid non-determinism.

**REQ-TEST-005:** Deterministic mock sites SHALL be provided for common scenarios: slow responses, errors, connection resets, link traps, deduplication, mixed content, partial failures, etc.

### 11.2 Coverage Requirements

**REQ-TEST-006:** Coverage thresholds: Branches 85%, Functions 95%, Lines 95%, Statements 95%.

**REQ-TEST-007:** Infrastructure adapters that require external services SHALL be excluded from unit coverage (validated by distributed tests instead).

**REQ-TEST-008:** Logging adapters SHALL be excluded from unit coverage (validated by integration tests).

### 11.3 CI Pipeline

**REQ-TEST-009:** CI stages SHALL run sequentially with fail-fast: version check → type check → lint → format check → architecture validation → test with coverage.

**REQ-TEST-010:** Linting SHALL enforce strict type-checked rules including: explicit function return types, no floating promises, prefer readonly, only throw typed errors, etc.

**REQ-TEST-011:** Relaxed lint rules for test files (assertions may use non-null operations, return types may be inferred, etc.).

**REQ-TEST-012:** Code formatting SHALL be enforced consistently (style: single quotes, trailing commas, ~100-char lines, consistent indentation, Unix line endings).

**REQ-TEST-013:** Test randomization SHALL be available to detect hidden inter-test dependencies.

**REQ-TEST-014:** Test runner memory limit SHALL be configured to prevent runaway tests.

### 11.4 Type System Configuration

**REQ-TEST-015:** Strict type checking with unchecked-index-access protection, exact optional property types, and isolated modules.

**REQ-TEST-016:** Native ESM module system.

**REQ-TEST-017:** Fast transpiler for both production builds and test execution.

### 11.5 Test Timeouts

**REQ-TEST-018:** Unit/scenario test timeout: 30s.

**REQ-TEST-019:** Distributed test timeout: 60s.

**REQ-TEST-020:** Containerized infrastructure SHALL have automated setup/teardown as part of the distributed test lifecycle.

### 11.6 Testing Gaps

| ID | Gap | Recommendation |
|----|-----|----------------|
| GAP-TEST-001 | Distributed tests and alert tests not in CI | Add as post-coverage CI stages |
| GAP-TEST-002 | No retry behavior testing | Add unit tests for retry count and backoff timing |
| GAP-TEST-003 | SSRF guard never tested end-to-end with blocking enabled | Add scenario test with non-loopback server |
| GAP-TEST-004 | No `robots.txt` compliance tests | Add mock sites with `Disallow` rules |
| GAP-TEST-005 | No concurrent multi-worker deduplication race test | Add distributed test with parallel workers |
| GAP-TEST-006 | No graceful shutdown mid-crawl test | Add scenario test with termination signal mid-crawl |

---

## 12. Gap Analysis & Improvement Recommendations

### 12.1 Critical Security Gaps

| ID | Gap | Impact | Recommendation |
|---|---|---|---|
| GAP-C01 | IPv4-mapped IPv6 bypass (`::ffff:127.0.0.1`) | SSRF bypass | Detect and normalize IPv4-mapped IPv6 addresses before validation |
| GAP-C02 | Missing IPv4 reserved ranges (CGNAT, multicast, broadcast) | Incomplete SSRF | Extend to all IANA reserved ranges per RFC 6890 |
| GAP-C03 | DNS rebinding TOCTOU vulnerability | SSRF via DNS rebinding | Pin resolved IP for HTTP connection |
| GAP-C04 | Metrics server leaks error details | Information disclosure | Return generic error body |

### 12.2 High-Priority Functional Gaps

| ID | Gap | Impact | Recommendation |
|---|---|---|---|
| GAP-H01 | No `robots.txt` compliance | Ethical/legal risk | Add a robots.txt checker contract and implementation |
| GAP-H02 | No retry behavior testing | Untested code path | Add retry scenario tests |
| GAP-H03 | Readiness probe always returns ready | Unhealthy workers serve traffic | Verify state-store connectivity in readiness probe |
| GAP-H04 | DNS fail-open in SSRF guard | Security trade-off | Add configurable DNS fail policy |
| GAP-H05 | Alert tests not in CI | Undetected alert regressions | Add to CI pipeline |

### 12.3 Medium-Priority Improvements

| ID | Gap | Recommendation |
|---|---|---|
| GAP-M01 | Some alert rules lack unit tests | Add test cases for all alert rules |
| GAP-M02 | No alert notification routing | Add alert routing/notification system to deployment |
| GAP-M03 | No trace collector in deployment | Add trace collector to deployment stack |
| GAP-M04 | Missing typed error constructor for crawl-specific errors | Add constructor for `depth_exceeded`, `domain_not_allowed`, `queue_error` |
| GAP-M05 | Unused field silently ignored in metrics | Remove from contract or add as metric label |
| GAP-M06 | No backoff jitter | Implement jitter in retry backoff to avoid thundering herd |
| GAP-M07 | SSRF guard not wired in scenario tests | Add end-to-end SSRF test |
| GAP-M08 | Worker ID collision risk with default generation | Add random suffix to default ID |
| GAP-M09 | Only `<a href>` links extracted | Extend to `<link>`, `<area>`, `<iframe>` |
| GAP-M10 | No charset detection | Parse `Content-Type` charset parameter |
| GAP-M11 | Healthcheck path inconsistency across configs | Reconcile container and orchestration healthcheck paths |

### 12.4 Low-Priority / Nice-to-Have

| ID | Gap | Recommendation |
|---|---|---|
| GAP-L01 | No upper bound on max concurrent fetches | Add maximum limit in schema validation |
| GAP-L02 | Seed URL whitespace not trimmed per segment | Trim whitespace from each seed URL segment |
| GAP-L03 | No unsubscribe for event callbacks | Return unsubscribe handle from event registration |
| GAP-L04 | Some utility functions not exported from barrel | Export from core barrel module |
| GAP-L05 | No resource limits in deployment config | Add memory and CPU limits to worker services |
| GAP-L06 | SSL error detection uses fragile string matching | Prefer error code-based checks |
| GAP-L07 | No `Accept-Encoding` support | Add gzip/brotli decompression support |

### 12.5 Summary Statistics

| Severity | Count |
|---|---|
| Critical (Security) | 4 |
| High (Functional) | 5 |
| Medium (Quality) | 11 |
| Low (Nice-to-Have) | 7 |
| **Total** | **27** |

### 12.6 Prioritized Remediation Roadmap

**Phase 1 — Immediate (security-critical):**
GAP-C01, GAP-C02, GAP-C03, GAP-C04

**Phase 2 — Short-term (high-priority functional):**
GAP-H01 through GAP-H05

**Phase 3 — Medium-term (quality improvements):**
GAP-M01 through GAP-M11

**Phase 4 — Backlog:**
GAP-L01 through GAP-L07
