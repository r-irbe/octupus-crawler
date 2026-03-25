# ADR-002: Job Queue System — BullMQ + Redis/Dragonfly

| Field | Value |
| --- | --- |
| **Status** | Accepted |
| **Created** | 2026-03-24 |
| **Last Updated** | 2026-03-25 |
| **Author(s)** | Architecture Council |
| **Reviewers** | Architect, Skeptic, SRE, Distributed Systems Specialist, DevOps Advisor |
| **Supersedes** | N/A |
| **Superseded By** | N/A |

## Context

The distributed crawler requires a job queue to distribute crawl tasks across worker pods. The queue must support priority scheduling, per-domain rate limiting, retry with backoff, dead letter queues, and expose metrics for KEDA-based autoscaling. The URL frontier may hold millions of pending URLs.

## Decision Drivers

- Native Node.js/TypeScript integration quality
- Per-domain rate limiting (crawl politeness)
- Priority queue support
- Built-in retry/backoff/DLQ
- Queue depth metrics for autoscaling (KEDA)
- Memory efficiency at scale (millions of URLs)
- Operational complexity

## Considered Options

### Option A: BullMQ + Redis/Dragonfly

**Pros:**

- Best-in-class Node.js DX — TypeScript-first API
- Built-in rate limiter with group keys (per-domain limiting)
- Priority queues, delayed jobs, repeatable jobs
- Configurable retry with exponential backoff
- Dead letter queue support
- Queue metrics exposed (processed, failed, waiting, active counts)
- KEDA has a first-class Redis scaler
- Dragonfly: Redis-compatible, multi-threaded, 10x memory efficiency
- BullMQ Dashboard (Bull Board) for debugging

**Cons:**

- Redis is single-threaded (mitigated by Dragonfly)
- Queue state is in-memory (mitigated by Dragonfly's persistence + Redis AOF)
- Not a true distributed log (no replay from offset)

### Option B: NATS JetStream

**Pros:**

- True distributed streaming with replay
- Lightweight binary, low resource footprint
- Multi-language ecosystem

**Cons:**

- No built-in per-domain rate limiting — must implement manually
- Node.js client is less mature than BullMQ
- Priority queues require manual implementation via multiple streams
- More complex operational model for this use case

### Option C: Apache Kafka

**Pros:**

- Industry-standard distributed log
- Horizontal scaling via partitions
- Exactly-once semantics available

**Cons:**

- Massive operational overhead (ZooKeeper/KRaft, topics, partitions)
- Node.js clients (kafkajs) are less ergonomic
- No built-in rate limiting
- Significant resource requirements
- Overkill for task distribution — Kafka excels at event streaming, not job queues

### Option D: Temporal

**Pros:**

- Built-in retry, timeout, and saga patterns
- Workflow visibility and debugging UI
- Strong consistency guarantees

**Cons:**

- Heavy runtime (Temporal server + Cassandra/PostgreSQL)
- Higher latency for simple fetch tasks
- Learning curve for workflow/activity model
- Overkill when we primarily need task distribution, not workflow orchestration

## Decision

Adopt **BullMQ** as the job queue library with **Dragonfly** as the Redis-compatible backend.

### Key Configuration

```typescript
// Per-domain rate limiting
const crawlQueue = new Queue('crawl', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { age: 3600, count: 10000 },
    removeOnFail: { age: 86400 },
  },
});

// Rate limiter per domain group
const worker = new Worker('crawl', processor, {
  connection: redisConnection,
  concurrency: 10,
  limiter: { max: 1, duration: 2000, groupKey: 'domain' },
});
```

### Queue Topology

| Queue | Purpose | Priority |
| --- | --- | --- |
| `crawl:high` | Seed URLs, retries | High |
| `crawl:normal` | Discovered URLs | Normal |
| `crawl:low` | Deep pages, low-value targets | Low |
| `crawl:dead` | DLQ for permanently failed jobs | N/A |

## Consequences

### Positive

- Per-domain politeness is a first-class feature, not a bolt-on
- KEDA can scale workers 0→N based on `bull:crawl:wait` list length
- Sub-millisecond job dispatch latency
- BullMQ Dashboard provides instant queue debugging
- Dragonfly handles millions of URLs with 10x less memory vs Redis

### Negative

- Queue state is in-memory (not a persistent log)
- Cannot replay historical jobs like Kafka
- Dragonfly is newer than Redis (mitigated by Redis API compatibility)

### Risks

- Dragonfly compatibility edge cases with BullMQ Lua scripts (mitigated: BullMQ is tested against Dragonfly)
- Memory exhaustion if queue grows unbounded (mitigated: job TTL + removal policies)

## Validation

- Queue latency p99 < 10ms for job dispatch
- Per-domain rate limiting verified: no domain receives > 1 req/2s
- KEDA scaling response time < 30s from queue depth spike to pod ready
- Zero lost jobs during worker pod restarts (graceful shutdown)

## Scope Boundary: BullMQ vs Temporal

BullMQ handles simple job queues, fire-and-forget tasks, scheduled cron-like work, and rate-limited domain crawling. For **multi-step workflows** with compensating transactions, visibility requirements, or long-running processes (minutes to days), use **Temporal.io** instead — see [ADR-017: Service Communication](ADR-017-service-communication.md).

**Decision rule**: If the job is a single operation with retry, use BullMQ. If the job is a multi-step workflow where intermediate state and compensation matter, use Temporal.

### Typed Job Definitions

All BullMQ jobs use strongly typed definitions to prevent runtime deserialization errors:

```typescript
interface CrawlJob {
  url: string;
  domain: string;
  depth: number;
  sessionId: string;
  priority: number;
  parentUrlId?: string;
}

const crawlQueue = new Queue<CrawlJob>('crawl', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 1000, age: 24 * 3600 },
    removeOnFail: { count: 5000, age: 7 * 24 * 3600 },
  },
});
```

## Related

- [ADR-005: Local Kubernetes](ADR-005-local-kubernetes.md) — Dragonfly runs as a pod in k3d
- [ADR-009: Resilience Patterns](ADR-009-resilience-patterns.md) — Circuit breakers complement queue retries
- [ADR-006: Observability Stack](ADR-006-observability-stack.md) — Queue metrics exported to Prometheus
- [ADR-017: Service Communication](ADR-017-service-communication.md) — Temporal.io for durable workflow orchestration

---

> **Provenance**: Created 2026-03-24; updated 2026-03-25 with BullMQ vs Temporal scope boundary, typed job definitions, and cross-reference to ADR-017 based on [docs/research/arch.md](../research/arch.md) Phase 4 and [docs/research/code.md](../research/code.md) Part III.
