# ADR-006: Observability Stack — OpenTelemetry + Grafana Stack

| Field | Value |
| --- | --- |
| **Status** | Accepted |
| **Created** | 2026-03-24 |
| **Last Updated** | 2026-03-25 |
| **Author(s)** | Architecture Council |
| **Reviewers** | Architect, SRE, Skeptic, Network Engineer Advisor, DevOps Advisor |
| **Supersedes** | N/A |
| **Superseded By** | N/A |

## Context

A distributed web crawler with multiple services (scheduler, workers, API) requires comprehensive observability across metrics, traces, and logs. Signals must be correlated (trace ID in logs, exemplars in metrics) and the solution must work identically in local development and cloud production.

## Decision Drivers

- Vendor neutrality (same SDK, different backends)
- Three pillars: metrics, traces, structured logs — correlated
- Auto-instrumentation for HTTP, Redis, PostgreSQL, BullMQ
- Kubernetes-native deployment and service discovery
- Custom business metrics (pages/sec, queue depth, error rates)
- Local development and cloud production parity
- Cost efficiency at scale

## Considered Options

### Option A: OpenTelemetry SDK → OTel Collector → Prometheus + Grafana + Loki + Tempo

**Pros:**

- Vendor-neutral SDK — switch backends without code changes
- Auto-instrumentation for Node.js HTTP, Redis, PG, generic pools
- OTel Collector provides batching, retry, transformation
- Prometheus: industry-standard metrics with PromQL
- Tempo: distributed tracing with exemplar support
- Loki: log aggregation with LogQL, label-based indexing
- Grafana: unified dashboards across all three signals
- All components open-source, self-hosted or cloud-managed
- Trace→log→metric correlation out of the box

**Cons:**

- Multiple components to deploy and maintain
- Grafana stack initial setup requires configuration
- OTel Node.js SDK is still evolving (stable for metrics/traces)

### Option B: Datadog / New Relic (SaaS)

**Pros:**

- Zero operational overhead
- Pre-built dashboards and alerting
- APM with deep Node.js profiling

**Cons:**

- Expensive at scale (per-host, per-GB pricing)
- Vendor lock-in on query language and dashboards
- Doesn't run locally — dev experience gap

### Option C: ELK Stack (Elasticsearch + Logstash + Kibana)

**Pros:**

- Mature log aggregation
- Full-text search on logs

**Cons:**

- Resource-heavy (Elasticsearch memory requirements)
- No native tracing (requires Jaeger/Zipkin separately)
- Metrics require separate solution
- Operational burden of Elasticsearch cluster

## Decision

Adopt **OpenTelemetry** as the instrumentation layer with the **Grafana observability stack** as backends.

### Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌────────────────┐
│  App Pods        │    │  OTel Collector  │    │  Backends      │
│                  │    │  (DaemonSet)     │    │                │
│  @opentelemetry  │    │                  │    │  Prometheus    │
│  /sdk-node       │───→│  Receivers       │───→│  (metrics)     │
│                  │    │  Processors      │    │                │
│  Metrics ────────│    │  Exporters       │    │  Tempo         │
│  Traces ─────────│    │                  │───→│  (traces)      │
│  Logs ───────────│    │                  │    │                │
└──────────────────┘    │                  │───→│  Loki          │
                        └──────────────────┘    │  (logs)        │
                                                │                │
                                                │  Grafana       │
                                                │  (dashboards)  │
                                                └────────────────┘
```

### SDK Initialization (MUST Be First Import)

OpenTelemetry SDK must be initialized **before all other imports** to ensure auto-instrumentation hooks into modules correctly:

```typescript
// src/instrumentation.ts — import before everything else in main.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

const sdk = new NodeSDK({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: process.env.SERVICE_NAME ?? 'unknown',
    [ATTR_SERVICE_VERSION]: process.env.SERVICE_VERSION ?? '0.0.0',
    environment: process.env.NODE_ENV,
  }),
  traceExporter: new OTLPTraceExporter({ url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter(),
    exportIntervalMillis: 10_000,
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false }, // Too noisy
    }),
  ],
});

sdk.start();
process.on('SIGTERM', () => sdk.shutdown());
```

### Structured Logging (Pino)

**Pino** is the structured logging library — zero-overhead for disabled log levels, structured JSON output, and automatic trace context injection:

```typescript
// packages/observability/src/logger.ts
import pino from 'pino';
import { trace } from '@opentelemetry/api';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  formatters: {
    log(obj) {
      const span = trace.getActiveSpan();
      if (span) {
        const ctx = span.spanContext();
        return { ...obj, traceId: ctx.traceId, spanId: ctx.spanId };
      }
      return obj;
    },
  },
  redact: ['req.headers.authorization', '*.password', '*.creditCard'],
});
```

Every log line includes `traceId` and `spanId` for correlation with distributed traces.

### Trace Context Propagation Through BullMQ

Async operations (BullMQ jobs, Redis Pub/Sub messages, scheduled tasks) must carry trace context:

```typescript
// Inject trace into BullMQ job data
async function enqueueWithTrace<T>(queue: Queue<T>, name: string, data: T) {
  const traceContext = {};
  propagation.inject(context.active(), traceContext);
  return queue.add(name, { ...data, _traceContext: traceContext });
}

// Restore trace in worker
async function processWithTrace<T>(job: Job<T & { _traceContext?: unknown }>, fn: () => Promise<void>) {
  const parentContext = propagation.extract(context.active(), job.data._traceContext ?? {});
  return context.with(parentContext, fn);
}
```

### Metrics Taxonomy

Metrics follow two standard methodologies plus business-specific signals:

**RED Method (request-oriented):**

| Metric | Type | Labels | Purpose |
| --- | --- | --- | --- |
| `http_requests_total` | Counter | method, route, status | Request rate |
| `http_request_duration_seconds` | Histogram | method, route | Latency (p50, p95, p99) |
| `http_request_errors_total` | Counter | method, route, error_type | Error rate |

**USE Method (resource-oriented):**

| Metric | Type | Labels | Purpose |
| --- | --- | --- | --- |
| `redis_pool_connections` | Gauge | state | Utilization |
| `redis_operations_total` | Counter | command | Saturation |
| `db_query_duration_seconds` | Histogram | query_type | Errors/latency |

**Business metrics (crawler-specific):**

| Metric | Type | Labels | Purpose |
| --- | --- | --- | --- |
| `crawler.pages.fetched` | Counter | domain, status_code | Throughput tracking |
| `crawler.pages.parsed` | Counter | content_type | Parse throughput |
| `crawler.queue.depth` | Gauge | queue_name | Autoscaling signal (KEDA) |
| `crawler.fetch.duration` | Histogram | domain | Latency monitoring |
| `crawler.errors` | Counter | type, domain | Error rate alerting |
| `crawler.robots.blocked` | Counter | domain | Politeness compliance |
| `crawler.dedup.hits` | Counter | — | Frontier efficiency |
| `cache_hit_ratio` | Gauge | cache_name | Cache effectiveness |

### Local Observability Stack (Docker Compose)

```yaml
# infra/docker/observability.yml
services:
  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    ports: ["4318:4318"]
  jaeger:
    image: jaegertracing/all-in-one:latest
    ports: ["16686:16686"]  # Trace UI
  prometheus:
    image: prom/prometheus:latest
    ports: ["9090:9090"]
  grafana:
    image: grafana/grafana:latest
    ports: ["3000:3000"]
  loki:
    image: grafana/loki:latest  # Log aggregation
```

Grafana dashboards are defined as code via `grafana-foundation-sdk`. Alerting rules: p99 > 500ms, error rate > 1%, queue depth > threshold.

## Consequences

### Positive

- Single SDK initialization for all three signals
- Trace context automatically injected into logs (correlation)
- Grafana provides unified view: click trace → see logs → see metrics
- Same OTel SDK works in local dev (Jaeger/stdout) and prod (Grafana Cloud)
- KEDA can scale based on Prometheus metrics
- Alert rules defined as code (Grafana provisioning)

### Negative

- Multiple components to deploy in local K8s (Prometheus, Loki, Tempo, Grafana)
- OTel Collector configuration requires YAML expertise
- Initial dashboard creation investment

### Risks

- OTel Node.js logs SDK maturity (mitigated: pino + OTel log bridge is stable)
- Prometheus storage at high cardinality (mitigated: relabeling and recording rules)

## Validation

- All services emit metrics, traces, and logs to OTel Collector
- End-to-end trace from scheduler→worker→storage visible in Tempo
- Log lines include trace_id and span_id
- Grafana dashboards show real-time crawler throughput
- Alert fires within 2 minutes of error spike

## Related

- [ADR-002: Job Queue System](ADR-002-job-queue-system.md) — BullMQ metrics exported via OTel; trace context propagated through jobs
- [ADR-009: Resilience Patterns](ADR-009-resilience-patterns.md) — Circuit breaker state change events
- [ADR-011: API Framework](ADR-011-api-framework.md) — Fastify auto-instrumented via OTel
- [ADR-016: Coding Standards](ADR-016-coding-standards-principles.md) — Pino logging redaction rules; structured log format

---

> **Provenance**: Created 2026-03-24; updated 2026-03-25 with Pino structured logging, first-import OTel requirement, RED/USE metrics taxonomy, trace context propagation through BullMQ, and local observability Docker Compose stack based on [docs/research/arch.md](../research/arch.md) Phase 8.
