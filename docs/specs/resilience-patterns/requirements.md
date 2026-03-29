# Resilience Patterns — Requirements

> EARS-format requirements for the 7-layer resilience stack: rate limiting, timeouts, circuit breakers, retry, bulkhead, fallback, and dead letter queues.
> Source: [ADR-009](../../adr/ADR-009-resilience-patterns.md), [ADR-002](../../adr/ADR-002-job-queue-system.md)

---

## 1. Circuit Breaker

**REQ-RES-001** (Ubiquitous)
The system shall use cockatiel circuit breakers for all external service calls (HTTP fetches, database queries, Redis operations).

**REQ-RES-002** (Ubiquitous)
Circuit breakers shall be per-domain for fetch operations, isolating failures to individual crawl targets.

**REQ-RES-003** (State-driven)
When 5 consecutive failures occur for a domain, the circuit breaker shall open. After 30 seconds in half-open state, it shall allow one test request.

**REQ-RES-004** (Event-driven)
When a circuit breaker transitions state (closed → open, open → half-open, half-open → closed), the system shall emit an OpenTelemetry metric and a structured log event.

### Acceptance Criteria — Circuit Breaker

```gherkin
Scenario: Circuit opens after consecutive failures
  Given a domain with 5 consecutive fetch failures
  When the 5th failure occurs
  Then the circuit breaker opens
  And subsequent requests return err(CircuitOpen) immediately
  And a circuit_open metric is emitted

Scenario: Circuit resets on successful test
  Given an open circuit breaker in half-open state
  When a test request succeeds
  Then the circuit resets to closed
  And normal requests resume
```

---

## 2. Retry with Backoff

**REQ-RES-005** (Ubiquitous)
Retryable operations shall use exponential backoff with jitter (initial 1s, max 30s, 3 max attempts).

**REQ-RES-006** (Ubiquitous)
Only idempotent operations shall be retried. Non-idempotent operations shall fail immediately on first error.

**REQ-RES-007** (Ubiquitous)
Retry policies shall be composable with circuit breakers via cockatiel's `wrap()` function.

### Acceptance Criteria — Retry

```gherkin
Scenario: Retry with exponential backoff
  Given an operation that fails twice then succeeds
  When the retry policy executes
  Then the operation is attempted 3 times
  And delay between attempts increases exponentially
  And the final attempt succeeds
```

---

## 3. Timeout

**REQ-RES-008** (Ubiquitous)
All external calls shall have configurable timeouts (default: 30s for fetches, 10s for DB, 5s for Redis).

**REQ-RES-009** (Ubiquitous)
Timeouts shall use cooperative cancellation via cockatiel's `TimeoutStrategy.Cooperative`.

### Acceptance Criteria — Timeout

```gherkin
Scenario: Fetch timeout enforced
  Given a fetch operation that takes 60 seconds
  When the 30-second timeout fires
  Then the operation is cancelled
  And err(Timeout) is returned
```

---

## 4. Rate Limiting

**REQ-RES-010** (Ubiquitous)
The system shall enforce per-domain rate limits using a token bucket algorithm with configurable burst and refill rates.

**REQ-RES-011** (Ubiquitous)
Global API rate limiting shall use a Redis sliding window counter, keyed by IP or authenticated user.

### Acceptance Criteria — Rate Limiting

```gherkin
Scenario: Per-domain rate limit enforced
  Given a domain with 2 requests/second limit
  When 5 requests arrive in 1 second
  Then 2 requests proceed immediately
  And 3 requests are queued until tokens refill
```

---

## 5. Bulkhead Isolation

**REQ-RES-012** (Ubiquitous)
Resource-intensive operations shall use bulkhead isolation to prevent one dependency from consuming all resources.

**REQ-RES-013** (Ubiquitous)
Concurrent fetch operations shall be limited per domain (configurable, default: 2 concurrent per domain).

### Acceptance Criteria — Bulkhead

```gherkin
Scenario: Bulkhead limits concurrent fetches
  Given a domain with max 2 concurrent fetches
  When 5 fetch requests arrive simultaneously
  Then 2 execute immediately
  And 3 queue until slots become available
```

---

## 6. Fallback & Degraded Mode

**REQ-RES-014** (State-driven)
When a dependency is unavailable and the circuit is open, the system shall serve cached stale data where applicable (degraded mode).

**REQ-RES-015** (Event-driven)
When the system enters degraded mode for a dependency, it shall emit a `DegradedMode` metric and structured log.

---

## 7. Dead Letter Queue

**REQ-RES-016** (Ubiquitous)
Jobs that fail after all retry attempts shall be moved to a BullMQ dead letter queue for manual inspection.

**REQ-RES-017** (Event-driven)
When a job moves to the dead letter queue, the system shall emit a metric and publish an alert-eligible event.

---

## 8. Policy Composition

**REQ-RES-018** (Ubiquitous)
Resilience policies shall be composed in order: timeout → retry → circuit breaker, using cockatiel's `wrap()`.

**REQ-RES-019** (Ubiquitous)
The system shall provide a `getDomainPolicy(domain)` factory that returns a composed resilience policy for any crawl domain.

**REQ-RES-020** (Ubiquitous)
Per-domain circuit breaker instances shall use LRU eviction for memory management (max 10,000 domains in memory).

---

> **Provenance**: Created 2026-03-29 per ADR-020 Spec-Driven Development. Source: ADR-009, ADR-002.
