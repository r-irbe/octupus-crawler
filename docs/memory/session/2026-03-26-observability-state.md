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

## Current State

| Field | Value |
| --- | --- |
| Current task # | Phase 1-3 COMPLETE. Next: G8 council review, then Phase 4 (distributed tracing) |
| Last completed gate | G6 (commit `b102bca` — Phase 3) |
| Guard function status | PASS — typecheck ✅ lint ✅ test ✅ (136 tests) |
| Commits on branch | 5 (`8cc6910`, `dc1a3c0`, `f8e1dda`, `4b888c4`, `b102bca`) |
| Tests passing | yes (136 tests: 65 core + 23 config + 48 observability) |
| Blockers | None |

## Decisions Log

| # | Decision | Rationale | ADR ref |
| --- | --- | --- | --- |

## Problems & Solutions

| 1 | Pino `base` option rejects `undefined` with exactOptionalPropertyTypes | Build options object conditionally, only set `base` when defined | 1 |
| 2 | `JobLoggerBindings` readonly interface doesn't satisfy `Record<string, unknown>` | Spread bindings: `{ ...bindings }` | 3 |
| 3 | G8-F-001: Test helper reimplemented wrapPino instead of using production code | Export `wrapPino`, test helper calls it directly | `f8e1dda` |
| 4 | G8-F-003: Unbounded status label cardinality on fetches_total counter | Added allowlist + fallback to 'unknown' | `f8e1dda` |
| 5 | `exactOptionalPropertyTypes` prevents passing optional param through to config object | Conditionally build config: `readinessCheck !== undefined ? { registry, readinessCheck } : { registry }` | `b102bca` |
