# AsyncLocalStorage Pattern

| Field | Value |
| --- | --- |
| **Status** | Accepted |
| **Created** | 2026-03-25 |
| **Last Updated** | 2026-03-25 |
| **ADR References** | ADR-006 (Observability), ADR-011 (API Framework), ADR-015 (Architecture) |

## Overview

Node.js `AsyncLocalStorage` (from `node:async_hooks`) provides request-scoped context that propagates automatically through the async call chain — without threading context parameters through every function signature. This is the canonical mechanism for correlation IDs, tenant context, trace propagation, and per-request metadata in IPF services.

## Why AsyncLocalStorage

| Problem | Without ALS | With ALS |
| --- | --- | --- |
| Correlation IDs | Pass `correlationId` through every function parameter | Access `getCorrelationId()` anywhere in the chain |
| Tenant context | Thread `tenantId` through domain layer (violates hexagonal) | Domain layer stays pure; context is ambient |
| OTel trace context | Manual span propagation | Automatic via `@opentelemetry/context-async-hooks` |
| Request logging | Logger instance threaded through call chain | `getRequestLogger()` returns pre-enriched logger |

## Architecture

```text
┌──────────────────────────────────────────────────────┐
│  Fastify Request Lifecycle                           │
│                                                      │
│  onRequest hook                                      │
│    │                                                 │
│    ├─ Create ALS store: { correlationId, tenant,     │
│    │    traceContext, startTime, logger }             │
│    │                                                 │
│    └─ als.run(store, () => { ... handler chain })    │
│         │                                            │
│         ├─ Presentation layer (controller)           │
│         ├─ Application layer (command/query handler)  │
│         ├─ Domain layer (pure business logic) ←───── │
│         ├─ Infrastructure (DB, Redis, HTTP)          │
│         │    └─ Automatic context in all layers      │
│         │                                            │
│         └─ onResponse hook: log with correlationId   │
└──────────────────────────────────────────────────────┘
```

## Implementation Pattern

### Store Type Definition

```typescript
// packages/core/src/request-context.ts
import { AsyncLocalStorage } from 'node:async_hooks';

interface RequestStore {
  readonly correlationId: string;
  readonly tenantId: string;
  readonly traceId: string;
  readonly spanId: string;
  readonly startTime: number;
  readonly userId?: string;
}

const requestContext = new AsyncLocalStorage<RequestStore>();

export function getRequestContext(): RequestStore {
  const store = requestContext.getStore();
  if (!store) {
    throw new Error('RequestContext accessed outside of request scope');
  }
  return store;
}

export function getCorrelationId(): string {
  return getRequestContext().correlationId;
}

export { requestContext };
```

### Fastify Integration

```typescript
// apps/api-gateway/src/plugins/request-context.plugin.ts
import { FastifyPluginAsync } from 'fastify';
import { randomUUID } from 'node:crypto';
import { requestContext } from '@ipf/core/request-context';

const requestContextPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', (request, _reply, done) => {
    const store: RequestStore = {
      correlationId: request.headers['x-correlation-id']?.toString()
        ?? randomUUID(),
      tenantId: request.headers['x-tenant-id']?.toString() ?? 'default',
      traceId: request.span?.spanContext().traceId ?? randomUUID(),
      spanId: request.span?.spanContext().spanId ?? '',
      startTime: Date.now(),
      userId: request.user?.id,
    };

    requestContext.run(store, done);
  });
};

export default requestContextPlugin;
```

### Logger Integration (ADR-006)

```typescript
// packages/observability/src/request-logger.ts
import { pino } from 'pino';
import { getRequestContext } from '@ipf/core/request-context';

export function getRequestLogger(): pino.Logger {
  const ctx = getRequestContext();
  return pino({
    level: process.env['LOG_LEVEL'] ?? 'info',
  }).child({
    correlationId: ctx.correlationId,
    tenantId: ctx.tenantId,
    traceId: ctx.traceId,
  });
}
```

### OTel Integration (ADR-006)

OpenTelemetry's Node.js SDK automatically uses `AsyncLocalStorage` via `@opentelemetry/context-async-hooks`. When OTel is initialized as the first import in `main.ts` (MUST rule #9), trace context propagates automatically. The `RequestStore.traceId` bridges our correlation ID system with OTel traces.

## Rules

1. **Create store in Fastify `onRequest` hook** — never in middleware or domain code
2. **Store is immutable** — use `readonly` properties; create new store for child contexts
3. **Domain layer reads context, never writes** — writing context is an infrastructure concern
4. **Always provide fallback for missing context** — background jobs and tests may not have request scope
5. **Use `getRequestContext()` accessor** — never import `AsyncLocalStorage` directly in domain code

## Testing

```typescript
// Use requestContext.run() in tests to simulate request scope
import { requestContext } from '@ipf/core/request-context';

it('should access correlation ID in request scope', () => {
  const store = {
    correlationId: 'test-correlation-id',
    tenantId: 'test-tenant',
    traceId: 'test-trace',
    spanId: 'test-span',
    startTime: Date.now(),
  };

  requestContext.run(store, () => {
    const id = getCorrelationId();
    expect(id).toBe('test-correlation-id');
  });
});
```

## BullMQ Worker Integration

For background workers, create the ALS store in the job processor:

```typescript
// apps/api-gateway/src/processors/crawl.processor.ts
import { requestContext } from '@ipf/core/request-context';

async function processCrawlJob(job: Job<CrawlJobData>): Promise<void> {
  const store: RequestStore = {
    correlationId: job.data.correlationId ?? randomUUID(),
    tenantId: job.data.tenantId,
    traceId: job.data.traceId ?? randomUUID(),
    spanId: '',
    startTime: Date.now(),
  };

  await requestContext.run(store, async () => {
    // All downstream code has request context
    await executeCrawl(job.data);
  });
}
```

## Related

- [ADR-006: Observability](../adr/ADR-006-observability-stack.md) — OTel + Pino structured logging
- [ADR-011: API Framework](../adr/ADR-011-api-framework.md) — Fastify request lifecycle
- [ADR-015: Architecture](../adr/ADR-015-application-architecture-patterns.md) — Hexagonal: domain layer stays pure
- [ADR-021: Context Collapse](../adr/ADR-021-context-collapse-prevention.md) — Correlation IDs aid collapse detection
- [packages/core/src/](../../packages/core/src/) — Shared request context types
- [packages/observability/src/](../../packages/observability/src/) — Request-scoped logger

---

> **Provenance**: Created 2026-03-25. Documents the AsyncLocalStorage pattern for request-scoped context propagation across IPF services. Referenced by ADR-006, ADR-011, ADR-015, and the `.github/copilot-instructions.md` Context Management section.
