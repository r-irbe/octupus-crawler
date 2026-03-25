# ADR-011: API Framework — Fastify

| Field | Value |
| --- | --- |
| **Status** | Accepted |
| **Created** | 2026-03-24 |
| **Last Updated** | 2026-03-25 |
| **Author(s)** | Architecture Council |
| **Reviewers** | Architect, Skeptic, API Designer Advisor, DevEx Advisor, SRE |
| **Supersedes** | N/A |
| **Superseded By** | N/A |

## Context

The crawler needs a management API for starting/stopping crawls, querying results, managing seed URLs, and exposing system health. The API must be performant, type-safe, and auto-instrumented for observability.

## Decision Drivers

- Request throughput and latency
- TypeScript-first with schema validation
- OpenTelemetry auto-instrumentation
- Plugin ecosystem (auth, CORS, rate limiting)
- JSON serialization performance
- Developer experience

## Considered Options

### Option A: Fastify

**Pros:**

- 2-3x faster than Express (fast-json-stringify, schema-based serialization)
- Built-in JSON Schema validation for request/response
- TypeScript-first with type providers (Type-Provider-Zod)
- Plugin architecture — encapsulation and isolation
- OpenTelemetry auto-instrumented
- Built-in logging via pino (zero-cost serialization)

**Cons:**

- Smaller middleware ecosystem than Express (offset by plugin quality)
- Plugin encapsulation model has a learning curve

### Option B: Express

**Pros:**

- Largest ecosystem, most middleware
- Universal familiarity

**Cons:**

- 2-3x slower than Fastify
- No built-in schema validation
- Limited TypeScript support (bolt-on types)
- Express 5 still not fully stable

### Option C: Hono

**Pros:**

- Very fast, multi-runtime
- Compact API

**Cons:**

- Newer, smaller ecosystem
- Less mature plugin system
- Primarily designed for edge/serverless, not K8s services

## Decision

Adopt **Fastify** as the API framework for the management API.

### Implementation

```typescript
// packages/api/src/server.ts
import Fastify from 'fastify';
import { serializerCompiler, validatorCompiler, ZodTypeProvider } from 'fastify-type-provider-zod';

export async function createServer() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
    },
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Register routes
  await app.register(import('./routes/crawls.js'));
  await app.register(import('./routes/results.js'));
  await app.register(import('./routes/health.js'));

  return app;
}
```

```typescript
// packages/api/src/routes/crawls.ts
import { z } from 'zod';
import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

const crawlsPlugin: FastifyPluginAsyncZod = async (app) => {
  app.post('/api/v1/crawls', {
    schema: {
      body: z.object({
        name: z.string().min(1),
        seedUrls: z.array(z.string().url()).min(1),
        maxDepth: z.number().int().min(0).max(10).default(3),
        maxPages: z.number().int().min(1).default(10000),
      }),
      response: {
        201: z.object({
          id: z.number(),
          status: z.literal('active'),
          createdAt: z.string().datetime(),
        }),
      },
    },
  }, async (request, reply) => {
    const crawl = await createCrawlSession(request.body);
    return reply.status(201).send(crawl);
  });
};

export default crawlsPlugin;
```

## Consequences

### Positive

- 75K+ req/sec throughput for simple endpoints
- Zod schemas provide compile-time AND runtime validation
- Auto-generated OpenAPI spec via fastify-swagger
- pino logging integrates directly with OTel log bridge
- Request/response schemas serve as living documentation

### Negative

- Plugin encapsulation model requires understanding Fastify's DI
- Smaller middleware selection than Express (mitigated: core needs covered)

### Risks

- Fastify major version breaking changes (mitigated: stable v5 release, SemVer)

## NestJS + Fastify Adapter

For services with teams > 3 engineers or where cross-cutting concerns (auth guards, interceptors, pipes, DI) are needed, use **NestJS with the Fastify adapter**:

| Criterion | Fastify standalone | NestJS + Fastify adapter |
| --- | --- | --- |
| Raw performance | ★★★★★ | ★★★★☆ |
| DI / IoC container | Manual | Built-in |
| Decorator-based routing | Plugin | Built-in |
| Team scaling | Convention-based | Enforced structure |
| Microservice transport | Manual | Built-in (gRPC, Redis, MQTT) |

**Decision rule**: Raw Fastify for performance-critical gateway/edge services and the crawler's lightweight API. NestJS+Fastify for services with complex DI needs and larger team involvement.

### Request Lifecycle

```text
Client Request
    ↓
[Transport] Fastify/HTTP → WebSocket → gRPC
    ↓
[Auth Middleware] JWT verification + RBAC
    ↓
[Rate Limiter] Redis sliding window per client
    ↓
[Request Validation] Zod schema validation (fail fast)
    ↓
[Route Handler / Controller]
    ↓
[Use Case / Application Service]
    ↓
[Domain Logic]
    ↓
[Repository / Port]
    ↓
[Infrastructure] DB / Redis / External API
    ↓
[Response Serialization] Typed response schema
    ↓
[Response Middleware] Correlation ID, timing headers
    ↓
Client Response
```

## API Communication Patterns

This ADR covers the HTTP framework. For internal typed RPC (tRPC), public contract-first APIs (TypeSpec/OpenAPI), gRPC for high-throughput, and event-driven patterns (Redis Streams), see [ADR-017: Service Communication](ADR-017-service-communication.md).

## Validation

- API response latency: < 10ms p95 for simple queries
- Zero unvalidated request bodies reaching handlers
- OpenAPI spec auto-generated and passes validation
- All routes covered by integration tests

## Related

- [ADR-006: Observability Stack](ADR-006-observability-stack.md) — Fastify auto-instrumented
- [ADR-013: Configuration Management](ADR-013-configuration-management.md) — Zod shared with config validation
- [ADR-007: Testing Strategy](ADR-007-testing-strategy.md) — API routes tested via inject()
- [ADR-015: Architecture Patterns](ADR-015-application-architecture-patterns.md) — Feature-based folder structure for controllers
- [ADR-016: Coding Standards](ADR-016-coding-standards-principles.md) — Error handling strategy at HTTP boundary
- [ADR-017: Service Communication](ADR-017-service-communication.md) — tRPC, TypeSpec, gRPC, event patterns
- [ADR-020: Spec-Driven Development](ADR-020-spec-driven-development.md) — Contract-first API development, Spectral linting, Dredd validation

---

> **Provenance**: Created 2026-03-24; updated 2026-03-25 with NestJS+Fastify adapter option, request lifecycle, and ADR-017 cross-references based on [docs/research/arch.md](../research/arch.md) Phase 3 and Phase 5. Added ADR-020 cross-reference for contract-first API patterns.
