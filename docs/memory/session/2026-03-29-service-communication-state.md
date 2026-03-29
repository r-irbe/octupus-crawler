# Implementation State Tracker — Service Communication

## Session Identity

| Field | Value |
| --- | --- |
| Date | 2026-03-29 |
| Branch | `work/service-communication` |
| User request | Implement service-communication spec (Phase 1 + partial Phase 3/6) |
| Scope | `packages/api-router/` (new), `packages/core/` (domain events) |

## Applicable ADRs

- ADR-017: Service Communication — tRPC, TypeSpec, Redis Streams, Temporal
- ADR-011: API Framework — Fastify + NestJS adapter + Zod

## Task Queue

| # | Task | Status | Commit | Notes |
| --- | --- | --- | --- | --- |
| 1 | T-COMM-001: Create packages/api-router/ | `done` | 38481b9 | tRPC + Zod router |
| 2 | T-COMM-002: Zod schemas for crawl procedures | `done` | 38481b9 | submit/status/health |
| 3 | T-COMM-003: publicProcedure + protectedProcedure | `done` | 38481b9 | auth middleware |
| 4 | T-COMM-010: DomainEvent discriminated union | `done` | 38481b9 | 4 event types, versioned |
| 5 | T-COMM-015: Unknown event version handling | `done` | 38481b9 | skip + warn |
| 6 | T-COMM-023: Unit tests | `done` | 38481b9 | 31 tests, 3 files |

## Deferred

T-COMM-004/005 (OTel/gateway wiring), T-COMM-006-009 (TypeSpec), T-COMM-011-014 (Redis Streams), T-COMM-016-020 (Temporal), T-COMM-021-022 (Redis idempotency), T-COMM-024-027 (integration tests)

## Current State

| Field | Value |
| --- | --- |
| Current task # | 6 (all done) |
| Last completed gate | G7 (state update) |
| Guard function status | `pass` (15/15 packages) |
| Commits on branch | 1 (38481b9) |
| Blockers | none |

## Decisions

- `exactOptionalPropertyTypes` requires `| undefined` on all Zod-inferred optional fields in TypeScript interfaces
- Domain events live in `packages/api-router/` (not `packages/core/`) — avoids cross-package changes for now
- `async` mock functions replaced with `Promise.resolve()` to satisfy `require-await` lint rule
