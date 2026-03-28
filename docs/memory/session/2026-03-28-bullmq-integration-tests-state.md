# State Tracker: bullmq-integration-tests

## Branch: `work/bullmq-integration-tests`

## Started: 2026-03-28

## Current State

- **Phase**: G7 complete — commit `2dcedf0`
- **Status**: All 13/13 packages pass typecheck, lint, test
- **Commit**: `test(integration): add BullMQ integration tests across 4 packages`

## Decisions

1. **Circular dep fix**: Moved type declarations to local in `@ipf/job-queue` using structural typing. Removed `@ipf/url-frontier` and `@ipf/completion-detection` from job-queue's deps entirely.
2. **BullMQ stalled-check key**: The `stalled-check` key in Redis uses `stalledInterval` as TTL. Workers sharing a queue must use compatible `stalledInterval` values.
3. **Stalled test approach**: Use `worker.disconnect()` (not `close(true)`) to simulate crash — leaves job orphaned without cleanup.
4. **T-OBS-029**: Already implemented in `trace-propagation.ts` — no new test needed.

## Tasks

| Task | Package | Status |
| --- | --- | --- |
| T-DIST-013 | url-frontier | done |
| T-DIST-014 | url-frontier | done |
| T-DIST-015 | url-frontier | done |
| T-COORD-023 | completion-detection | done |
| T-WORK-010 | worker-management | done |
| T-WORK-014 | worker-management | done |
| T-TEST-014 | testing-quality | done |
| T-OBS-029 | observability | done (pre-existing) |
| T-OBS-033 | observability | done |
