# Implementation State Tracker — Observability

## Session Identity

| Field | Value |
| --- | --- |
| Date | 2026-03-26 |
| Branch | `work/observability` |
| User request | Implement observability spec: structured logging, metrics, metrics server, distributed tracing |
| Scope | `packages/observability/` (new), `packages/config/` (new config keys) |

## Applicable ADRs

- ADR-006: Observability stack — OTel + Pino + Grafana
- ADR-007: Testing strategy — Vitest + Testcontainers
- ADR-013: Configuration management — Zod-validated env vars
- ADR-015: Application architecture — Clean architecture layers

## Task Queue

| # | Task | Status | Commit | Notes |
| --- | --- | --- | --- | --- |
| 0 | Scaffold packages/observability | `done` | `8cc6910` | package.json, tsconfig, eslint, vitest |
| 1 | T-OBS-001: Pino Logger adapter | `done` | `8cc6910` | 5 levels + child, wrapPino |
| 2 | T-OBS-002: JSON output + ISO 8601 | `done` | `8cc6910` | pino.stdTimeFunctions.isoTime |
| 3 | T-OBS-003: Per-job child logger | `done` | `8cc6910` | createJobLogger factory |
| 4 | T-OBS-004: Request ID generation | `done` | `8cc6910` | crypto.randomUUID |
| 5 | T-OBS-005: NullLogger for tests | `done` | `8cc6910` | Returns self from child() |
| 6 | T-OBS-006: CrawlMetrics adapter | `done` | `8cc6910` | prom-client, per-process registry |
| 7 | T-OBS-007: fetches_total counter | `done` | `8cc6910` | status + error_kind labels |
| 8 | T-OBS-008: fetch_duration_seconds histogram | `done` | `8cc6910` | configurable buckets, guard > 0 |
| 9 | T-OBS-009: urls_discovered_total counter | `done` | `8cc6910` | guard: count > 0 |
| 10 | T-OBS-010: gauges (frontier, active, utilization) | `done` | `8cc6910` | 3 gauges |
| 11 | T-OBS-011: counters (stalled, restarts) | `done` | `8cc6910` | 2 counters |
| 12 | T-OBS-012: NullMetrics for tests | `done` | `8cc6910` | No-op implementation |
| 13 | T-OBS-013: HTTP server /metrics /health /readyz | `done` | `b102bca` | Built-in Node.js HTTP server |
| 14 | T-OBS-014: Readiness check (injectable) | `done` | `b102bca` | Default: self-ok |
| 15 | T-OBS-015: 404/500 error handling | `done` | `b102bca` | Generic error body, no leaks |
| 16 | T-OBS-016: OTel SDK with OTLP exporter | `done` | `c8c816c` | NodeSDK, resourceFromAttributes |
| 17 | T-OBS-017: HTTP auto-instrumentation (undici) | `done` | `c8c816c` | UndiciInstrumentation |
| 18 | T-OBS-018: Job queue trace propagation | `done` | `c8c816c` | inject/extract W3C traceparent |
| 19 | T-OBS-019: Trace context for log correlation | `done` | `c8c816c` | getTraceContext helper |
| 20 | T-OBS-020: In-memory span exporter | `done` | `c8c816c` | Re-export OTel built-in |
| 21 | T-OBS-021: Non-throwing tracer shutdown | `done` | `c8c816c` | catch + log, never propagate |

## Current State

| Field | Value |
| --- | --- |
| Current task # | Phase 1-4 COMPLETE. Next: G8 council review, then Phase 5 (tracing enhancements) |
| Last completed gate | G6 (commit `c8c816c` — Phase 4) |
| Guard function status | PASS — typecheck ✅ lint ✅ test ✅ (145 tests) |
| Commits on branch | 7 (`8cc6910`..⁠`c8c816c`) |
| Tests passing | yes (145 tests: 65 core + 23 config + 57 observability) |
| Blockers | None |

## Decisions Log

| # | Decision | Rationale | ADR ref |
| --- | --- | --- | --- |
| 1 | Use OTel built-in InMemorySpanExporter instead of custom | SDK already provides exactly what we need, no custom code to maintain | ADR-006 |

## Problems & Solutions

| 1 | Pino `base` option rejects `undefined` with exactOptionalPropertyTypes | Build options object conditionally, only set `base` when defined | 1 |
| 2 | `JobLoggerBindings` readonly interface doesn't satisfy `Record<string, unknown>` | Spread bindings: `{ ...bindings }` | 3 |
| 3 | G8-F-001: Test helper reimplemented wrapPino instead of using production code | Export `wrapPino`, test helper calls it directly | `f8e1dda` |
| 4 | G8-F-003: Unbounded status label cardinality on fetches_total counter | Added allowlist + fallback to 'unknown' | `f8e1dda` |
| 5 | `exactOptionalPropertyTypes` prevents passing optional param through to config object | Conditionally build config: `readinessCheck !== undefined ? { registry, readinessCheck } : { registry }` | `b102bca` |
| 6 | OTel `Resource` class removed in latest version; `resourceFromAttributes()` is the new API | Use `resourceFromAttributes` instead of `new Resource()` | `c8c816c` |
