# Application Lifecycle — Design

> Architecture for startup sequencing, graceful shutdown, signal handling, and worker processing.
> Implements: [requirements.md](requirements.md) | ADRs: [ADR-009](../../adr/ADR-009-resilience-patterns.md), [ADR-013](../../adr/ADR-013-configuration-management.md)

---

## 1. Startup Sequence

```mermaid
sequenceDiagram
    participant Main
    participant Config
    participant Obs as Observability
    participant Infra as Infrastructure
    participant Worker
    participant Coord as Coordinator

    Main->>Config: loadConfig(process.env)
    alt Invalid
        Config-->>Main: Result.err → exit(1)
    end
    Config-->>Main: Result.ok(config)
    Main->>Config: validateSeeds(config.seedUrls)
    alt Empty
        Main->>Main: exit(1)
    end

    Main->>Obs: createLogger(config)
    Main->>Obs: startTracer(config)
    Main->>Obs: createMetrics(config)
    Main->>Obs: startMetricsServer(config)

    Main->>Infra: connectStateStore(config)
    Main->>Infra: createFrontier(storeConnection)
    Main->>Infra: createJobConsumer(config)

    Main->>Worker: start()
    Main->>Coord: seed(seedUrls)
    Main->>Coord: waitForCompletion()
```

Covers: REQ-LIFE-001 to 006

## 2. Graceful Shutdown

```mermaid
graph TD
    TRIGGER[Shutdown Trigger] --> GUARD{Idempotent guard}
    GUARD -->|already shutting down| SKIP[Skip]
    GUARD -->|first call| PHASE1[Phase 1: Drain]
    PHASE1 -->|consumer.close with timeout| PHASE2[Phase 2: Teardown]
    PHASE2 -->|Promise.allSettled| DONE[Log results + exit]

    subgraph "Phase 2 Teardown (parallel)"
        T1[Frontier.close]
        T2[ControlPlane.close]
        T3[Tracer.shutdown]
        T4[MetricsServer.close]
        T5[StateStore.close]
    end
```

```typescript
interface ShutdownConfig {
  readonly drainTimeout: number     // Phase 1 timeout (default: 15s)
  readonly teardownTimeout: number  // Phase 2 timeout (default: 8s)
}

type ShutdownReason =
  | { _tag: 'Signal'; signal: string }
  | { _tag: 'Completion' }
  | { _tag: 'Error'; cause: unknown }
  | { _tag: 'Abort'; reason: string }
```

Key design:

- Idempotent via boolean guard (REQ-LIFE-018)
- Phase 1: Consumer drain with configurable timeout (REQ-LIFE-019)
- Phase 2: `Promise.allSettled()` — one failure doesn't block others (REQ-LIFE-020)
- Each failure logged with component name (REQ-LIFE-021)
- Typed shutdown reason (REQ-LIFE-022)
- Coordinator clears poll interval, settles pending promise (REQ-LIFE-023)
- Coordinator does not close shared resources (REQ-LIFE-024)

## 3. Signal Handler Mapping

| Signal/Event | Shutdown Reason | Exit Code | Covers |
| --- | --- | --- | --- |
| SIGINT | `{ _tag: 'Signal', signal: 'SIGINT' }` | 0 | REQ-LIFE-011 |
| SIGTERM | `{ _tag: 'Signal', signal: 'SIGTERM' }` | 0 | REQ-LIFE-012 |
| Uncaught exception | `{ _tag: 'Error', cause }` | 1 | REQ-LIFE-013 |
| Unhandled rejection | `{ _tag: 'Error', cause }` | 1 | REQ-LIFE-014 |
| Main throws | `{ _tag: 'Error', cause }` | 1 | REQ-LIFE-015 |
| State-store abort | `{ _tag: 'Abort', reason }` | 3 | REQ-LIFE-016 |
| Crawl complete | `{ _tag: 'Completion' }` | 0 | REQ-LIFE-017 |

## 4. Worker Job Processing

```mermaid
graph TD
    JOB[Job received] --> VAL{Payload valid?}
    VAL -->|no| REJECT[Reject job]
    VAL -->|yes| PIPE[Execute crawl pipeline]
    PIPE -->|ok| METRICS_OK[Record success metrics]
    PIPE -->|err: queue_error| RETHROW[Re-throw for retry]
    PIPE -->|err: other| METRICS_FAIL[Record failure metrics]
    METRICS_OK --> DONE[Job complete]
    METRICS_FAIL --> DONE
```

- Payload validated via Zod schema or type guard (REQ-LIFE-025)
- `queue_error` re-thrown to trigger queue retry (REQ-LIFE-026)
- Metrics recorded for all outcomes (REQ-LIFE-027)
- Single fetcher instance reused (REQ-LIFE-028)

## 5. Seeding Design

```typescript
async function seedFrontier(
  seeds: string[],
  frontier: Frontier,
  logger: Logger,
  metrics: CrawlMetrics,
): Promise<void> {
  const entries: FrontierEntry[] = []
  for (const raw of seeds) {
    const result = createCrawlUrl(raw)
    if (result.isErr()) {
      logger.warn('Invalid seed URL, skipping', { url: raw, error: result.error })
      continue
    }
    entries.push({
      url: result.value,
      depth: 0,
      discoveredBy: 'coordinator',
      discoveredAt: Date.now(),
      parentUrl: null,
    })
  }
  const enqueueResult = await frontier.enqueue(entries)
  if (enqueueResult.isErr()) {
    logger.error('Seed enqueue failed', { error: enqueueResult.error })
  }
  const size = await frontier.size()
  if (size.isOk()) {
    metrics.setFrontierSize(size.value.total)
  }
}
```

Covers: REQ-LIFE-007 to 010

## 6. Design Decisions

| Decision | Choice | Rationale |
| --- | --- | --- |
| Shutdown guard | Boolean flag (atomic in single-threaded JS) | Simple, safe (REQ-LIFE-018) |
| Double signal | Log + ignore second signal | Prevents force-exit race (REQ-LIFE-018) |
| Teardown strategy | Promise.allSettled | Fault-isolated (REQ-LIFE-020) |
| Config validation | Zod schema (ADR-013) | Fail-fast with structured errors |
| Fetcher reuse | Single instance per worker | Preserves politeness chains (REQ-LIFE-028) |
| Payload validation | Zod parse at job entry | Catches malformed payloads early |
| Readiness during shutdown | Return 503 immediately | K8s stops routing traffic (REQ-LIFE-029) |
| Drain timeout | Hard cutoff, log abandoned jobs | Prevents indefinite hang (REQ-LIFE-031) |

## 7. Resource Ownership Matrix

| Resource | Owner | Created By | Destroyed By | Covers |
| --- | --- | --- | --- | --- |
| State-store connection | Composition Root | `connectStateStore()` | `shutdown() → teardown` | REQ-LIFE-032 |
| Job Queue | Composition Root | `createQueue()` | `shutdown() → teardown` | REQ-LIFE-032 |
| Frontier adapter | Composition Root | `createFrontier(conn)` | `shutdown() → teardown` | REQ-LIFE-032 |
| Job Consumer | Composition Root | `createJobConsumer()` | `shutdown() → drain` | REQ-LIFE-032 |
| Control Plane | Composition Root | `createControlPlane()` | `shutdown() → teardown` | REQ-LIFE-032 |
| Logger | Composition Root | `createLogger()` | Flushed at shutdown end | REQ-LIFE-032 |
| Tracer | Composition Root | `startTracer()` | `shutdown() → teardown` | REQ-LIFE-032 |
| Metrics Registry | Composition Root | `createMetrics()` | GC (stateless) | REQ-LIFE-032 |
| Metrics Server | Composition Root | `startMetricsServer()` | `shutdown() → teardown` | REQ-LIFE-032 |

**Ownership invariant**: Only the composition root creates and destroys resources. The coordinator, worker, and pipeline borrow references but never close shared resources (REQ-LIFE-024, REQ-LIFE-032).

## 8. Startup Ordering & Failure Paths

```mermaid
graph TD
    S1[1. Config validation] -->|fail| E1[exit 1]
    S1 -->|ok| S2[2. Logger]
    S2 -->|fail| E2[exit 1]
    S2 -->|ok| S3[3. Tracer]
    S3 -->|fail| C3[cleanup: logger flush] --> E3[exit 1]
    S3 -->|ok| S4[4. Metrics + Server]
    S4 -->|fail| C4[cleanup: tracer + logger] --> E4[exit 1]
    S4 -->|ok| S5[5. State-store connect]
    S5 -->|fail| C5[cleanup: metrics + tracer + logger] --> E5[exit 1]
    S5 -->|ok| S6[6. Frontier + ControlPlane]
    S6 -->|fail| C6[cleanup: conn + metrics + tracer + logger] --> E6[exit 1]
    S6 -->|ok| S7[7. Job Consumer]
    S7 -->|fail| C7[cleanup: all above] --> E7[exit 1]
    S7 -->|ok| S8[8. Seeding]
    S8 -->|ok| S9[9. Completion wait]
```

Each failure path cleans up all already-initialized resources in reverse order (REQ-LIFE-034).

Covers: REQ-LIFE-033, REQ-LIFE-034

## 9. K8s Integration

| K8s Config | Value | Rationale |
| --- | --- | --- |
| `terminationGracePeriodSeconds` | 30s | Default K8s; matches drain(15s) + teardown(8s) + 7s buffer |
| Readiness probe | `/readyz` → 503 on shutdown start | REQ-LIFE-029: K8s removes pod from service endpoints |
| Liveness probe | `/health` → continues serving during drain | Prevents premature pod kill during graceful drain |
| `preStop` hook | `sleep 3` | Allows K8s to propagate endpoint removal before drain starts |

**Shutdown timeline:**

```text
SIGTERM received
  t=0s:   readiness → 503 (REQ-LIFE-029)
  t=0s:   preStop sleep(3s) — K8s endpoint propagation
  t=3s:   Phase 1 Drain starts (consumer.close, 15s timeout)
  t=18s:  Phase 2 Teardown starts (allSettled, 8s timeout)
  t=26s:  Exit — within 30s terminationGracePeriod
```

---

> **Provenance**: Created 2026-03-25. Architect Agent design for application lifecycle per ADR-009/013/020.
