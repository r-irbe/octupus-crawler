# Resilience Patterns — Tasks

> Implementation tasks for the 7-layer resilience stack.
> Traces to: [requirements.md](requirements.md) | Design: [design.md](design.md)

---

## Completion: 18/25 (72%)

---

## Phase 1: Core Resilience Primitives

- [x] **T-RES-001**: Create `packages/resilience/` package with cockatiel dependency — REQ-RES-001
- [x] **T-RES-002**: Implement per-domain circuit breaker factory (`getDomainBreaker`) with LRU eviction — REQ-RES-002, REQ-RES-019, REQ-RES-020
- [x] **T-RES-003**: Implement circuit breaker state transition OTel metrics and structured logging — REQ-RES-004
- [x] **T-RES-004**: Configure ConsecutiveBreaker(5) threshold and halfOpenAfter(30s) defaults in Zod config — REQ-RES-003

## Phase 2: Retry & Timeout Policies

- [x] **T-RES-005**: Implement retry policy with exponential backoff + jitter (initial 1s, max 30s, 3 attempts) — REQ-RES-005
- [x] **T-RES-006**: Add idempotency guard preventing retry of non-idempotent operations — REQ-RES-006
- [x] **T-RES-007**: Implement cooperative timeout policy with configurable defaults (30s/10s/5s) — REQ-RES-008, REQ-RES-009
- [x] **T-RES-008**: Compose timeout → retry → circuit breaker via `wrap()` — REQ-RES-007, REQ-RES-018

## Phase 3: Rate Limiting & Bulkhead

- [x] **T-RES-009**: Implement per-domain token bucket rate limiter with configurable burst and refill — REQ-RES-010
- [x] **T-RES-010**: Implement Redis sliding window API rate limiter — REQ-RES-011
- [x] **T-RES-011**: Implement bulkhead policy with per-domain concurrency limiting (default 2) — REQ-RES-012, REQ-RES-013

## Phase 4: Fallback & DLQ

- [x] **T-RES-012**: Implement fallback strategy serving cached stale data on circuit open — REQ-RES-014
- [x] **T-RES-013**: Add degraded mode metrics and structured logging — REQ-RES-015
- [x] **T-RES-014**: Configure BullMQ dead letter queue for exhausted jobs — REQ-RES-016
- [x] **T-RES-015**: Emit DLQ metrics and alert-eligible events on job exhaustion — REQ-RES-017

## Phase 5: Integration & Composition

- [x] **T-RES-016**: Create `createFetchPolicy(domain)` that composes full 7-layer stack — REQ-RES-018, REQ-RES-019
- [x] **T-RES-017**: Integrate resilience policies into http-fetching package fetch pipeline — REQ-RES-001
- [x] **T-RES-018**: Integrate circuit breaker into Redis client wrapper — REQ-RES-001
- [x] **T-RES-019**: Integrate circuit breaker into database query layer — REQ-RES-001
- [x] **T-RES-020**: Wire Zod-validated configuration for all resilience parameters — REQ-RES-003, REQ-RES-008

## Phase 6: Testing

- [x] **T-RES-021**: Property tests for circuit breaker state transitions (closed → open → half-open → closed) — REQ-RES-003
- [x] **T-RES-022**: Property tests for token bucket invariants (capacity, refill rate, burst) — REQ-RES-010
- [x] **T-RES-023**: Property tests for retry backoff bounds (jitter within range, max delay cap) — REQ-RES-005
- [x] **T-RES-024**: Integration test with Testcontainers Redis for sliding window rate limiter — REQ-RES-011
- [x] **T-RES-025**: Integration test for BullMQ DLQ flow (exhaust retries → verify DLQ entry) — REQ-RES-016

---

## MVP Critical Path

T-RES-001 → T-RES-002 → T-RES-005 → T-RES-007 → T-RES-008 → T-RES-016 → T-RES-017 → T-RES-021

---

## Dependencies

| Task | Depends On |
| ---- | ---------- |
| T-RES-002 | T-RES-001 (package exists) |
| T-RES-008 | T-RES-005, T-RES-007 (retry + timeout exist) |
| T-RES-010 | packages/redis (Redis client) |
| T-RES-014 | packages/job-queue (BullMQ setup) |
| T-RES-016 | T-RES-002, T-RES-008, T-RES-009, T-RES-011 (all primitives) |
| T-RES-017 | T-RES-016, packages/http-fetching |
| T-RES-021–025 | Corresponding implementation tasks |

---

> **Provenance**: Created 2026-03-29 per ADR-020. Source: ADR-009, ADR-002.
