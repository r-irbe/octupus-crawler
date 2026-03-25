# Worker Management — Tasks

> Implementation tasks traceable to [requirements.md](requirements.md). Dependency-ordered.
> Design: [design.md](design.md)

---

## Phase 1: Utilization Tracker

- [ ] **T-WORK-001**: Implement UtilizationTracker with in-process counters and floor guard → REQ-DIST-011
- [ ] **T-WORK-002**: Wire lifecycle events (started, completed, failed) to tracker → REQ-DIST-011

## Phase 2: Job Consumer Adapter

- [ ] **T-WORK-003**: Implement job consumer with configurable concurrency → REQ-DIST-007
- [ ] **T-WORK-004**: Implement single-start guard (boolean flag + throw) → REQ-DIST-010
- [ ] **T-WORK-005**: Register all event listeners before enabling consumption → REQ-DIST-009
- [ ] **T-WORK-006**: Configure stalled job detection (interval, lock duration with 2x invariant) → REQ-DIST-008

## Phase 3: Tests

- [ ] **T-WORK-007**: Unit test for utilization ratio calculation and floor guard → REQ-DIST-011
- [ ] **T-WORK-008**: Unit test for start guard (second call throws) → REQ-DIST-010
- [ ] **T-WORK-009**: Integration test for configurable concurrency → REQ-DIST-007
- [ ] **T-WORK-010**: Distributed test for stalled job recovery → REQ-DIST-008

---

## Dependencies

| Task | Depends On | Blocks |
| --- | --- | --- |
| Phase 1 (tracker) | core-contracts (CrawlMetrics) | Phase 2 |
| Phase 2 (consumer) | Phase 1, url-frontier (queue) | application-lifecycle |
| Phase 3 (tests) | Phases 1-2 | — |

---

> **Provenance**: Created 2026-03-25. Implementation Agent task decomposition per ADR-020.
