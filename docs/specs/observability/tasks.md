# Observability — Tasks

> Implementation tasks traceable to [requirements.md](requirements.md). Dependency-ordered.
> Design: [design.md](design.md)

---

## Phase 1: Logger

- [ ] **T-OBS-001**: Implement Pino-based Logger adapter (5 severity levels + child) → REQ-OBS-001, REQ-OBS-002
- [ ] **T-OBS-002**: Configure JSON output with ISO 8601 timestamps → REQ-OBS-003
- [ ] **T-OBS-003**: Implement per-job child logger factory (jobId, url, depth) → REQ-OBS-004
- [ ] **T-OBS-004**: Implement request ID generation for HTTP correlation → REQ-OBS-006
- [ ] **T-OBS-005**: Implement NullLogger for tests → REQ-OBS-007

## Phase 2: Metrics

- [ ] **T-OBS-006**: Implement CrawlMetrics adapter with per-process registry → REQ-OBS-008, REQ-OBS-017
- [ ] **T-OBS-007**: Register `fetches_total` counter with status + error_kind labels → REQ-OBS-009
- [ ] **T-OBS-008**: Register `fetch_duration_seconds` histogram with configurable buckets → REQ-OBS-010
- [ ] **T-OBS-009**: Register `urls_discovered_total` counter (increment guard: count > 0) → REQ-OBS-011
- [ ] **T-OBS-010**: Register gauges: `frontier_size`, `active_jobs`, `worker_utilization_ratio` → REQ-OBS-012, 014, 015
- [ ] **T-OBS-011**: Register counters: `stalled_jobs_total`, `coordinator_restarts_total` → REQ-OBS-013, 016
- [ ] **T-OBS-012**: Implement NullMetrics for tests → REQ-OBS-018

## Phase 3: Metrics Server

- [ ] **T-OBS-013**: Implement HTTP server with /metrics, /health, /readyz routes → REQ-OBS-019, 020, 021
- [ ] **T-OBS-014**: Implement readiness check with state-store connectivity → REQ-OBS-021
- [ ] **T-OBS-015**: Implement 404 for unknown paths and 500 with generic body for errors → REQ-OBS-022

## Phase 4: Distributed Tracing

- [ ] **T-OBS-016**: Configure OTel SDK with configurable OTLP exporter → REQ-OBS-023
- [ ] **T-OBS-017**: Enable HTTP auto-instrumentation (undici) → REQ-OBS-024
- [ ] **T-OBS-018**: Add job queue instrumentation for cross-job propagation → REQ-OBS-024
- [ ] **T-OBS-019**: Implement trace context injection into log records → REQ-OBS-005
- [ ] **T-OBS-020**: Implement in-memory trace exporter for tests → REQ-OBS-025
- [ ] **T-OBS-021**: Implement non-throwing tracer shutdown → REQ-OBS-026

## Phase 5: Tracing Enhancements

- [ ] **T-OBS-027**: Implement tail-based/parent-based trace sampling with configurable rates (`TRACE_SAMPLING_RATE`, `TRACE_ERROR_SAMPLING_RATE`) → REQ-OBS-027
- [ ] **T-OBS-028**: Implement OTel buffer overflow handling (log warning, drop oldest spans) with configurable `OTEL_BSP_MAX_QUEUE_SIZE` → REQ-OBS-028
- [ ] **T-OBS-029**: Implement BullMQ job data trace propagation (W3C `traceparent` inject/extract) → REQ-OBS-029
- [ ] **T-OBS-030**: Implement enhanced `/readyz` with Redis ping + PostgreSQL SELECT 1 + optional OTel check → REQ-OBS-030

## Phase 6: Tests

- [ ] **T-OBS-022**: Unit tests for Logger (levels, child chaining, bindings) → REQ-OBS-001 to 004
- [ ] **T-OBS-023**: Unit tests for all metric recording (counters, gauges, histogram) → REQ-OBS-009 to 016
- [ ] **T-OBS-024**: Unit test for registry isolation → REQ-OBS-017
- [ ] **T-OBS-025**: Integration test for metrics server routes → REQ-OBS-019 to 022
- [ ] **T-OBS-026**: Unit test for non-throwing tracer shutdown → REQ-OBS-026
- [ ] **T-OBS-031**: Unit test for trace sampling configuration (error vs success rates) → REQ-OBS-027
- [ ] **T-OBS-032**: Unit test for OTel buffer overflow warning and drop-oldest behavior → REQ-OBS-028
- [ ] **T-OBS-033**: Integration test for job queue trace propagation (producer→consumer span link) → REQ-OBS-029
- [ ] **T-OBS-034**: Integration test for `/readyz` with Redis/PG/OTel checks → REQ-OBS-030

---

## Dependencies

| Task | Depends On | Blocks |
| --- | --- | --- |
| Phase 1 (logger) | core-contracts (Logger interface) | All other features (logging) |
| Phase 2 (metrics) | core-contracts (CrawlMetrics interface) | metrics server |
| Phase 3 (server) | Phase 2 | infrastructure (health checks) |
| Phase 4 (tracing) | Phase 1 | — |
| Phase 5 (enhancements) | Phase 4, url-frontier (job queue) | infrastructure |
| Phase 6 (tests) | Phases 1-5 | — |

---

> **Provenance**: Created 2026-03-25. Implementation Agent task decomposition per ADR-020. Updated 2026-03-25: added Phase 5 (REQ-OBS-027–030 trace sampling, buffer overflow, queue propagation, readiness probe).
