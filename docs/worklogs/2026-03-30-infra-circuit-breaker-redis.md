# Worklog: Infra Circuit Breaker + Redis

| Field | Value |
| --- | --- |
| Date | 2026-03-30 |
| Branch | `work/infra-circuit-breaker-redis` |
| Commit | `475f73c` |
| Status | Complete |

## Summary

Implemented 6 infrastructure tasks unblocked by prior integration of Redis, BullMQ, Redis Streams, Prisma, PostgreSQL, and MinIO. Added circuit breaker wrappers, idempotency store, Pub/Sub, and integration tests across `packages/redis` and `packages/database`.

## Tasks Completed

| Task | Package | Files | Tests |
| --- | --- | --- | --- |
| T-RES-018: Redis circuit breaker | `@ipf/redis` | circuit-breaker.ts | 10 unit |
| T-RES-019: Database CB wiring | `@ipf/database` | resilient-crawl-url-repository.ts | 6 unit |
| T-COMM-021: Idempotency store | `@ipf/redis` | idempotency-store.ts | 7 unit + 4 integration |
| T-COMM-022: Redis Pub/Sub | `@ipf/redis` | pubsub.ts | 7 unit + 3 integration |
| T-COMM-024: Streams integration test | `@ipf/redis` | streams.integration.test.ts | 4 integration |
| T-COMM-025: Idempotency integration test | `@ipf/redis` | idempotency-store.integration.test.ts | 4 integration |

## Files Created/Modified

- `packages/redis/src/circuit-breaker.ts` (82 lines) — cockatiel CB wrapper for Redis ops
- `packages/redis/src/circuit-breaker.unit.test.ts` (114 lines) — 10 tests incl. half-open recovery
- `packages/redis/src/idempotency-store.ts` (99 lines) — Redis-backed idempotency key store
- `packages/redis/src/idempotency-store.unit.test.ts` (99 lines) — 7 unit tests
- `packages/redis/src/idempotency-store.integration.test.ts` (93 lines) — 4 Testcontainers tests
- `packages/redis/src/pubsub.ts` (107 lines) — Pub/Sub publisher + subscriber
- `packages/redis/src/pubsub.unit.test.ts` (114 lines) — 7 unit tests
- `packages/redis/src/pubsub.integration.test.ts` (102 lines) — 3 Testcontainers tests
- `packages/redis/src/streams.integration.test.ts` (127 lines) — 4 Testcontainers tests
- `packages/database/src/repositories/resilient-crawl-url-repository.ts` (24 lines) — CB wrapper
- `packages/database/src/repositories/resilient-crawl-url-repository.unit.test.ts` (104 lines) — 6 tests
- `packages/redis/package.json` — added cockatiel ^3.2.1, 3 new exports

## RALPH Review Findings

4 sustained findings (3 Major, 1 Minor), all resolved:

| Finding | Severity | Resolution |
| --- | --- | --- |
| RALPH-001: Unsafe JSON.parse cast | Major | Added Zod CachedResponseSchema validation, SerializationError for parse failures |
| RALPH-006: Unsafe state cast | Major | Replaced with onStateChange-tracked local variable |
| RALPH-012: No half-open recovery test | Major | Added recovery test (threshold:1, halfOpenAfterMs:50) |
| RALPH-013: No Pub/Sub integration test | Minor | Added 3 Testcontainers tests (delivery, JSON, unsubscribe) |

## Decisions

1. Redis CB in `packages/redis` — co-located with Redis client per VSA
2. Idempotency store JSON validated with Zod (RALPH-001) — trust boundary at Redis reads
3. CB state tracked locally via onStateChange (RALPH-006) — avoids cockatiel internal access
4. Per-test subscriber connections in integration tests — ioredis requires dedicated subscriber connections

## Deferred

- RALPH-007: Add IdempotencyConfigSchema (Zod consistency) — follow-up task
- RALPH-009: Extract generic circuit breaker factory to packages/resilience — cross-package refactor
- RALPH-005: Evaluate SampledBreaker for production — needs production metrics

---

> Provenance: Created 2026-03-30.
