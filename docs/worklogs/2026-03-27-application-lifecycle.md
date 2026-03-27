# Worklog: Application Lifecycle

**Date**: 2026-03-27
**Branch**: `work/application-lifecycle`
**Spec**: `docs/specs/application-lifecycle/`

## What Changed

New package `packages/application-lifecycle/` implementing startup sequencing, graceful shutdown, seeding, signal handling, worker processing, and resource management.

### Commits

| Hash | Description |
| --- | --- |
| `676b1c1` | feat(application-lifecycle): implement startup, shutdown, seeding, worker processing |
| `c1e9514` | docs(application-lifecycle): update tasks.md checkboxes, worklog, state tracker |
| `0f52abf` | fix(application-lifecycle): G8 RALPH review fixes + enforce mandatory RALPH loop |

### Files Created

| File | Purpose | Lines |
| --- | --- | --- |
| `src/shutdown-reason.ts` | ShutdownReason discriminated union + factories | 33 |
| `src/exit-codes.ts` | Typed exit code constants | 20 |
| `src/graceful-shutdown.ts` | Phased drain+teardown, idempotent guard, readiness probe integration | 138 |
| `src/process-handlers.ts` | uncaughtException, unhandledRejection, abort/completion exit handlers | 80 |
| `src/seed-frontier.ts` | Seed URL validation + frontier enqueue + metrics | 70 |
| `src/worker-processor.ts` | Zod payload validation, pipeline execution, queue_error classification | 71 |
| `src/abort-handler.ts` | Deterministic state-store failure tracking | 58 |
| `src/readiness-probe.ts` | HTTP /readyz + /health endpoints | 57 |
| `src/startup-orchestrator.ts` | Sequential init with fail-fast + reverse cleanup | 96 |
| 8 test files | 49 tests total | 858 |

## Decisions

| # | Decision | Rationale |
| --- | --- | --- |
| D-1 | ShutdownReason in lifecycle pkg, not core | Lifecycle-specific concept, not needed by other packages |
| D-2 | T-LIFE-001–003 marked done (pre-existing) | Config schema + loadConfig() already in packages/config |
| D-3 | Process handlers separate from core signal-handlers | Core has generic SIGTERM/SIGINT; lifecycle needs typed reasons + exit codes |
| D-4 | No direct main.ts wiring in this package | Startup-orchestrator provides framework; actual wiring in apps/ layer |

## Requirements Coverage

- 25 of 34 requirements directly referenced
- 9 gap requirements accounted for (pre-existing in config/core, or wiring in apps/)

## Deferred Items

- Integration test for readiness probe HTTP responses (needs port binding)
- Integration test for startup ordering with real infrastructure
- Actual main.ts wiring in apps/worker-service (separate spec)

## Learnings

- Using recording logger pattern (push to calls array) instead of vi.fn() avoids `this: void` lint issues and `exactOptionalPropertyTypes` problems with mock types
- Port 0 for readiness probe tests lets OS assign port but makes HTTP assertions harder — state-based testing is more reliable
- G8 RALPH loop caught a real type safety gap (F-3: `exitCodeForReason` used raw string union instead of `ShutdownReason['_tag']`) — validates the mandatory review requirement

## G8 RALPH Review

Full PR Review Council RALPH loop run (3 rounds). 7 findings:
- F-3 (Major, FIXED): `exitCodeForReason` type safety gap → now uses `ShutdownReason['_tag']`
- F-5 (Minor, FIXED): teardown timeout silently swallowed failures → added warning log
- F-6 (Minor, FIXED): readiness probe missing EADDRINUSE handler → added error listener
- F-1, F-2, F-4, F-7: Minor/Informational — noted for future

G8 enforcement also updated: AGENTS.md, CLAUDE.md, copilot-instructions.md, review-code SKILL.md now mandate RALPH loop for every G8.
