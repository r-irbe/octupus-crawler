# Service Communication — Requirements

> EARS-format requirements for internal RPC (tRPC), public API contracts (TypeSpec/OpenAPI), domain events (Redis Streams), and durable workflows (Temporal.io).
> Source: [ADR-017](../../adr/ADR-017-service-communication.md), [ADR-011](../../adr/ADR-011-api-framework.md)

---

## 1. Internal RPC (tRPC)

**REQ-COMM-001** (Ubiquitous)
Internal service-to-service calls within the monorepo shall use tRPC for zero-codegen type-safe RPC with Zod input validation.

**REQ-COMM-002** (Ubiquitous)
tRPC routers shall be defined in `packages/` and imported by consuming `apps/`. Router definitions shall use Zod schemas for all input/output validation.

**REQ-COMM-003** (Ubiquitous)
tRPC procedures shall be classified as `publicProcedure` or `protectedProcedure` with authentication middleware.

**REQ-COMM-004** (Ubiquitous)
The tRPC client shall propagate OpenTelemetry trace context across service calls via request headers.

### Acceptance Criteria — tRPC

```gherkin
Scenario: Type-safe RPC call
  Given a tRPC router with a crawl.submit mutation
  When the client calls crawl.submit with valid input
  Then the call succeeds with typed response
  And input is Zod-validated at runtime

Scenario: Invalid input rejected
  Given a tRPC router
  When the client sends invalid input
  Then a ZodError is returned
  And the server never processes the request
```

---

## 2. Public API Contracts (TypeSpec/OpenAPI)

**REQ-COMM-005** (Ubiquitous)
Public-facing APIs shall be defined contract-first using TypeSpec, compiled to OpenAPI 3.0+ specs (3.1 when `@typespec/openapi3` emitter supports it).

**REQ-COMM-006** (Ubiquitous)
Generated OpenAPI specs shall be linted with Spectral on every CI run. Errors shall block merge.

**REQ-COMM-007** (Ubiquitous)
API versioning shall use URL prefix (`/api/v1/`, `/api/v2/`). Deprecated versions shall emit telemetry tracking usage before removal.

**REQ-COMM-008** (Event-driven)
When a TypeSpec definition changes, the CI pipeline shall regenerate OpenAPI specs and client SDKs.

### Acceptance Criteria — TypeSpec

```gherkin
Scenario: TypeSpec compiles to valid OpenAPI
  Given a TypeSpec service definition
  When tsp compile runs
  Then a valid OpenAPI 3.1 spec is generated
  And Spectral lint passes with zero errors
```

---

## 3. Domain Events (Redis Streams)

**REQ-COMM-009** (Ubiquitous)
Cross-bounded-context communication shall use domain events published to Redis Streams.

**REQ-COMM-010** (Ubiquitous)
Domain events shall follow a typed discriminated union with `type`, `version`, and `payload` fields.

**REQ-COMM-011** (Ubiquitous)
Event consumers shall use Redis Stream consumer groups for durable, at-least-once delivery.

**REQ-COMM-012** (Event-driven)
When a crawl URL status is updated, the system shall publish `CrawlCompleted` or `CrawlFailed` events.

**REQ-COMM-013** (Event-driven)
When new URLs are discovered during parsing, the system shall publish `URLDiscovered` events.

**REQ-COMM-014** (Ubiquitous)
Event schemas shall be versioned. Consumers shall handle unknown event versions gracefully (skip, not crash).

### Acceptance Criteria — Events

```gherkin
Scenario: Domain event published and consumed
  Given a CrawlCompleted event is published
  When a consumer group reads the stream
  Then the event is delivered exactly once per consumer
  And the event payload matches the schema

Scenario: Unknown event version handled
  Given a consumer receives an event with version 99
  When the consumer processes the event
  Then it logs a warning and skips the event
  And does not crash
```

---

## 4. Durable Workflows (Temporal.io)

**REQ-COMM-015** (Ubiquitous)
Multi-step crawl workflows (discover → fetch → parse → store → index) shall use Temporal.io for durable execution with compensating transactions.

**REQ-COMM-016** (Ubiquitous)
Each workflow step shall be implemented as a Temporal activity with configurable timeout and retry policy.

**REQ-COMM-017** (State-driven)
While a workflow step fails after retries, the system shall execute compensating transactions for previously completed steps (Saga pattern).

**REQ-COMM-018** (Ubiquitous)
Workflow state shall be queryable via Temporal's query API for observability and debugging.

### Acceptance Criteria — Temporal

```gherkin
Scenario: Workflow survives worker restart
  Given a multi-step crawl workflow in progress
  When the worker process restarts
  Then the workflow resumes from the last completed step
  And no steps are re-executed

Scenario: Compensating transaction on failure
  Given a workflow where the store step fails
  When compensating transactions run
  Then previously stored data is cleaned up
  And the workflow is marked as failed with reason
```

---

## 5. Ephemeral Messaging (Redis Pub/Sub)

**REQ-COMM-019** (Ubiquitous)
Ephemeral notifications (cache invalidation, live status updates) shall use Redis Pub/Sub.

**REQ-COMM-020** (Ubiquitous)
Redis Pub/Sub shall not be used for messages requiring delivery guarantees. Use Redis Streams for durable delivery.

---

## 6. Idempotency

**REQ-COMM-021** (Ubiquitous)
All mutating API endpoints shall support idempotency keys via the `Idempotency-Key` request header.

**REQ-COMM-022** (Event-driven)
When a request with a known idempotency key is received, the system shall return the cached response without re-executing the operation.

---

> **Provenance**: Created 2026-03-29 per ADR-020 Spec-Driven Development. Source: ADR-017, ADR-011, ADR-002.
