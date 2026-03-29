# Production Testing — Requirements

> EARS-format requirements for chaos testing, load testing, scaling verification, and DDoS/rate-limit resilience.
> Source: [ADR-007](../../adr/ADR-007-testing-strategy.md) §Load/Chaos, [ADR-009](../../adr/ADR-009-resilience-patterns.md), [ADR-002](../../adr/ADR-002-job-queue-system.md)

---

## 1. Chaos Testing — Pod Failures

**REQ-PROD-001** (Event-driven)
When a crawler worker pod is killed via `kubectl delete pod --force` during active job processing, the system shall reassign in-flight jobs to surviving workers within 60 seconds.

**REQ-PROD-002** (Event-driven)
When a crawler worker pod receives SIGTERM, in-flight jobs shall complete or be returned to the queue before the pod exits, with zero job loss.

**REQ-PROD-003** (Event-driven)
When the Redis/Dragonfly pod is killed and restarts, the crawler workers shall reconnect automatically and resume processing within 30 seconds of Redis availability.

**REQ-PROD-004** (Event-driven)
When all crawler worker pods are killed simultaneously, the job queue shall retain all pending and in-flight jobs. When new workers start, they shall resume processing from the queue state.

**REQ-PROD-005** (State-driven)
While a crawler worker pod is being terminated, the health endpoint `/healthz` shall return 503 and the readiness endpoint `/readyz` shall return 503, preventing new traffic routing.

### Acceptance Criteria — Pod Failures

```gherkin
Given a crawler worker processing 5 jobs
When the pod is force-deleted
Then the 5 jobs are returned to the queue within 60s
And another worker picks them up

Given a worker receiving SIGTERM
When the graceful shutdown completes
Then exit code is 0
And crawl_jobs_lost_total metric is 0

Given Redis pod is killed
When Redis restarts after 10s
Then workers reconnect automatically
And job processing resumes within 30s of Redis availability

Given all 3 worker pods are deleted simultaneously
When 3 new worker pods start
Then all previously pending jobs are processed
And no jobs are duplicated or lost
```

## 2. Chaos Testing — Network Partitions

**REQ-PROD-006** (Event-driven)
When network connectivity between a crawler worker and Redis is severed for 30 seconds, the worker's circuit breaker shall open and the worker shall stop accepting new jobs until connectivity is restored.

**REQ-PROD-007** (Event-driven)
When network connectivity between a crawler worker and the web simulator is severed, in-flight fetch requests shall time out within the configured timeout (30s) and be retried per the retry policy.

**REQ-PROD-008** (Event-driven)
When a network partition heals between a worker and Redis, the worker shall transition from circuit-open to half-open, probe with a single request, and resume full processing upon success.

### Acceptance Criteria — Network Partitions

```gherkin
Given a worker connected to Redis
When network is partitioned for 30s
Then the worker's circuit breaker opens within 5 consecutive failures
And no new jobs are dequeued

Given a partition between worker and simulator
When fetch requests time out
Then each request is retried up to 3 times with exponential backoff
And failed jobs are moved to the dead letter queue after max retries

Given an open circuit breaker
When the network partition heals
Then the breaker transitions to half-open
And a single probe request succeeds
And the breaker closes, resuming full throughput
```

## 3. Load Testing — Throughput & Backpressure

**REQ-PROD-009** (Ubiquitous)
The system shall include k6 load test scripts that measure crawler throughput (pages per second) under sustained load.

**REQ-PROD-010** (State-driven)
While the job queue depth exceeds 1000 pending jobs, the system shall maintain worker throughput above the configured minimum threshold without memory exhaustion.

**REQ-PROD-011** (Event-driven)
When k6 seeds 10,000 URLs into the job queue within 60 seconds, the system shall process them without OOM kills, queue corruption, or worker crashes.

**REQ-PROD-012** (Ubiquitous)
Load test scripts shall assert SLO compliance: p95 fetch latency < 5s, error rate < 5%, worker memory < 512MB RSS per pod.

**REQ-PROD-013** (Event-driven)
When sustained load exceeds worker capacity, the BullMQ queue depth metric shall increase monotonically, serving as the KEDA autoscaling signal.

**REQ-PROD-014** (Ubiquitous)
Load test results shall be output in a machine-readable format (JSON summary) for CI regression detection.

### Acceptance Criteria — Load Testing

```gherkin
Given a k6 load test seeding 100 URLs/second for 60 seconds
When workers process at concurrency 10
Then p95 fetch latency is below 5 seconds
And error rate is below 5%
And no worker pods are OOM-killed

Given 10,000 URLs seeded in a burst
When workers drain the queue
Then all 10,000 URLs are processed (metrics confirm)
And worker RSS memory stays below 512MB

Given queue depth exceeds 1000
When workers are at full capacity
Then crawl_queue_depth metric increases
And no jobs are dropped or corrupted
```

## 4. Scaling & Autoscaling

**REQ-PROD-015** (Event-driven)
When the BullMQ queue depth exceeds a configured threshold (e.g., 100 pending jobs per worker), the HPA shall scale worker replicas up within 60 seconds.

**REQ-PROD-016** (Event-driven)
When the queue depth drops below the scale-down threshold for the stabilization window (5 minutes), the HPA shall scale worker replicas down.

**REQ-PROD-017** (State-driven)
While scaling up, newly created worker pods shall begin processing jobs within 30 seconds of reaching `Ready` state.

**REQ-PROD-018** (Event-driven)
When a scale-down event removes a worker pod, the pod shall complete in-flight jobs before termination (graceful shutdown per REQ-PROD-002).

**REQ-PROD-019** (Ubiquitous)
The system shall support scaling from 1 to 10 worker replicas without configuration changes, maintaining URL deduplication across all replicas.

### Acceptance Criteria — Scaling

```gherkin
Given 1 worker replica and queue depth at 500
When HPA evaluates the queue depth metric
Then replicas scale to 3 within 60 seconds
And new pods begin processing jobs within 30s of Ready

Given 5 worker replicas and queue depth at 0 for 5 minutes
When HPA stabilization window expires
Then replicas scale down to 1
And in-flight jobs on terminated pods complete before exit

Given 10 concurrent worker replicas
When processing a 1000-URL site graph
Then each URL is processed exactly once (dedup works across replicas)
And crawl_pages_total equals the expected count
```

## 5. DDoS Simulation & Rate Limiting

**REQ-PROD-020** (Event-driven)
When a single domain generates URLs at 100x normal rate (simulating a link bomb), the per-domain rate limiter shall throttle fetch requests to the configured limit (e.g., 1 request per 2 seconds per domain).

**REQ-PROD-021** (State-driven)
While one domain is rate-limited, crawl throughput for other domains shall remain unaffected (domain isolation).

**REQ-PROD-022** (Event-driven)
When the web simulator returns 429 (Too Many Requests) with a Retry-After header, the crawler shall respect the Retry-After delay before retrying.

**REQ-PROD-023** (Event-driven)
When 50 concurrent seed URLs target 50 different domains, the per-domain BullMQ group rate limiter shall enforce independent rate limits per domain.

**REQ-PROD-024** (Event-driven)
When a burst of 1000 URLs for a single domain is seeded, the circuit breaker shall not open (rate limiting absorbs the burst, not the circuit breaker).

### Acceptance Criteria — DDoS & Rate Limiting

```gherkin
Given BullMQ rate limit: 1 req/2s per domain
When 100 URLs for domain-A are seeded
Then domain-A fetches occur at ~0.5 req/s
And domain-B fetches are not delayed

Given the simulator returns 429 with Retry-After: 5
When the crawler receives the 429
Then the next request to that domain is delayed by at least 5 seconds

Given 50 domains seeded with 10 URLs each (500 total)
When workers process concurrently
Then each domain's requests are rate-limited independently
And total throughput scales with domain count

Given 1000 URLs for a single domain in a burst
When the rate limiter throttles to 0.5 req/s
Then the circuit breaker remains closed
And all 1000 URLs are eventually processed
```

## 6. Resilience Observability

**REQ-PROD-025** (Ubiquitous)
All chaos, load, and scaling tests shall verify that resilience events are recorded in Prometheus metrics: circuit breaker state transitions, retry counts, timeout counts, queue depth.

**REQ-PROD-026** (Event-driven)
When a circuit breaker opens, the metric `circuit_breaker_state{domain}` shall transition to `open` and a log entry shall be emitted with structured fields (domain, failure count, timestamp).

**REQ-PROD-027** (Ubiquitous)
Load test results shall include a metrics snapshot (before/after) to verify counter monotonicity and gauge accuracy under load.

---

## Requirement Count

| Category | Count |
| --- | --- |
| Chaos — Pod Failures (001–005) | 5 |
| Chaos — Network Partitions (006–008) | 3 |
| Load Testing (009–014) | 6 |
| Scaling & Autoscaling (015–019) | 5 |
| DDoS & Rate Limiting (020–024) | 5 |
| Resilience Observability (025–027) | 3 |
| **Total** | **27** |

## Traceability Matrix

| Requirement | ADR Source | Test Type |
| --- | --- | --- |
| REQ-PROD-001–005 | ADR-007 §Chaos, ADR-009 §Graceful Shutdown | Chaos E2E |
| REQ-PROD-006–008 | ADR-009 §Circuit Breaker, §Timeout | Chaos E2E |
| REQ-PROD-009–014 | ADR-007 §Load, ADR-002 §Queue | k6 Load |
| REQ-PROD-015–019 | ADR-007 §Autoscaling, ADR-002 §KEDA | Scaling E2E |
| REQ-PROD-020–024 | ADR-002 §Rate Limiting, ADR-009 §Bulkhead | DDoS E2E |
| REQ-PROD-025–027 | ADR-006 §Observability, ADR-009 §Events | All |

---

> **Provenance**: Created 2026-03-29. Implements ADR-007 §Load/Chaos mandates.
