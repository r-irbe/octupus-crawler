# 2026-03-28: BullMQ Integration Tests

## Summary

Added BullMQ integration tests across 4 downstream packages now unblocked by `@ipf/job-queue` adapter. Fixed circular dependency in package graph.

## Changes

### New Files (4)

- `packages/url-frontier/src/frontier-bullmq.integration.test.ts` — 5 tests: batch round-trip, dedup, retry backoff, retention eviction
- `packages/completion-detection/src/control-plane-bullmq.integration.test.ts` — 2 tests: pause/resume with in-flight jobs, paused state counts
- `packages/worker-management/src/worker-bullmq.integration.test.ts` — 2 tests: crash recovery, stalled job recovery
- `packages/observability/src/trace-propagation.integration.test.ts` — 2 tests: carrier survives BullMQ round-trip, extractAndStartSpan creates consumer span

### Modified Files (6)

- `packages/job-queue/package.json` — Removed `@ipf/url-frontier` and `@ipf/completion-detection` from deps (circular dep fix)
- `packages/job-queue/src/bullmq-queue-backend.ts` — Types locally declared with SYNC comments
- `packages/job-queue/src/bullmq-queue-adapter.ts` — QueueAdapter type locally declared with SYNC comment
- `packages/job-queue/src/bullmq-adapters.integration.test.ts` — Imports changed to local
- 4 package.json files — Added `@ipf/job-queue` and `bullmq` as devDependencies

## Tasks Completed

| Task | Package | Description |
| --- | --- | --- |
| T-DIST-013 | url-frontier | Retry backoff integration test with BullMQ |
| T-DIST-014 | url-frontier | Batch round-trip + dedup integration test |
| T-DIST-015 | url-frontier | Retention eviction integration test |
| T-COORD-023 | completion-detection | Pause/resume integration test |
| T-WORK-010 | worker-management | Stalled job recovery integration test |
| T-WORK-014 | worker-management | Crash recovery integration test |
| T-OBS-033 | observability | Trace propagation round-trip test |
| T-TEST-014 | testing-quality | Covered by combined tests above |
| T-OBS-029 | observability | Already implemented (trace-propagation.ts) |

## Key Decisions

1. **Circular dep fix via structural typing**: Rather than moving types to `@ipf/core`, locally declared structurally-compatible types in `@ipf/job-queue`. Integration tests in consumer packages verify compatibility at compile time.

2. **BullMQ stalled-check key behavior**: Discovered that the `stalled-check` Redis key uses `stalledInterval` as TTL. Workers sharing a queue must use compatible values or the longer TTL blocks shorter-interval stalled detection.

3. **Crash simulation via disconnect()**: `worker.disconnect()` severs Redis without cleanup, leaving jobs orphaned. `worker.close(true)` cleans up too well for stalled testing.

## RALPH Review

- **Verdict**: APPROVED (no sustained Critical/Major)
- **5 sustained Minor findings**:
  - F-009 (SYNC comments): Fixed — added to mirrored types
  - F-005 (retention assertion): Fixed — tightened to `≤ 1`
  - F-001 (worker1 leak): Documented as intentional
  - F-004 (setTimeout flakiness): Deferred — tracked for `pollUntil` utility
  - F-010 (trace happy path): Deferred — needs in-memory OTel exporter test

## Learnings

- BullMQ's stalled detection is a two-pass Lua script: first pass marks as stalled, second pass moves to waiting
- The `stalled-check` key prevents multiple workers from running the check simultaneously (coordination)
- `worker.disconnect()` is the right method for crash simulation in tests; `close()` is too graceful
- Structural typing in TypeScript makes circular dependency breaking feasible without relocating interfaces

## Commit

`215e4e7` — `test(integration): add BullMQ integration tests across 4 packages`
