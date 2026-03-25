# Completion Detection & Control Plane — Requirements

> EARS-format requirements for crawl completion detection, control plane lifecycle, and state-store connection.
> Source: [REQUIREMENTS-AGNOSTIC.md](../../research/REQUIREMENTS-AGNOSTIC.md) §6.3–6.5

---

## 1. Completion Detection

**REQ-DIST-012** (State-driven)
While `pending === 0 AND done > 0` (where pending = waiting + active + delayed + prioritized, and done = completed + failed), the system shall declare the crawl complete.

**REQ-DIST-013** (State-driven)
While `pending === 0 AND done === 0` persists for two consecutive polls, the system shall resolve with zero stats and log a warning.

**REQ-DIST-014** (Event-driven)
When `done > 0` but no live events were observed on the first poll, the system shall log a warning and emit a `coordinator_restarts_total` metric.

**REQ-DIST-015** (Unwanted behaviour)
If the state-store fails during completion polling, then the system shall apply exponential backoff in skipped ticks (capped at a maximum interval). If consecutive failures reach a configured limit (e.g., 25 failures, ~12 minutes), then the system shall abort with a typed `aborted` outcome.

**REQ-DIST-016** (Ubiquitous)
The completion-wait function shall be callable at most once per coordinator instance. Overlapping polls shall be prevented.

### Acceptance Criteria — Completion Detection

```gherkin
Given a crawl with 0 pending and 50 completed jobs
When the coordinator polls
Then the crawl is declared complete

Given a crawl with 0 pending and 0 done on two consecutive polls
When the second poll returns the same state
Then the coordinator resolves with zero stats and logs a warning

Given 25 consecutive state-store failures during polling
When the failure threshold is reached
Then the coordinator aborts with an "aborted" outcome
```

## 2. Control Plane

**REQ-DIST-017** (Ubiquitous)
The control plane shall support four lifecycle states: `running`, `paused`, `completed`, `cancelled`. State shall be derived from live state-store queries.

**REQ-DIST-018** (Event-driven)
When `pause()` is called, the system shall pause the queue. Active jobs shall run to completion during pause.

**REQ-DIST-019** (Ubiquitous)
Cancel shall be idempotent: concurrent cancel calls shall converge to a single operation.

**REQ-DIST-020** (Ubiquitous)
Seeding shall be idempotent via the deduplication mechanism (REQ-DIST-001).

### Acceptance Criteria — Control Plane

```gherkin
Given a running crawl
When pause() is called
Then new jobs stop being dequeued
And active jobs complete normally

Given a cancelled crawl
When cancel() is called again
Then no error occurs (idempotent)
```

## 3. State-Store Connection

**REQ-DIST-021** (Ubiquitous)
The state-store connection shall support: host, port, password, username (ACL), database/namespace selection, and TLS.

**REQ-DIST-022** (Ubiquitous)
Every event-emitting component shall have an error handler attached immediately after construction to prevent unhandled-error crashes.

### Acceptance Criteria — State-Store

```gherkin
Given a state-store connection URL with password and TLS
When the connection is established
Then it connects successfully with authentication and encryption

Given an event-emitting component (queue, connection)
When it is constructed
Then an error handler is attached before any other operation
```

---

## Traceability Matrix

| Requirement | Source | Priority | Test Type |
| --- | --- | --- | --- |
| REQ-DIST-012 | §6.3 | MUST | Distributed |
| REQ-DIST-013 | §6.3 | MUST | Unit |
| REQ-DIST-014 | §6.3 | MUST | Unit |
| REQ-DIST-015 | §6.3 | MUST | Unit + Distributed |
| REQ-DIST-016 | §6.3 | MUST | Unit |
| REQ-DIST-017 | §6.4 | MUST | Distributed |
| REQ-DIST-018 | §6.4 | MUST | Distributed |
| REQ-DIST-019 | §6.4 | MUST | Unit |
| REQ-DIST-020 | §6.4 | MUST | Distributed |
| REQ-DIST-021 | §6.5 | MUST | Integration |
| REQ-DIST-022 | §6.5 | MUST | Unit |

---

> **Provenance**: Created 2026-03-25 from REQUIREMENTS-AGNOSTIC.md §6.3–6.5. EARS conversion per ADR-020.
