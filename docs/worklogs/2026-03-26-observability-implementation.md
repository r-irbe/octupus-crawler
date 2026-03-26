# Worklog: Observability Implementation

**Date**: 2026-03-26
**Branch**: `work/observability`
**Spec**: [docs/specs/observability/](../specs/observability/)

## Summary

Implemented the observability spec for `packages/observability`: structured logging (Pino), Prometheus metrics, metrics HTTP server, distributed tracing (OpenTelemetry), trace sampling, and batch processor configuration. 30 of 34 tasks completed; 4 deferred pending external dependencies (BullMQ, Redis, PostgreSQL).

## What Changed

### New Package: `packages/observability`

| File | Lines | Purpose |
| --- | --- | --- |
| `pino-logger.ts` | 80 | Pino-based Logger adapter: 5 levels, child, wrapPino (public) |
| `null-logger.ts` | 30 | No-op Logger for tests |
| `request-id.ts` | 8 | `crypto.randomUUID()` request ID generation |
| `prom-metrics.ts` | 140 | CrawlMetrics adapter: 8 metrics, per-process registry, status allowlist |
| `null-metrics.ts` | 38 | No-op CrawlMetrics for tests |
| `metrics-server.ts` | 86 | Built-in HTTP server: /metrics, /health, /readyz, 404, 500 |
| `tracer.ts` | 119 | OTel SDK: OTLP exporter, undici auto-instrumentation, sampling, batch config |
| `in-memory-exporter.ts` | 4 | Re-export of OTel built-in InMemorySpanExporter |
| `trace-propagation.ts` | 64 | W3C traceparent inject/extract/getTraceContext |

### Test Files (63 tests)

| File | Tests | Covers |
| --- | --- | --- |
| `pino-logger.unit.test.ts` | 13 | Levels, child chaining, bindings, JSON output |
| `null-logger.unit.test.ts` | 4 | No-op behavior |
| `request-id.unit.test.ts` | 2 | UUID format, uniqueness |
| `prom-metrics.unit.test.ts` | 19 | All 8 metrics, guards, allowlist, registry isolation |
| `null-metrics.unit.test.ts` | 1 | No-op behavior |
| `metrics-server.unit.test.ts` | 9 | All HTTP routes, error handling |
| `tracer.unit.test.ts` | 8 | SDK setup, shutdown, sampling, batch config |
| `in-memory-exporter.unit.test.ts` | 2 | Re-export, span capture |
| `trace-propagation.unit.test.ts` | 3 | Inject, extract, getTraceContext |
| `tracer-spans.unit.test.ts` | 2 | Span capture (F-014), batch flush (T-OBS-032) |

### Modified Files

| File | Change |
| --- | --- |
| `package.json` (root) | Added `protobufjs` to `pnpm.onlyBuiltDependencies` |
| `pnpm-workspace.yaml` | Added `packages/observability` |

### Spec Updates (living specs)

| File | Change |
| --- | --- |
| `requirements.md` | Updated REQ-OBS-009 (allowlist), REQ-OBS-027 (sampling), added traceability rows, findings table |
| `design.md` | Added F-003, F-004, F-015, F-017 inline notes + summary table |
| `tasks.md` | Marked 30/34 complete, 4 deferred, added sustained findings table |

## Commits (14)

| Hash | Message |
| --- | --- |
| `8cc6910` | feat(observability): add Logger and Metrics implementations (Phase 1+2) |
| `dc1a3c0` | docs(state): update observability state tracker after Phase 1+2 |
| `f8e1dda` | fix(observability): address G8 council findings F-001/F-003/F-004/F-006 |
| `4b888c4` | docs(state): update state tracker after G8 council review fixes |
| `b102bca` | feat(observability): add metrics HTTP server (Phase 3) |
| `d50f224` | docs(state): update state tracker after Phase 3 completion |
| `c8c816c` | feat(observability): add distributed tracing (Phase 4) |
| `f1792a0` | docs(state): update state tracker after Phase 4 completion |
| `75ca8a5` | fix(observability): address G8 council findings F-014/F-015 |
| `ed12121` | feat(observability): add trace sampling and batch config (Phase 5) |
| `6f2a3af` | docs(observability): document default sampling rate for test flakiness prevention |
| `224d283` | feat(observability): add span capture and batch flush tests (Phase 6) |
| `a83ee59` | chore(docs): update state tracker — Phase 6 complete |
| `f775c19` | docs(specs): update observability specs with G8 sustained findings |

## G8 PR Review Council Results

| Phase | Verdict | Sustained Findings |
| --- | --- | --- |
| 1+2 (Logger + Metrics) | CHANGES REQUESTED → Fixed | F-001 (Major), F-003, F-004 (Minor), F-006 (Info) |
| 3 (Metrics Server) | APPROVED | None |
| 4 (Distributed Tracing) | CHANGES REQUESTED → Fixed | F-014, F-015 (Minor) |
| 5 (Tracing Enhancements) | CHANGES REQUESTED → Fixed | F-017 (Minor) |
| 6 (Additional Tests) | APPROVED | None |

## Decisions Made

| # | Decision | Rationale |
| --- | --- | --- |
| 1 | Re-export OTel `InMemorySpanExporter` instead of custom | SDK already provides what we need |
| 2 | Use `resourceFromAttributes()` instead of `new Resource()` | OTel v2 removed Resource class |
| 3 | Status label allowlist with `'unknown'` fallback | Prevents unbounded Prometheus cardinality (F-003) |
| 4 | Default sampling 10% (`ParentBasedSampler`) | Production-appropriate; tests use `samplingRate: 1.0` |
| 5 | `forceFlush()` on TracerHandle | Needed for test span verification; also useful operationally |
| 6 | `trace.disable()` before each span capture test | OTel global singleton requires reset between SDK instances |

## Deferred Items

| Task | Blocked On | Unblock When |
| --- | --- | --- |
| T-OBS-029: BullMQ trace propagation | url-frontier spec / BullMQ dependency | url-frontier package exists |
| T-OBS-030: Enhanced /readyz (Redis/PG) | Redis/PG infrastructure packages | packages/redis + packages/database exist |
| T-OBS-033: Integration test for T-OBS-029 | T-OBS-029 | — |
| T-OBS-034: Integration test for T-OBS-030 | T-OBS-030 | — |

## Learnings

1. **OTel global singleton**: `NodeSDK.start()` registers a global trace provider. Tests creating multiple SDK instances need `trace.disable()` between them.
2. **`exactOptionalPropertyTypes` friction**: Can't pass `undefined` to optional params — must conditionally build config objects. Recurring pattern across packages.
3. **`SimpleSpanProcessor` export timing**: OTel v2 may not export synchronously on `span.end()`; always use `forceFlush()` before reading exported spans.
4. **PR Review Council catches design gaps**: F-003 (cardinality), F-015 (hardcoded names), F-017 (implicit defaults) — all would have been production issues.
5. **Living specs**: Updating specs with sustained findings (AGENTS.md SHOULD #15) creates a feedback loop that improves future implementations.

## Stats

- **Production files**: 9 (622 lines)
- **Test files**: 10 (63 tests)
- **Total tests**: 151 (65 core + 23 config + 63 observability)
- **Commits**: 14
- **G8 reviews**: 5 (2 approved, 3 changes requested → all resolved)
- **Tasks**: 30/34 done (4 deferred)

---

> **Provenance**: Created 2026-03-26 by Implementation Agent.
