# Worker Management — Tasks

> Implementation tasks traceable to [requirements.md](requirements.md). Dependency-ordered.
> Design: [design.md](design.md)

---

## Phase 1: Utilization Tracker

- [x] **T-WORK-001**: Implement UtilizationTracker with in-process counters and floor guard → REQ-DIST-011
- [x] **T-WORK-002**: Wire lifecycle events (started, completed, failed) to tracker → REQ-DIST-011

## Phase 2: Job Consumer Adapter

- [x] **T-WORK-003**: Implement job consumer with configurable concurrency → REQ-DIST-007
- [x] **T-WORK-004**: Implement single-start guard (boolean flag + throw) → REQ-DIST-010
- [x] **T-WORK-005**: Register all event listeners before enabling consumption → REQ-DIST-009
- [x] **T-WORK-006**: Configure stalled job detection (interval, lock duration with 2x invariant) → REQ-DIST-008

## Phase 3: Recovery & Observability

- [x] **T-WORK-011**: Implement worker re-registration on crash/restart (resume consuming without manual intervention) → REQ-DIST-012
- [x] **T-WORK-012**: Implement counter inconsistency guard (detect activeJobs > maxConcurrency, reset via queue query, emit metric) → REQ-DIST-013
- [x] **T-WORK-013**: Implement worker metrics: `worker_active_jobs`, `worker_utilization_ratio`, `worker_jobs_processed_total`, `utilization_counter_reset_total` → REQ-DIST-014

## Phase 4: Tests

- [x] **T-WORK-007**: Unit test for utilization ratio calculation and floor guard → REQ-DIST-011
- [x] **T-WORK-008**: Unit test for start guard (second call throws) → REQ-DIST-010
- [x] **T-WORK-009**: Integration test for configurable concurrency → REQ-DIST-007
- [ ] **T-WORK-010**: Distributed test for stalled job recovery → REQ-DIST-008 _(deferred: requires BullMQ infrastructure adapter)_
- [ ] **T-WORK-014**: Integration test for worker crash recovery and re-registration → REQ-DIST-012 _(deferred: requires BullMQ infrastructure adapter)_
- [x] **T-WORK-015**: Unit test for counter inconsistency detection and reset → REQ-DIST-013
- [x] **T-WORK-016**: Integration test for worker metrics exposure → REQ-DIST-014

---

## Dependencies

| Task | Depends On | Blocks |
| --- | --- | --- |
| Phase 1 (tracker) | core-contracts (CrawlMetrics) | Phase 2 |
| Phase 2 (consumer) | Phase 1, url-frontier (queue) | application-lifecycle |
| Phase 3 (recovery) | Phase 2 | Phase 4 |
| Phase 4 (tests) | Phases 1-3 | — |

---

> **Provenance**: Created 2026-03-25. Implementation Agent task decomposition per ADR-020. Updated 2026-03-25: added Phase 3 (REQ-DIST-012–014 crash recovery, counter guard, metrics). Updated 2026-03-27: marked 12/16 tasks complete (Phases 1-3 + unit tests), 4 integration/distributed tests remaining. Updated 2026-03-28: added T-WORK-009 + T-WORK-016 integration tests; T-WORK-010 + T-WORK-014 deferred (blocked on BullMQ adapter).
