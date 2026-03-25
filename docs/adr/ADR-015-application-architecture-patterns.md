# ADR-015: Application Architecture Patterns

| Field | Value |
| --- | --- |
| **Status** | Accepted |
| **Date** | 2026-03-25 |
| **Deciders** | Architecture Council |
| **Relates to** | ADR-001, ADR-008, ADR-009, ADR-010, ADR-011, ADR-016, ADR-017 |

## Context

The IPF crawler operates as a distributed system with significant domain complexity (URL lifecycle management, per-domain rate policies, tiered fetching strategies, job scheduling with priority and retry semantics). Without explicit architectural patterns, code coupling grows organically — infrastructure concerns bleed into domain logic, database schemas drive API shapes, and changes ripple unpredictably across layers.

The project needs a structural architecture that provides clear dependency direction, framework independence for domain logic, testability via adapter substitution, and fast feature delivery with minimal merge conflicts.

Research into the 2025–2026 TypeScript ecosystem (see [docs/research/code.md](../research/code.md) Parts I–III and [docs/research/arch.md](../research/arch.md) Phase 3) evaluated five structural patterns: N-Tier Layered, Clean Architecture, Onion Architecture, Hexagonal (Ports & Adapters), and Vertical Slice Architecture (VSA).

## Decision

### 1. Hexagonal Architecture at Bounded Context Boundaries

Each bounded context (crawler, scheduler, API, worker) is organized as a hexagon with:

- **Application Core**: domain entities, value objects, domain services, use cases
- **Primary Adapters** (incoming): HTTP controllers, CLI handlers, gRPC endpoints, BullMQ job processors
- **Secondary Adapters** (outgoing): database repositories, Redis clients, S3 storage, external API clients
- **Ports**: TypeScript interfaces defined by the core that adapters implement

The dependency rule is absolute: adapters depend on the core; the core never imports adapter code. NestJS `@Module()` boundaries enforce the hexagon's faces; `@Injectable()` services serve as ports.

### 2. Vertical Slice Architecture Within Each Context

Within each bounded context, individual features are organized as vertical slices rather than horizontal technical layers. Each slice contains the endpoint handler, command/query, domain logic, and data access for one specific use case.

```
src/features/
├── crawl-url/
│   ├── crawl-url.command.ts        # Command definition
│   ├── crawl-url.handler.ts        # Use case / application logic
│   ├── crawl-url.controller.ts     # HTTP endpoint
│   └── crawl-url.module.ts         # NestJS module wiring
├── check-robots-txt/
│   ├── check-robots.query.ts
│   ├── check-robots.handler.ts
│   └── check-robots.module.ts
└── shared/                          # Cross-cutting within the context
    ├── domain/                      # Entities, value objects
    ├── ports/                       # Repository interfaces
    └── infrastructure/              # Port implementations
```

This hybrid (Hexagonal outer boundary + VSA inner organization) captures domain isolation with fast feature delivery — 44% fewer file changes per feature and minimal merge conflicts between developers.

### 3. Clean Architecture Layer Convention

Dependencies flow inward only:

```
┌──────────────────────────────────────────┐
│  Infrastructure (adapters, frameworks)   │  ← Redis, PostgreSQL, HTTP, BullMQ
├──────────────────────────────────────────┤
│  Application (use cases, commands)       │  ← Orchestrates domain operations
├──────────────────────────────────────────┤
│  Domain (entities, value objects, rules) │  ← Zero infrastructure dependencies
├──────────────────────────────────────────┤
│  Ports (interfaces)                      │  ← Contracts for adapters
└──────────────────────────────────────────┘
```

ESLint module-boundary rules enforce that inner layers never import from outer layers.

### 4. Domain-Driven Design

**Strategic DDD** (always applied):

- **Bounded Contexts**: Crawler, Scheduler, API Gateway, Worker, Storage — each a separate NestJS module or service with explicit public API
- **Ubiquitous Language**: Domain terms (CrawlJob, URLFrontier, DomainPolicy, FetchResult) used consistently in code and documentation
- **Context Map**: Documented relationships between contexts (Customer/Supplier between Scheduler and Worker; Anticorruption Layer between Crawler and external websites)

**Tactical DDD** (applied where domain complexity warrants):

- **Entities**: Objects with identity (a CrawlJob with ID is unique regardless of identical properties)
- **Value Objects**: Immutable, identity-less, compared by value (URL, DomainPolicy, RetryConfig) — modeled with `readonly` and `as const`
- **Aggregates**: CrawlJob as aggregate root enforcing invariants (max retries, valid URL, status transitions)
- **Domain Events**: `CrawlCompleted`, `CrawlFailed`, `URLDiscovered` — communicate across context boundaries via Redis Streams
- **Repositories**: Collection-like interfaces in the domain layer; infrastructure implements them
- **Domain Services**: Stateless operations spanning multiple aggregates (e.g., URLDeduplicationService)

**Heuristic**: Apply strategic DDD always (boundaries are cheap). Apply tactical DDD inside bounded contexts where domain complexity genuinely warrants it. For simple CRUD areas, plain services with DTOs are sufficient.

### 5. Modular Monolith First

The system starts as a modular monolith deployed as a single process with hard module boundaries. Services are only extracted into separate deployments when measured evidence exists:

- A specific module needs independent scaling beyond what the monolith can provide
- Team size exceeds 30–40 developers requiring autonomous deployment boundaries
- A module has genuinely different runtime requirements (e.g., Playwright worker vs API server)

The IPF crawler has a natural extraction point: Playwright-based workers ARE a separate deployment due to browser resource requirements (ADR-008). The API, scheduler, and static crawler can remain co-deployed until scaling evidence demands otherwise.

### 6. Feature-Based Folder Structure

Each service follows this directory convention:

```
src/
├── main.ts                    # Bootstrap + OTel init (MUST be first import)
├── app.module.ts              # NestJS root module
├── features/
│   ├── <feature>/
│   │   ├── domain/            # Entities, value objects, errors
│   │   ├── application/       # Commands, queries, use case handlers
│   │   ├── infrastructure/    # Port implementations (repositories, clients)
│   │   └── presentation/      # Controllers, DTOs (Zod schemas)
├── shared/
│   ├── filters/               # Global exception filters
│   ├── guards/                # Auth guards
│   ├── interceptors/          # Logging, timing, correlation
│   └── pipes/                 # Global validation pipe (Zod)
└── health/                    # Liveness + readiness endpoints
```

## Agentic Architecture Lens (ADR-018)

The Hexagonal + VSA hybrid is particularly well-suited to agentic coding environments:

### Hexagonal Boundaries as Agent Guardrails

The port/adapter boundary coincides with the boundary between deterministic domain logic and stochastic external dependencies (LLM APIs, databases, HTTP). The domain layer contains pure functions; adapters are thin implementations of domain-defined interfaces. The constraint that the domain cannot import infrastructure is a **hard context boundary** — agents cannot accidentally couple domain and infrastructure because ESLint module-boundary rules and the Guard Function chain (ADR-018 §2) catch violations immediately.

### VSA as Agent Task Boundary

A vertical slice maps naturally to an agent task scope. An agent implementing or modifying a feature loads the entire slice into a focused context without navigating a layered tree across multiple directories. The co-location of handler, service, schema, types, and tests within a single folder minimizes context rot (ADR-018 §1).

### DDD Bounded Contexts as Agent Scope

Bounded contexts prevent "prompt spaghetti" — agents modifying unrelated files across domain boundaries. When a codebase is organized into explicit bounded contexts with consistent ubiquitous language, an agent given a task scoped to one context will predictably stay within that boundary. Each bounded context becomes a workspace package with `@domain/[context]` imports, and cross-boundary violations are detectable by module boundary linting.
**DDD-Enforcer** (IEEE 2026): Achieves 100% detection accuracy across 15 architectural violation cases; provides hard boundaries agents cannot violate. The linting-based approach catches coupling violations at the Guard Function stage (ADR-018 §2) before they reach code review.
### Modular Monolith vs Microservices (Agentic Comparison)

| Dimension | Modular Monolith | Microservices |
| --- | --- | --- |
| Agent task atomicity | Single PR, full context | Multi-repo, context loss at boundaries |
| Context window usage | Unified dependency graph | Per-service context, integration gaps |
| Type safety across services | Full TypeScript inference | Codegen or manual sync required |
| Guard function coverage | CI covers whole system | Per-service CI, integration gaps |
| Complexity penalty | Low | High (orchestration, service mesh) |

The microservice extraction decision gate becomes: "Can this service boundary be owned by an agent team working in a separate context?" If not, the blast radius of multi-repo context management exceeds the benefits.

## Consequences

### Positive

- Domain logic is testable without any I/O — pure unit tests against entities and value objects
- Adapter substitution enables testing against in-memory stubs or real Testcontainers
- VSA organization means new features are additive (new files, not modifications to existing ones)
- Module boundaries prevent coupling between bounded contexts
- Tactical DDD applied selectively avoids over-engineering simple areas
- Modular monolith starting point avoids premature distributed system complexity

### Negative

- Hexagonal + VSA hybrid has a learning curve for developers unfamiliar with the pattern
- ESLint boundary enforcement requires configuration and maintenance
- Tactical DDD in complex areas requires upfront domain modeling investment
- Teams must resist the temptation to skip boundaries under delivery pressure

### Risks

- If ESLint boundary rules are bypassed (e.g., via eslint-disable), the architecture degrades silently
- Modular monolith extraction decision requires clear metrics — without them, extraction may happen too early or too late

## Evidence

- Vertical Slice Architecture requires 44% fewer file changes and 25% fewer lines per feature compared to Clean Architecture alone ([research/code.md](../research/code.md) Part I §1.1)
- Amazon Prime Video achieved 90% cost reduction migrating from microservices back to monolith ([research/code.md](../research/code.md) Part III §3.1)
- Teams < 30–40 developers should default to modular monolith; microservices coordination overhead only decreases at 50+ developers
- Hexagonal Architecture with NestJS DI provides natural adapter wiring via `@Module()` boundaries
- DDD-Enforcer: 100% detection accuracy across 15 architectural violation cases (IEEE 2026, [research/ai_coding.md](../research/ai_coding.md) §4.1)
- File size and context rot: 500-line file ≈ 9k–10k tokens; 50-line ≈ 900–1k tokens — VSA co-location directly reduces token consumption per agent task ([research/ai_coding.md](../research/ai_coding.md) §2.2)

## Related

- [ADR-001: Monorepo Tooling](ADR-001-monorepo-tooling.md) — Package structure foundation
- [ADR-008: HTTP & Parsing Stack](ADR-008-http-parsing-stack.md) — Extraction point in hexagonal architecture
- [ADR-009: Resilience Patterns](ADR-009-resilience-patterns.md) — Infrastructure adapter resilience
- [ADR-010: Data Layer](ADR-010-data-layer.md) — Bounded context storage
- [ADR-011: API Framework](ADR-011-api-framework.md) — Presentation layer (Fastify + NestJS)
- [ADR-014: Automation Strategy](ADR-014-automation-strategy.md) — Architecture compliance automated by quality gates
- [ADR-016: Coding Standards](ADR-016-coding-standards-principles.md) — CUPID + FOOP within architecture boundaries
- [ADR-017: Service Communication](ADR-017-service-communication.md) — Cross-boundary communication patterns
- [ADR-018: Agentic Coding](ADR-018-agentic-coding-conventions.md) — Agentic architecture lens (task boundaries = bounded contexts)

---

> **Provenance**: Created 2026-03-25 from analysis of [docs/research/arch.md](../research/arch.md) Phase 3, [docs/research/code.md](../research/code.md) Parts I–III, and [docs/research/ai_coding.md](../research/ai_coding.md) §4. Synthesizes architecture patterns and agentic architecture analysis into actionable project decisions. Updated 2026-03-25: added Related section with cross-references to ADR-001/008/009/010/011/014/016/017/018. Updated 2026-03-25: added DDD-Enforcer evidence, token consumption metrics for VSA co-location.
