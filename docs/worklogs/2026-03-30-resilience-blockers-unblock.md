# Worklog: Resilience Blockers Unblock

**Date**: 2026-03-30
**Branch**: `work/resilience-blockers-unblock`
**Commit**: `3379179`

## Summary

Unblocked 5 resilience tasks that were waiting on Redis and BullMQ infrastructure packages (now integrated from prior cycles).

## Tasks Completed

| Task | Requirement | Package | Description |
| --- | --- | --- | --- |
| T-RES-010 | REQ-RES-011 | resilience | Redis sorted set sliding window rate limiter |
| T-RES-014 | REQ-RES-016 | job-queue | BullMQ dead letter queue handler |
| T-RES-015 | REQ-RES-017 | job-queue | DLQ event callback for metrics/alerting |
| T-RES-024 | REQ-RES-011 | resilience | Integration test (Testcontainers Redis) |
| T-RES-025 | REQ-RES-016 | job-queue | Integration test (Testcontainers Redis) |

## Files Created

- `packages/resilience/src/sliding-window-rate-limiter.ts` (157 lines)
- `packages/resilience/src/sliding-window-rate-limiter.unit.test.ts` (186 lines)
- `packages/resilience/src/sliding-window-rate-limiter.integration.test.ts` (120 lines)
- `packages/job-queue/src/dlq-handler.ts` (120 lines)
- `packages/job-queue/src/dlq-handler.unit.test.ts` (205 lines)
- `packages/job-queue/src/dlq-handler.integration.test.ts` (102 lines)

## Files Modified

- `packages/resilience/package.json` — added `ioredis`, `neverthrow` deps; `@ipf/testing` devDep; export
- `packages/job-queue/package.json` — added `./dlq-handler` export

## Decisions

| # | Decision | Rationale |
| --- | --- | --- |
| 1 | Redis sorted set sliding window (ZADD/ZCARD/ZREMRANGEBYSCORE) | More accurate than INCR+EXPIRE approach in design doc |
| 2 | Single pipeline for check() | RALPH review P1/D1: eliminated TOCTOU race + halved round-trips |
| 3 | Optimistic ZADD + rollback via ZREM | Single pipeline can't conditionally skip ZADD, so add optimistically and remove if over limit |
| 4 | DLQ handler in job-queue package | Co-located with BullMQ adapter per VSA (not in resilience) |

## RALPH Review Findings

| Finding | Severity | Resolution |
| --- | --- | --- |
| P1/D1: Two-pipeline TOCTOU race | Major | Fixed: merged into single pipeline with optimistic add + rollback |
| P2: peek() has write side-effect | Minor | Accepted: cleanup removes expired entries, reasonable behavior |
| S1: Math.random() for dedup | Info | Accepted: not security-critical |

## Test Results

- 17/17 packages: typecheck, lint, test all pass
- 1,100 total tests (baseline 1,080 + 20 new)
- New: 8 unit (rate limiter) + 9 unit (DLQ) + 5 integration (rate limiter) + 3 integration (DLQ) = 25 new tests (some run in vitest with integration excluded from regular run)

## Known Issues

- `dlq-handler.unit.test.ts` at 205 lines (>200 target, <300 hard limit) — acceptable

## Learnings

- `import IoRedis from 'ioredis'` → not constructable with `verbatimModuleSyntax: true`. Use `import { Redis } from 'ioredis'` instead.
- `@ipf/testing` exports use `./containers/redis` not `./containers/redis-container`
- `vi.fn(() => ...)` arrow functions can't be used as constructors. Use `vi.fn(function() { ... })` for mocked classes.
