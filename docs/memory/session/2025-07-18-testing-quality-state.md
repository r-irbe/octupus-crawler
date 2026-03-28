# State Tracker: testing-quality deferred tasks

## Branch: `work/testing-quality`
## Started: 2025-07-18

## Current State
- **Phase**: G4 complete — marking deferred tasks
- **Tasks**: T-TEST-014, T-TEST-015, T-TEST-016, T-TEST-022 — all deferred (BullMQ/infra blocked)

## Plan
1. Mark 4 remaining tasks as deferred in tasks.md
2. Run G5 guard functions
3. Commit (G6)
4. G8 RALPH review council
5. G9 worklog, G10 report, G11 spec update
6. Merge to main

## Decisions
- All 4 remaining tasks require BullMQ or real running service infrastructure not yet available
- Consistent with deferred pattern across completion-detection, url-frontier, worker-management

## Tasks
| Task | Status | Notes |
| --- | --- | --- |
| T-TEST-014 | deferred | Worker job processing — needs BullMQ |
| T-TEST-015 | deferred | Graceful shutdown — needs real connections |
| T-TEST-016 | deferred | Metrics endpoint — needs running service |
| T-TEST-022 | deferred | Integration benchmarks — needs BullMQ tests |
