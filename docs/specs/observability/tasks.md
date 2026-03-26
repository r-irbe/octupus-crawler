# Observability — Tasks

> Implementation tasks traceable to [requirements.md](requirements.md). Dependency-ordered.
> Design: [design.md](design.md)

---

## Phase 1: Logger

- [x] **T-OBS-001**: Implement Pino-based Logger adapter (5 severity levels + child) → REQ-OBS-001, REQ-OBS-002
- [x] **T-OBS-002**: Configure JSON output with ISO 8601 timestamps → REQ-OBS-003
- [x] **T-OBS-003**: Implement per-job child logger factory (jobId, url, depth) → REQ-OBS-004
- [x] **T-OBS-004**: Implement request ID generation for HTTP correlation → REQ-OBS-006
- [x] **T-OBS-005**: Implement NullLogger for tests → REQ-OBS-007

## Phase 2: Metrics

- [x] **T-OBS-006**: Implement CrawlMetrics adapter with per-process registry → REQ-OBS-008, REQ-OBS-017
- [x] **T-OBS-007**: Register `fetches_total` counter with status + error_kind labels → REQ-OBS-009
- [x] **T-OBS-008**: Register `fetch_duration_seconds` histogram with configurable buckets → REQ-OBS-010
- [x] **T-OBS-009**: Register `urls_discovered_total` counter (increment guard: count > 0) → REQ-OBS-011
- [x] **T-OBS-010**: Register gauges: `frontier_size`, `active_jobs`, `worker_utilization_ratio` → REQ-OBS-012, 014, 015
- [x] **T-OBS-011**: Register counters: `stalled_jobs_total`, `coordinator_restarts_total` → REQ-OBS-013, 016
- [x] **T-OBS-012**: Implement NullMetrics for tests → REQ-OBS-018

## Phase 3: Metrics Server

- [x] **T-OBS-013**: Implement HTTP server with /metrics, /health, /readyz routes → REQ-OBS-019, 020, 021
- [x] **T-OBS-014**: Implement readiness check with state-store connectivity → REQ-OBS-021
- [x] **T-OBS-015**: Implement 404 for unknown paths and 500 with generic body for errors → REQ-OBS-022

## Phase 4: Distributed Tracing

- [x] **T-OBS-016**: Configure OTel SDK with configurable OTLP exporter → REQ-OBS-023
- [x] **T-OBS-017**: Enable HTTP auto-instrumentation (undici) → REQ-OBS-024
- [x] **T-OBS-018**: Add job queue instrumentation for cross-job propagation → REQ-OBS-024
- [x] **T-OBS-019**: Implement trace context injection into log records → REQ-OBS-005
- [x] **T-OBS-020**: Implement in-memory trace exporter for tests → REQ-OBS-025
- [x] **T-OBS-021**: Implement non-throwing tracer shutdown → REQ-OBS-026

## Phase 5: Tracing Enhancements

- [x] **T-OBS-027**: Implement parent-based trace sampling with configurable rate (`samplingRate`, default 0.1) → REQ-OBS-027
- [x] **T-OBS-028**: Implement batch processor with configurable queue/batch/delay/timeout → REQ-OBS-028
- [ ] **T-OBS-029**: ⏸️ DEFERRED — Implement BullMQ job data trace propagation (W3C `traceparent` inject/extract) → REQ-OBS-029 — *blocked on url-frontier spec / BullMQ dependency*
- [ ] **T-OBS-030**: ⏸️ DEFERRED — Implement enhanced `/readyz` with Redis ping + PostgreSQL SELECT 1 + optional OTel check → REQ-OBS-030 — *blocked on Redis/PG infrastructure*

## Phase 6: Tests

- [x] **T-OBS-022**: Unit tests for Logger (levels, child chaining, bindings) → REQ-OBS-001 to 004 — *13 tests in pino-logger.unit.test.ts*
- [x] **T-OBS-023**: Unit tests for all metric recording (counters, gauges, histogram) → REQ-OBS-009 to 016 — *19 tests in prom-metrics.unit.test.ts*
- [x] **T-OBS-024**: Unit test for registry isolation → REQ-OBS-017 — *covered in prom-metrics tests*
- [x] **T-OBS-025**: Integration test for metrics server routes → REQ-OBS-019 to 022 — *9 tests in metrics-server.unit.test.ts*
- [x] **T-OBS-026**: Unit test for non-throwing tracer shutdown → REQ-OBS-026 — *covered in tracer.unit.test.ts*
- [x] **T-OBS-031**: Unit test for trace sampling configuration → REQ-OBS-027 — *4 tests in tracer.unit.test.ts*
- [x] **T-OBS-032**: Unit test for batch processor flush behavior → REQ-OBS-028 — *1 test in tracer-spans.unit.test.ts*
- [ ] **T-OBS-033**: ⏸️ DEFERRED — Integration test for job queue trace propagation (producer→consumer span link) → REQ-OBS-029 — *blocked on T-OBS-029*
- [ ] **T-OBS-034**: ⏸️ DEFERRED — Integration test for `/readyz` with Redis/PG/OTel checks → REQ-OBS-030 — *blocked on T-OBS-030*

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

## G8 Review Council — Sustained Findings

Findings that resulted in spec or implementation changes (living specs per AGENTS.md SHOULD #15):

| Finding | Phase | Severity | Impact | Resolution |
| --- | --- | --- | --- | --- |
| F-001 | 1+2 | Major | Test helper re-implemented `wrapPino` | Exported `wrapPino`, test uses production code |
| F-003 | 1+2 | Minor | Unbounded fetch status label cardinality | Added allowlist + `'unknown'` fallback → updated REQ-OBS-009 |
| F-004 | 1+2 | Minor | `wrapPino` not exported from package | Exported from package.json → updated design.md §2 |
| F-006 | 1+2 | Info | Missing test for recordFetch without error_kind | Added test case |
| F-014 | 4 | Minor | No span capture integration test | Added tracer-spans.unit.test.ts (Phase 6) |
| F-015 | 4 | Minor | Hardcoded tracer name in extractAndStartSpan | Parameterised with default `'ipf-observability'` → updated design.md §5 |
| F-017 | 5 | Minor | Default sampling silently changed to 10% | Added JSDoc + updated REQ-OBS-027 with test guidance |

---

> **Provenance**: Created 2026-03-25. Implementation Agent task decomposition per ADR-020. Updated 2026-03-25: added Phase 5 (REQ-OBS-027–030 trace sampling, buffer overflow, queue propagation, readiness probe). Updated 2026-03-26: marked completed/deferred tasks, added G8 sustained findings table (living specs per AGENTS.md SHOULD #15).
