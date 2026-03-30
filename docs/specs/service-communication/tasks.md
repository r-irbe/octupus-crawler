# Service Communication — Tasks

> Implementation tasks traceable to [requirements.md](requirements.md). Dependency-ordered.
> Design: [design.md](design.md) | ADR: [ADR-017](../../adr/ADR-017-service-communication.md)

---

## Phase 1: tRPC Setup

- [x] **T-COMM-001**: Create `packages/api-router/` with tRPC router, context, and middleware → REQ-COMM-001
- [x] **T-COMM-002**: Define Zod schemas for crawl.submit/status procedures → REQ-COMM-002
- [x] **T-COMM-003**: Implement `publicProcedure` and `protectedProcedure` with auth middleware → REQ-COMM-003
- [ ] **T-COMM-004**: Add OTel trace propagation middleware to tRPC client/server → REQ-COMM-004
- [ ] **T-COMM-005**: Wire tRPC router into api-gateway Fastify adapter → REQ-COMM-001

## Phase 2: TypeSpec / OpenAPI

- [ ] **T-COMM-006**: Install TypeSpec compiler and create `specs/` directory → REQ-COMM-005
- [ ] **T-COMM-007**: Define CrawlerAPI service in TypeSpec with models and operations → REQ-COMM-005
- [ ] **T-COMM-008**: Add tsp compile step to CI for OpenAPI generation → REQ-COMM-008
- [ ] **T-COMM-009**: Configure API versioning middleware (`/api/v1/`) with deprecation telemetry → REQ-COMM-007

## Phase 3: Domain Events

- [x] **T-COMM-010**: Define DomainEvent discriminated union with versioned schemas → REQ-COMM-010
- [x] **T-COMM-011**: Implement `RedisStreamPublisher` with XADD → REQ-COMM-009
- [x] **T-COMM-012**: Implement `RedisStreamConsumer` with consumer groups (XREADGROUP) → REQ-COMM-011
- [ ] **T-COMM-013**: Add CrawlCompleted/CrawlFailed event publishing to worker pipeline → REQ-COMM-012
- [ ] **T-COMM-014**: Add URLDiscovered event publishing to parse stage → REQ-COMM-013
- [x] **T-COMM-015**: Implement unknown event version handling (skip + warn) → REQ-COMM-014

## Phase 4: Temporal Workflows (MEDIUM-TERM — per ADR-017 §5)

> These tasks are deferred until the system requires durable multi-step workflows beyond BullMQ's capabilities.

- [ ] **T-COMM-016**: Add Temporal TypeScript SDK dependency → REQ-COMM-015
- [ ] **T-COMM-017**: Define crawl workflow (fetch → parse → store → index) → REQ-COMM-015
- [ ] **T-COMM-018**: Implement activities with timeout and retry configuration → REQ-COMM-016
- [ ] **T-COMM-019**: Implement compensating transactions for Saga pattern → REQ-COMM-017
- [ ] **T-COMM-020**: Add workflow query endpoints for status monitoring → REQ-COMM-018

## Phase 5: Idempotency & Pub/Sub

- [ ] **T-COMM-021**: Implement idempotency key middleware with Redis caching → REQ-COMM-021, REQ-COMM-022
- [ ] **T-COMM-022**: Implement Redis Pub/Sub wrapper for ephemeral notifications → REQ-COMM-019

## Phase 6: Testing

- [x] **T-COMM-023**: Unit tests for tRPC router procedures and Zod validation → REQ-COMM-001
- [ ] **T-COMM-024**: Integration test: Redis Streams publish/consume round-trip (Testcontainers) → REQ-COMM-009
- [ ] **T-COMM-025**: Integration test: idempotency key returns cached response → REQ-COMM-021
- [ ] **T-COMM-026**: Integration test: unknown event version is skipped → REQ-COMM-014
- [ ] **T-COMM-027**: Integration test: Temporal workflow survives worker restart → REQ-COMM-015

## MVP Critical Path

T-COMM-001 → T-COMM-002 → T-COMM-010 → T-COMM-011 → T-COMM-012 → T-COMM-024

## Completion Summary

| Metric | Count |
| --- | --- |
| Total tasks | 27 |
| Completed | 8 |
| Remaining | 19 |
| Completion rate | 30% |

---

> **Provenance**: Created 2026-03-29 per ADR-020 Spec-Driven Development. Source: ADR-017.
