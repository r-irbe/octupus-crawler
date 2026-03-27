# Implementation State Tracker — Application Lifecycle

## Session Identity

| Field | Value |
| --- | --- |
| Date | 2026-03-27 |
| Branch | `work/application-lifecycle` |
| User request | Implement application-lifecycle spec: startup, seeding, signal handling, graceful shutdown, worker processing |
| Scope | packages/application-lifecycle (NEW), packages/core (extend), packages/config (minor) |

## Applicable ADRs

- ADR-009: Resilience — graceful shutdown, drain with timeout, allSettled teardown
- ADR-013: Configuration — Zod-validated config, fail-fast startup
- ADR-015: Architecture — hexagonal + VSA, composition root
- ADR-016: Coding standards — neverthrow, strict TypeScript, discriminated unions

## Task Queue

| # | Task | Status | Commit | Notes |
| --- | --- | --- | --- | --- |
| 1 | Package scaffolding + ShutdownReason + exit codes | `pending` | — | — |
| 2 | Graceful shutdown orchestrator + tests | `pending` | — | — |
| 3 | Process handlers (uncaught, rejection, abort trigger) + tests | `pending` | — | — |
| 4 | Seeding (seed URL processing + frontier enqueue) + tests | `pending` | — | — |
| 5 | Worker processor (payload validation, queue_error, metrics) + tests | `pending` | — | — |
| 6 | Startup orchestrator + readiness probe + abort handler + tests | `pending` | — | — |

## Current State

| Field | Value |
| --- | --- |
| Current task # | — |
| Last completed gate | G4 (state tracker) |
| Guard function status | `not-run` |
| Commits on branch | 0 |
| Tests passing | 484 (inherited from main) |
| Blockers | none |

## Decisions Log

| # | Decision | Rationale | ADR ref |
| --- | --- | --- | --- |
| 1 | ShutdownReason in lifecycle pkg, not core | Lifecycle-specific, not needed by other packages | ADR-015 |
| 2 | T-LIFE-001–003 already done in config pkg | Config schema + loadConfig exist, mark as done | ADR-013 |
| 3 | Keep process handlers separate from core signal-handlers | Core has generic SIGTERM/SIGINT; lifecycle needs typed reasons + exit codes | ADR-009 |

## Problems & Solutions

| # | Problem | Solution | Task # |
| --- | --- | --- | --- |
