# Worklog: Deferred Tasks Unblock (Final)

**Date**: 2026-03-28
**Branch**: `work/deferred-unblock-final`
**Commit**: `62323c4`

## Summary

Implemented 8 previously-deferred tasks across application-lifecycle, observability, and CI. These tasks were blocked on BullMQ adapter availability (resolved in prior merge) or infrastructure wiring.

## Changes

### Production Code

| File | Change | Task |
| --- | --- | --- |
| `packages/application-lifecycle/src/consumer-phase.ts` | NEW — ConsumerLike → StartupPhase adapter | T-LIFE-009 |
| `packages/observability/src/readiness-check.ts` | NEW — Enhanced readiness check with Redis + PG ping | T-OBS-030 |
| `packages/application-lifecycle/src/readiness-probe.ts` | MODIFIED — Added `listening()` method with bind timeout | T-LIFE-045 |
| `packages/application-lifecycle/package.json` | MODIFIED — Added exports, bullmq + job-queue devDeps | T-TEST-015 |
| `packages/observability/package.json` | MODIFIED — Added readiness-check export | T-OBS-030 |
| `.github/workflows/quality-gate.yml` | MODIFIED — Integration test performance baseline | T-TEST-022 |

### Test Code (22 new tests)

| File | Tests | Task |
| --- | --- | --- |
| `consumer-phase.unit.test.ts` | 2 | T-LIFE-009 |
| `readiness-check.unit.test.ts` | 5 | T-OBS-030 |
| `readiness-check.integration.test.ts` | 3 (real Redis) | T-OBS-034 |
| `readiness-probe.integration.test.ts` | 4 (real HTTP) | T-LIFE-045 |
| `startup-orchestrator.integration.test.ts` | 3 | T-LIFE-049 |
| `graceful-shutdown.integration.test.ts` | 3 (real BullMQ) | T-TEST-015 |
| `full-lifecycle.integration.test.ts` | 2 (full scenario) | T-LIFE-038 |

## Decisions

1. **Structural typing for readiness check deps**: Used `RedisClient = { ping(): Promise<string> }` instead of importing ioredis directly — keeps observability package decoupled from specific Redis client library.
2. **BullMQ Queue.client for integration tests**: Instead of adding ioredis as a direct devDep to observability, used BullMQ's built-in Queue.client to get an ioredis instance for readiness check integration tests.
3. **Added bullmq as devDep to application-lifecycle**: Required for graceful shutdown and full lifecycle integration tests.
4. **Startup orchestrator integration test uses mock phases**: The sequential ordering test validates the orchestration pattern, not infrastructure connectivity. Consumer phase adapter integration is tested separately.

## RALPH Review Findings

- F-003 (Minor, sustained): `silentLogger()` duplicated in 5 test files → recommend extracting to `@ipf/testing` in future
- F-004 (Minor, sustained): `listening()` promise could hang → FIXED: added 5s bind timeout with clear error message

## Remaining Deferred Tasks

| Task | Blocker | Status |
| --- | --- | --- |
| T-INFRA-021, 022, 025 | Docker images not built | Blocked |
| T-TEST-016 | Docker + Prometheus metrics | Blocked |
| T-AGENT-048, 049, 050, 051 | Live agent sessions | Blocked |
| T-AGENT-107, 109 | Live agent sessions | Blocked |

## Learnings

- BullMQ's `Queue.client` provides direct access to the underlying ioredis instance — useful for integration tests without adding ioredis as a direct dependency
- Port 0 HTTP servers need `listening()` to resolve the OS-assigned port — adding this as a first-class API on ReadinessProbeHandle was cleaner than internal server access hacks
