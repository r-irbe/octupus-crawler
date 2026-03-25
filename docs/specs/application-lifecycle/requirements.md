# Application Lifecycle — Requirements

> EARS-format requirements for startup, seeding, signal handling, graceful shutdown, worker processing, and configuration.
> Source: [REQUIREMENTS-AGNOSTIC.md](../../research/REQUIREMENTS-AGNOSTIC.md) §2.5, §8, §10.5

---

## 1. Configuration

**REQ-LIFE-CFG-001** (Ubiquitous)
All configuration shall be loaded from environment variables and validated at startup. On validation failure, the system shall produce a structured error and abort.

**REQ-LIFE-CFG-002** (Ubiquitous)
The following environment variables are required: `STATE_STORE_URL`, `METRICS_PORT`, `SEED_URLS`, `MAX_DEPTH`, `MAX_CONCURRENT_FETCHES`, `FETCH_TIMEOUT_MS`, `POLITENESS_DELAY_MS`, `MAX_RETRIES`.

**REQ-LIFE-CFG-003** (Ubiquitous)
The following environment variables are optional with defaults: `NODE_ENV` (development), `LOG_LEVEL` (info), `WORKER_ID` (auto-generated), `USER_AGENT` (product default), `ALLOW_PRIVATE_IPS` (false), `MAX_REDIRECTS` (5), `MAX_RESPONSE_BYTES` (10485760), `ALLOWED_DOMAINS` (null).

## 2. Startup Sequence

**REQ-LIFE-001** (Ubiquitous)
Configuration shall be validated before boot proceeds. Invalid config shall abort immediately.

**REQ-LIFE-002** (Ubiquitous)
At least one seed URL is required. An empty seed list shall refuse to start.

**REQ-LIFE-003** (Ubiquitous)
The observability stack (logger, tracer, metrics, metrics server) shall be initialized before application-level wiring.

**REQ-LIFE-004** (Ubiquitous)
The logger shall include worker ID and service name bindings.

**REQ-LIFE-005** (Ubiquitous)
The tracer shall be started before the crawl begins.

**REQ-LIFE-006** (Ubiquitous)
The job consumer shall be started before seeding the frontier.

### Acceptance Criteria — Startup

```gherkin
Given an invalid STATE_STORE_URL
When the application starts
Then it exits with code 1 and a structured validation error

Given an empty SEED_URLS
When the application starts
Then it refuses to start (exit code 1)

Given valid configuration
When the application boots
Then observability is initialized before the worker starts
And the job consumer starts before seeds are enqueued
```

## 3. Seeding

**REQ-LIFE-007** (Unwanted behaviour)
If a seed URL is invalid, then the system shall log a warning and skip it — not abort seeding.

**REQ-LIFE-008** (Ubiquitous)
Valid seeds shall be enqueued with `depth: 0` and `discoveredBy: 'coordinator'`.

**REQ-LIFE-009** (Unwanted behaviour)
If an enqueue operation fails during seeding, then the failure shall be logged, not silently swallowed.

**REQ-LIFE-010** (Event-driven)
When seeding completes, the system shall record the frontier size metric.

### Acceptance Criteria — Seeding

```gherkin
Given seed URLs ["https://valid.com", "not-a-url", "https://also-valid.com"]
When seeding runs
Then 2 URLs are enqueued at depth 0
And a warning is logged for "not-a-url"
And the frontier size metric is updated
```

## 4. Signal Handling

**REQ-LIFE-011** (Event-driven)
When SIGINT is received, the system shall perform graceful shutdown and exit with code 0.

**REQ-LIFE-012** (Event-driven)
When SIGTERM is received, the system shall perform graceful shutdown and exit with code 0.

**REQ-LIFE-013** (Unwanted behaviour)
If an uncaught exception occurs, then the system shall log fatal and exit with code 1.

**REQ-LIFE-014** (Unwanted behaviour)
If an unhandled async rejection occurs, then the system shall log fatal and exit with code 1.

**REQ-LIFE-015** (Unwanted behaviour)
If the main entry point throws, then the system shall log fatal and exit with code 1.

**REQ-LIFE-016** (Event-driven)
When the state-store exhaustion abort is triggered, the system shall log fatal and exit with code 3.

**REQ-LIFE-017** (Event-driven)
When the crawl completes successfully, the system shall exit with code 0.

### Acceptance Criteria — Signals

```gherkin
Given a running crawl
When SIGTERM is received
Then graceful shutdown is triggered
And exit code is 0

Given a state-store abort (25 consecutive failures)
When the abort is triggered
Then exit code is 3
```

## 5. Graceful Shutdown

**REQ-LIFE-018** (Ubiquitous)
Shutdown shall be idempotent (re-entrant guard). Multiple signals shall not trigger multiple shutdowns. A second signal received during shutdown shall be logged and ignored — not force-exit.

**REQ-LIFE-019** (Ubiquitous)
Shutdown shall have two phases: (1) Drain — close job consumer with configurable timeout (default: 15s); (2) Teardown — parallel infrastructure teardown with configurable timeout (default: 8s). Total shutdown time shall not exceed K8s `terminationGracePeriodSeconds` minus a 5s safety buffer.

**REQ-LIFE-020** (Ubiquitous)
Teardown shall use settle-all semantics: one component failure does not block others.

**REQ-LIFE-021** (Unwanted behaviour)
If a teardown step fails, then the failure shall be logged with component name and error details.

**REQ-LIFE-022** (Ubiquitous)
The shutdown reason shall be typed (signal, completion, error, abort).

**REQ-LIFE-023** (Event-driven)
When the coordinator is closed, it shall clear the poll interval and settle any pending promise.

**REQ-LIFE-024** (Ubiquitous)
The coordinator shall not close shared resources it does not own (composition root ownership).

**REQ-LIFE-029** (Ubiquitous)
The readiness probe shall return unhealthy (`503`) immediately when shutdown begins, before drain starts. This prevents the orchestrator from routing new traffic during shutdown.

**REQ-LIFE-030** (Ubiquitous)
The state-store abort handler shall trigger shutdown within 1 second of the abort decision. The abort timing shall be deterministic: abort at exactly N consecutive failures, not "approximately N failures".

**REQ-LIFE-031** (Ubiquitous)
When the drain phase timeout is reached, in-flight jobs shall be abandoned (not waited for indefinitely). The system shall log each abandoned job's ID.

### Acceptance Criteria — Shutdown

```gherkin
Given SIGTERM followed by SIGINT within 1 second
When shutdown is triggered
Then only one shutdown sequence runs (idempotent)
And the second signal is logged and ignored

Given a shutdown with 3 components (consumer, frontier, tracer)
When the frontier.close() throws an error
Then the error is logged
And consumer.close() and tracer.close() still execute

Given shutdown initiated
When the readiness probe is checked
Then it returns 503 before drain starts

Given drain timeout of 15s and a stuck job
When 15s elapses
Then the stuck job is abandoned and its ID is logged
And teardown proceeds
```

## 6. Worker Processing

**REQ-LIFE-025** (Ubiquitous)
Job payload shall be validated at runtime via a type guard or schema check.

**REQ-LIFE-026** (Unwanted behaviour)
If a `queue_error` occurs, then the error shall be re-thrown to the job queue for retry — not swallowed.

**REQ-LIFE-027** (Ubiquitous)
Metrics shall be recorded for both successful and failed fetches.

**REQ-LIFE-028** (Ubiquitous)
The fetcher instance shall be created once and reused across jobs (preserving politeness chains).

### Acceptance Criteria — Worker Processing

```gherkin
Given a job with an invalid payload
When the worker processes it
Then the validation check rejects it before pipeline execution

Given a pipeline that returns a queue_error
When the worker handles the result
Then the error is re-thrown for queue retry
```

## 7. Resource Ownership & Startup Ordering

**REQ-LIFE-032** (Ubiquitous)
The system shall define an explicit resource ownership matrix. Each infrastructure resource (state-store connection, queue, frontier, metrics server, tracer) shall have exactly one owner responsible for its creation and destruction. The composition root is the sole owner of all infrastructure resources.

**REQ-LIFE-033** (Ubiquitous)
Startup ordering shall be enforced sequentially with explicit dependency declarations: (1) Config validation, (2) Observability (logger → tracer → metrics → metrics server), (3) State-store connection, (4) Frontier + Control Plane, (5) Job Consumer, (6) Seeding, (7) Completion wait. Each step shall fail-fast if its predecessor failed.

**REQ-LIFE-034** (Ubiquitous)
The startup exit behavior on failure shall be: config validation failure → exit(1), observability failure → exit(1), state-store connection failure → exit(1) after observability teardown. Each failure path shall ensure already-initialized resources are cleaned up before exit.

### Acceptance Criteria — Resource Ownership

```gherkin
Given the resource ownership matrix
When shutdown is executed
Then each resource is closed by its owner (composition root)
And no resource is closed by a non-owner

Given a state-store connection failure during startup
When the failure occurs after logger and tracer are initialized
Then the logger and tracer are cleaned up before exit(1)
```

---

## Traceability Matrix

| Requirement | Source | Priority | Test Type |
| --- | --- | --- | --- |
| REQ-LIFE-CFG-001 | §2.5 | MUST | Unit |
| REQ-LIFE-CFG-002 | §10.5 | MUST | Unit |
| REQ-LIFE-CFG-003 | §10.5 | MUST | Unit |
| REQ-LIFE-001 | §8.1 | MUST | Integration |
| REQ-LIFE-002 | §8.1 | MUST | Unit |
| REQ-LIFE-003 | §8.1 | MUST | Integration |
| REQ-LIFE-004 | §8.1 | MUST | Unit |
| REQ-LIFE-005 | §8.1 | MUST | Integration |
| REQ-LIFE-006 | §8.1 | MUST | Integration |
| REQ-LIFE-007 | §8.2 | MUST | Unit |
| REQ-LIFE-008 | §8.2 | MUST | Unit |
| REQ-LIFE-009 | §8.2 | MUST | Unit |
| REQ-LIFE-010 | §8.2 | MUST | Unit |
| REQ-LIFE-011 | §8.3 | MUST | Scenario |
| REQ-LIFE-012 | §8.3 | MUST | Scenario |
| REQ-LIFE-013 | §8.3 | MUST | Scenario |
| REQ-LIFE-014 | §8.3 | MUST | Scenario |
| REQ-LIFE-015 | §8.3 | MUST | Scenario |
| REQ-LIFE-016 | §8.3 | MUST | Scenario |
| REQ-LIFE-017 | §8.3 | MUST | Scenario |
| REQ-LIFE-018 | §8.4 | MUST | Unit |
| REQ-LIFE-019 | §8.4 | MUST | Scenario |
| REQ-LIFE-020 | §8.4 | MUST | Unit |
| REQ-LIFE-021 | §8.4 | MUST | Unit |
| REQ-LIFE-022 | §8.4 | MUST | Unit |
| REQ-LIFE-023 | §8.4 | MUST | Unit |
| REQ-LIFE-024 | §8.4 | MUST | Unit |
| REQ-LIFE-025 | §8.5 | MUST | Unit |
| REQ-LIFE-026 | §8.5 | MUST | Unit |
| REQ-LIFE-027 | §8.5 | MUST | Unit |
| REQ-LIFE-028 | §8.5 | MUST | Integration |
| REQ-LIFE-029 | §8.4 | MUST | Integration |
| REQ-LIFE-030 | §8.4 | MUST | Unit |
| REQ-LIFE-031 | §8.4 | MUST | Scenario |
| REQ-LIFE-032 | §8.1 | MUST | Code review |
| REQ-LIFE-033 | §8.1 | MUST | Integration |
| REQ-LIFE-034 | §8.1 | MUST | Scenario |

---

> **Provenance**: Created 2026-03-25 from REQUIREMENTS-AGNOSTIC.md §2.5, §8, §10.5. EARS conversion per ADR-020. Updated 2026-03-25: added REQ-LIFE-029–034 per PR Review Council findings (resource ownership, shutdown semantics, K8s interaction, startup ordering).
