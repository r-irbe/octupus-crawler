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
| 1 | T-COMM-001: Create packages/api-router/ | `pending` | | tRPC + Zod |
| 2 | T-COMM-002: Zod schemas for crawl procedures | `pending` | | submit/status |
| 3 | T-COMM-003: publicProcedure + protectedProcedure | `pending` | | auth middleware |
| 4 | T-COMM-010: DomainEvent discriminated union | `pending` | | versioned schemas |
| 5 | T-COMM-015: Unknown event version handling | `pending` | | skip + warn |
| 6 | T-COMM-023: Unit tests | `pending` | | tRPC + Zod |

## Deferred

T-COMM-004/005 (OTel/gateway wiring), T-COMM-006-009 (TypeSpec), T-COMM-011-014 (Redis Streams), T-COMM-016-020 (Temporal), T-COMM-021-022 (Redis idempotency), T-COMM-024-027 (integration tests)

## Current State

| Field | Value |
| --- | --- |
| Current task # | 0 |
| Last completed gate | G4 (state tracker) |
| Guard function status | `not-run` |
| Commits on branch | 0 |
| Blockers | none |
