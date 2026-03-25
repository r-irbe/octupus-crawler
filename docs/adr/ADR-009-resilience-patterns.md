# ADR-009: Resilience Patterns — cockatiel + Graceful Shutdown

| Field | Value |
| --- | --- |
| **Status** | Accepted |
| **Created** | 2026-03-24 |
| **Last Updated** | 2026-03-25 |
| **Author(s)** | Architecture Council |
| **Reviewers** | Architect, Skeptic, SRE, Distributed Systems Specialist, Network Engineer Advisor |
| **Supersedes** | N/A |
| **Superseded By** | N/A |

## Context

A distributed crawler must handle partial failures gracefully: individual domains may be down, DNS may fail, Redis may briefly unavailable during failover, and Kubernetes may terminate pods at any time. The system must continue operating under degraded conditions without data loss or cascading failures.

## Decision Drivers

- Per-domain failure isolation (one bad domain must not affect others)
- Graceful pod termination (no lost in-flight jobs)
- Circuit breaker pattern for failing domains
- Retry with backoff (not hammering failed endpoints)
- Bulkhead isolation (resource partitioning)
- Observable failure state (metrics, events)
- Kubernetes liveness/readiness alignment

## Considered Options

### Option A: cockatiel

**Pros:**

- TypeScript-first resilience library
- Circuit breaker, retry, timeout, bulkhead, fallback — composable
- Event emitters for observability integration
- Lightweight, zero dependencies
- Policy composition via `wrap()`

**Cons:**

- Smaller community than Polly (.NET) — but this is Node.js
- No distributed circuit breaker (per-process only)

### Option B: opossum

**Pros:**

- Popular Node.js circuit breaker
- Prometheus metrics built-in

**Cons:**

- Circuit breaker only — no retry, timeout, bulkhead composition
- Callback-oriented API
- Less active maintenance

### Option C: Custom implementation

**Pros:**

- Exactly what we need, no extra dependencies

**Cons:**

- Reinventing well-tested patterns
- Maintenance burden
- Easy to get wrong (race conditions, state management)

## Decision

Adopt **cockatiel** for resilience policies with a comprehensive **graceful shutdown** pattern.

### Resilience Policies

```typescript
// packages/shared/src/resilience.ts
import {
  CircuitBreakerPolicy,
  ConsecutiveBreaker,
  ExponentialBackoff,
  retry,
  timeout,
  wrap,
  handleAll,
  TimeoutStrategy,
} from 'cockatiel';

// Per-domain circuit breaker factory
const domainBreakers = new Map<string, CircuitBreakerPolicy>();

export function getDomainPolicy(domain: string) {
  if (!domainBreakers.has(domain)) {
    const breaker = new CircuitBreakerPolicy(handleAll, {
      halfOpenAfter: 30_000,
      breaker: new ConsecutiveBreaker(5),
    });

    breaker.onBreak(() => {
      metrics.circuitOpen.add(1, { domain });
      logger.warn({ domain }, 'Circuit opened');
    });

    breaker.onReset(() => {
      metrics.circuitClosed.add(1, { domain });
      logger.info({ domain }, 'Circuit reset');
    });

    const retryPolicy = retry(handleAll, {
      maxAttempts: 3,
      backoff: new ExponentialBackoff({ initialDelay: 1000, maxDelay: 30_000 }),
    });

    const timeoutPolicy = timeout(30_000, TimeoutStrategy.Cooperative);

    // Compose: timeout → retry → circuit breaker
    const policy = wrap(timeoutPolicy, retryPolicy, breaker);
    domainBreakers.set(domain, policy);
  }

  return domainBreakers.get(domain)!;
}
```

### Graceful Shutdown

```typescript
// packages/shared/src/health.ts
import { createServer } from 'http';

export function createHealthServer(port: number) {
  let ready = false;
  let alive = true;

  const server = createServer((req, res) => {
    if (req.url === '/healthz') {
      res.writeHead(alive ? 200 : 503).end(alive ? 'ok' : 'shutting down');
    } else if (req.url === '/readyz') {
      res.writeHead(ready ? 200 : 503).end(ready ? 'ok' : 'not ready');
    } else {
      res.writeHead(404).end();
    }
  });

  server.listen(port);

  return {
    markReady: () => { ready = true; },
    markNotReady: () => { ready = false; },
    markDead: () => { alive = false; },
    close: () => server.close(),
  };
}
```

```typescript
// packages/worker/src/index.ts
export async function startWorker() {
  const health = createHealthServer(8081);
  const worker = new Worker('crawl', processJob, workerOptions);

  health.markReady();

  // Graceful shutdown on SIGTERM (K8s sends this)
  const shutdown = async () => {
    logger.info('SIGTERM received, starting graceful shutdown');

    // 1. Stop accepting new jobs
    health.markNotReady();

    // 2. Close worker (finishes in-flight jobs)
    await worker.close();

    // 3. Flush telemetry
    await telemetry.shutdown();

    // 4. Close connections
    await redis.quit();
    await pg.end();

    // 5. Mark dead, close health server
    health.markDead();
    health.close();

    logger.info('Graceful shutdown complete');
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
```

### Kubernetes Configuration

```yaml
# Deployment spec for workers
spec:
  terminationGracePeriodSeconds: 60 # Give 60s to drain
  containers:
    - name: worker
      livenessProbe:
        httpGet:
          path: /healthz
          port: 8081
        initialDelaySeconds: 10
        periodSeconds: 10
      readinessProbe:
        httpGet:
          path: /readyz
          port: 8081
        initialDelaySeconds: 5
        periodSeconds: 5
```

## Consequences

### Positive

- Failing domains are isolated via per-domain circuit breakers
- No thundering herd on recovery (exponential backoff)
- Zero data loss during pod termination (graceful drain)
- K8s readiness probe stops routing before shutdown begins
- All failure events are observable via metrics and logs

### Negative

- Per-domain circuit breaker maps consume memory (mitigated: LRU eviction for inactive domains)
- Circuit breakers are per-process, not distributed (acceptable: each worker independently protects itself)

### Risks

- SIGTERM handling races with in-flight jobs (mitigated: BullMQ's close() waits for active jobs)
- terminationGracePeriodSeconds too short for long pages (mitigated: 60s with 30s fetch timeout)

## Validation

- Circuit opens after 5 consecutive failures to a domain
- Circuit resets after 30s half-open test succeeds
- Zero in-flight jobs lost during rolling update
- Graceful shutdown completes within terminationGracePeriodSeconds
- Metrics show circuit state transitions in Grafana

## Full Resilience Stack

The complete resilience stack, ordered from outermost to innermost:

```text
Incoming Request
    ↓
[1] Global Rate Limiter         (Redis sliding window, per IP/user)
    ↓
[2] Request Timeout             (30s hard deadline, configurable per route)
    ↓
[3] Circuit Breaker             (cockatiel, per downstream dependency)
    ↓
[4] Retry with Backoff          (exponential + jitter, idempotent ops only)
    ↓
[5] Bulkhead                    (resource isolation per dependency)
    ↓
[6] Fallback / Degraded Mode    (cached stale data, default response)
    ↓
[7] Dead Letter Queue           (failed jobs survive in BullMQ)
    ↓
Downstream Service / DB / Redis
```

### Idempotency Keys

Every mutating operation exposed via API supports idempotency keys to enable safe client retries:

```typescript
async function idempotencyMiddleware(req: FastifyRequest, reply: FastifyReply) {
  const key = req.headers['idempotency-key'] as string | undefined;
  if (key) {
    const cached = await redis.get(`idem:${key}`);
    if (cached) return reply.status(200).send(JSON.parse(cached));
  }
  reply.addHook('onSend', async (_req, reply, payload) => {
    if (key && reply.statusCode < 400) {
      await redis.setex(`idem:${key}`, 86400, payload as string);
    }
  });
}
```

## Related

- [ADR-002: Job Queue System](ADR-002-job-queue-system.md) — BullMQ retry complements circuit breakers
- [ADR-006: Observability Stack](ADR-006-observability-stack.md) — Resilience events exported as metrics
- [ADR-008: HTTP & Parsing Stack](ADR-008-http-parsing-stack.md) — Fetch operations wrapped in policies
- [ADR-016: Coding Standards](ADR-016-coding-standards-principles.md) — Concurrency model (event loop + worker threads + cluster)

---

> **Provenance**: Created 2026-03-24; updated 2026-03-25 with 7-layer resilience stack, idempotency keys, and cross-references based on [docs/research/arch.md](../research/arch.md) Phase 7.
