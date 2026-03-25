# ADR-017: Service Communication & Workflow Orchestration

| Field | Value |
| --- | --- |
| **Status** | Accepted |
| **Date** | 2026-03-25 |
| **Deciders** | Architecture Council |
| **Relates to** | ADR-002, ADR-006, ADR-008, ADR-009, ADR-011, ADR-015, ADR-016 |

## Context

The IPF crawler has multiple communication patterns: internal TypeScript service-to-service calls within the monorepo, a public API for external consumers, high-throughput inter-service messaging, asynchronous background job processing, and long-running multi-step workflows (crawl → parse → store → index). Each pattern has different requirements for type safety, throughput, durability, and observability.

The existing ADRs cover BullMQ for job queues (ADR-002) and Fastify for HTTP (ADR-011), but do not address internal typed RPC, contract-first public API design, gRPC for high-throughput paths, or durable workflow orchestration for complex multi-step operations.

Research (see [docs/research/arch.md](../research/arch.md) Phase 5, Phase 3 §3.4, and [docs/research/code.md](../research/code.md) Part III §3.2) evaluated tRPC, OpenAPI/TypeSpec, gRPC, Saga patterns, and Temporal.io.

## Decision

### 1. Communication Pattern Selection

| Pattern | Technology | Use Case |
| --- | --- | --- |
| Internal TypeScript RPC | **tRPC** | Monorepo service-to-service calls within type-safe boundary |
| Public/external API | **OpenAPI 3.1** via TypeSpec | Contract-first, multi-language client generation |
| High-throughput service mesh | **gRPC** + Protobuf | Binary protocol for performance-critical internal paths |
| Async background processing | **BullMQ** (ADR-002) | Simple job queues, retries, scheduled work |
| Event fan-out (ephemeral) | **Redis Pub/Sub** | Cache invalidation, live notifications, presence |
| Durable event log | **Redis Streams** | Event replay, consumer groups, audit trail |
| Durable long-running workflows | **Temporal.io** | Multi-step processes with compensating transactions |

### 2. tRPC for Internal APIs

tRPC provides zero-codegen, instant type inference between TypeScript services within the monorepo:

```typescript
// Shared router definition — type-safe across client and server
const appRouter = router({
  crawl: router({
    submit: protectedProcedure
      .input(z.object({ url: z.string().url(), priority: z.number().int().min(0).max(10) }))
      .mutation(({ ctx, input }) => crawlService.submit(input)),
    status: publicProcedure
      .input(z.object({ jobId: z.string().uuid() }))
      .query(({ input }) => crawlService.getStatus(input.jobId)),
  }),
});

export type AppRouter = typeof appRouter;
```

**Decision rule**: Use tRPC for any API where both client and server are TypeScript in the same monorepo. The Zod input validation provides runtime safety; the type inference provides compile-time safety.

### 3. TypeSpec for Public API Contracts

For APIs consumed by external clients or non-TypeScript services, use **TypeSpec** (Microsoft's open-source API description language) to define contracts that compile to OpenAPI 3.1, JSON Schema, and client code:

```typespec
@service({ title: "IPF Crawler API", version: "1.0.0" })
namespace CrawlerAPI;

model CrawlRequest {
  url: string;
  @minValue(0) @maxValue(10) priority?: int32;
}

@route("/crawl")
interface CrawlOps {
  @post submit(@body body: CrawlRequest): CrawlJob | BadRequestResponse;
  @get @route("/{id}") status(@path id: string): CrawlJob | NotFoundResponse;
}
```

**API versioning strategy**: URL versioning (`/api/v1/`, `/api/v2/`) for major breaking changes. Never remove a version without a deprecation period and telemetry tracking actual usage.

### 4. Saga Pattern for Distributed Transactions

For multi-step operations that span bounded contexts (e.g., crawler discovers URL → scheduler checks deduplication → worker fetches page → storage persists content → indexer updates search), the Saga pattern replaces ACID transactions:

| Aspect | Choreography | Orchestration |
| --- | --- | --- |
| Control | Decentralized; services react to events | Centralized; coordinator commands steps |
| Observability | Hard; requires external correlation | Easy; one place tracks state |
| Coupling | Loose; services don't know each other | Tighter; coordinator knows all participants |
| Failure handling | Distributed and complex | Centralized and clear |
| Debuggability | Challenging | Easier |
| Best fit | Long-running, parallel, scalable workflows | Linear, transactional, step-by-step flows |

**Decision**: Use **orchestration** (via Temporal.io) for complex multi-step crawl workflows with compensating transactions. Use **choreography** (via Redis Streams domain events) for loosely coupled cross-context notifications.

### 5. Temporal.io for Durable Workflows

Temporal.io provides durable, replayable, fault-oblivious workflow execution with a TypeScript SDK:

- **Workflows**: Deterministic functions that describe the sequence of steps. Survive process restarts — Temporal replays from event history
- **Activities**: Non-deterministic operations (HTTP calls, database writes, Redis operations) wrapped as retryable, timeout-controlled units
- **Compensating transactions**: Each step can define a compensation function that runs if a subsequent step fails (Saga pattern)

**Decision rule**:

- **BullMQ** (ADR-002): Simple queues, fire-and-forget jobs, scheduled cron-like work, rate-limited domain crawling
- **Temporal**: Multi-step workflows with visibility requirements, compensating transactions, long-running processes (minutes to days), workflows that must survive arbitrary failures

### 6. Event-Driven Architecture

Cross-bounded-context communication uses domain events via Redis Streams:

- **Producers**: Emit events after completing domain operations (`CrawlCompleted`, `URLDiscovered`, `ContentStored`)
- **Consumers**: Subscribe via consumer groups for durable, exactly-once processing
- **Schema**: Events follow a typed discriminated union with versioning:

```typescript
type DomainEvent =
  | { type: 'CrawlCompleted'; version: 1; payload: { jobId: string; url: string; statusCode: number } }
  | { type: 'URLDiscovered'; version: 1; payload: { sourceUrl: string; discoveredUrls: string[] } }
  | { type: 'ContentStored'; version: 1; payload: { jobId: string; storageKey: string } };
```

**CQRS scope**: Separated read/write models where read path has different scaling or query requirements. Full Event Sourcing only for audit-critical bounded contexts (e.g., crawl history where the complete event log has compliance value). Default to CQRS without Event Sourcing.

## Consequences

### Positive

- tRPC eliminates API contract drift within the monorepo — types are always in sync
- TypeSpec generates OpenAPI specs and client SDKs from a single source of truth
- Temporal provides visibility into long-running workflow state and automatic retry/compensation
- Redis Streams provide durable event delivery with consumer group semantics
- Clear decision rules prevent technology sprawl — each communication pattern has one choice

### Negative

- Temporal requires a separate server deployment (adds operational complexity)
- tRPC ties internal APIs to TypeScript — if a non-TS service joins the monorepo, it cannot use tRPC endpoints directly
- Multiple communication technologies increase cognitive load for developers
- Event schema versioning requires discipline as the system evolves

### Risks

- Temporal adoption may be premature if crawl workflows remain simple enough for BullMQ
- Redis Streams used as a full event bus may hit throughput limits at extreme scale (consider Kafka migration path)
- TypeSpec is relatively new — ecosystem tooling may have gaps

## Evidence

- tRPC provides zero-codegen type safety; Zod input validation at runtime + TypeScript inference at compile time ([research/arch.md](../research/arch.md) Phase 5 §5.3)
- Orchestrated services are easier to debug: a 22-bug test suite showed orchestration via workflow engines more debuggable than choreography ([research/code.md](../research/code.md) Part III §3.2)
- BullMQ is operationally simpler for simple queues; Temporal justified when durable multi-step workflows are needed ([research/code.md](../research/code.md) Part III §3.2)
- Redis Pub/Sub for ephemeral broadcasts; Redis Streams for durable event processing with consumer groups ([research/arch.md](../research/arch.md) Phase 4 §4.3)

## Related

- [ADR-002: Job Queue System](ADR-002-job-queue-system.md) — BullMQ queue patterns
- [ADR-006: Observability Stack](ADR-006-observability-stack.md) — Distributed tracing across service boundaries
- [ADR-008: HTTP & Parsing Stack](ADR-008-http-parsing-stack.md) — HTTP client for external communication
- [ADR-009: Resilience Patterns](ADR-009-resilience-patterns.md) — Circuit breakers and retries for inter-service calls
- [ADR-011: API Framework](ADR-011-api-framework.md) — tRPC + Fastify integration
- [ADR-015: Architecture Patterns](ADR-015-application-architecture-patterns.md) — Hexagonal ports for communication adapters
- [ADR-016: Coding Standards](ADR-016-coding-standards-principles.md) — Discriminated unions for events, Zod for schemas
- [ADR-020: Spec-Driven Development](ADR-020-spec-driven-development.md) — Contract-first API development, TypeSpec → OpenAPI pipeline, Spectral + Dredd + Pact verification

---

> **Provenance**: Created 2026-03-25 from analysis of [docs/research/arch.md](../research/arch.md) Phases 3–5 and [docs/research/code.md](../research/code.md) Part III. Synthesizes service communication research into actionable routing decisions. Updated 2026-03-25: added Related section with cross-references. Added ADR-020 cross-reference for contract-first patterns.
