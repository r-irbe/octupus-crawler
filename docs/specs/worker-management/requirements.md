# Worker Management — Requirements

> EARS-format requirements for worker concurrency, stalled job detection, startup guards, and utilization tracking.
> Source: [REQUIREMENTS-AGNOSTIC.md](../../research/REQUIREMENTS-AGNOSTIC.md) §6.2

---

## 1. Worker Concurrency

**REQ-DIST-007** (Ubiquitous)
Worker concurrency (number of simultaneously processed jobs) shall be configurable via `MAX_CONCURRENT_FETCHES`.

### Acceptance Criteria — Concurrency

```gherkin
Given MAX_CONCURRENT_FETCHES=5
When the worker starts
Then at most 5 jobs are processed simultaneously
```

## 2. Stalled Job Detection

**REQ-DIST-008** (Event-driven)
When a worker stops sending heartbeats, the system shall detect the stalled job and return it to the waiting queue. Detection interval and lock duration shall be configurable, with lock duration at minimum 2x the detection interval.

### Acceptance Criteria — Stalled Jobs

```gherkin
Given a worker processing a job that stops sending heartbeats
When the stall detection interval elapses
Then the job is returned to the waiting queue
And a "stalled" event is emitted
```

## 3. Startup Safety

**REQ-DIST-009** (Ubiquitous)
All event listeners shall be registered before the worker begins consuming jobs, preventing missed events.

**REQ-DIST-010** (Ubiquitous)
The job consumer's `start()` method shall be callable exactly once. Subsequent invocations shall throw.

### Acceptance Criteria — Startup Safety

```gherkin
Given a job consumer that has already been started
When start() is called a second time
Then it throws an error
```

## 4. Utilization Tracking

**REQ-DIST-011** (Ubiquitous)
Worker utilization shall be tracked via in-process counters based on job lifecycle events. The utilization ratio shall be `activeJobs / maxConcurrency`, with guards against negative values.

## 5. Worker Recovery

**REQ-DIST-012** (Event-driven)
When a worker process crashes and restarts, it shall re-register with the queue and resume consuming jobs without manual intervention. In-flight jobs from the crashed instance shall be detected as stalled and returned to the queue by REQ-DIST-008.

**REQ-DIST-013** (Event-driven)
When utilization tracking detects a counter inconsistency (activeJobs > maxConcurrency), it shall log a warning, reset the counter to the actual active job count via queue query, and emit a `utilization_counter_reset_total` metric.

**REQ-DIST-014** (Ubiquitous)
Worker metrics shall be exposed: `worker_active_jobs` (gauge), `worker_utilization_ratio` (gauge), `worker_jobs_processed_total` (counter by status: completed/failed/stalled), `utilization_counter_reset_total` (counter).

### Acceptance Criteria — Utilization

```gherkin
Given a worker with concurrency 4 and 2 active jobs
When the utilization ratio is queried
Then it returns 0.5

Given a worker with 0 active jobs
When a "completed" event fires (potential double-decrement)
Then the active counter does not go below 0
```

### Acceptance Criteria — Recovery & Metrics

```gherkin
Given a worker process crashes
When it restarts
Then it re-registers with the queue and resumes consuming
And in-flight jobs from the crashed instance are detected as stalled

Given activeJobs counter shows 5 but maxConcurrency is 4
When the inconsistency is detected
Then a warning is logged
And the counter is reset via queue query
And utilization_counter_reset_total is incremented

Given a worker processing jobs
When metrics are scraped
Then worker_active_jobs, worker_utilization_ratio, and worker_jobs_processed_total are exposed
```

---

## Traceability Matrix

| Requirement | Source | Priority | Test Type |
| --- | --- | --- | --- |
| REQ-DIST-007 | §6.2 | MUST | Integration |
| REQ-DIST-008 | §6.2 | MUST | Distributed |
| REQ-DIST-009 | §6.2 | MUST | Unit |
| REQ-DIST-010 | §6.2 | MUST | Unit |
| REQ-DIST-011 | §6.2 | MUST | Unit |
| REQ-DIST-012 | Cross-validation | MUST | Integration |
| REQ-DIST-013 | Cross-validation | SHOULD | Unit |
| REQ-DIST-014 | Cross-validation | MUST | Integration |

---

> **Provenance**: Created 2026-03-25 from REQUIREMENTS-AGNOSTIC.md §6.2. EARS conversion per ADR-020. Updated 2026-03-26: added REQ-DIST-012–014 (recovery, counter guard, metrics) per PR Review Council.
