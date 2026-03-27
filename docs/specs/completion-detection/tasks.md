# Completion Detection & Control Plane — Tasks

> Implementation tasks traceable to [requirements.md](requirements.md). Dependency-ordered.
> Design: [design.md](design.md)

---

## Phase 1: Completion Detector

- [x] **T-COORD-001**: Implement poll loop with configurable interval → REQ-DIST-012
- [x] **T-COORD-002**: Implement normal completion check (pending=0, done>0) → REQ-DIST-012
- [x] **T-COORD-003**: Implement empty-queue guard (two consecutive polls) → REQ-DIST-013
- [x] **T-COORD-004**: Implement restart detection (done>0, no live events on first poll) → REQ-DIST-014
- [x] **T-COORD-005**: Implement once guard for completion-wait call → REQ-DIST-016

## Phase 2: Backoff Controller

- [x] **T-COORD-006**: Implement exponential backoff with capped skip ticks → REQ-DIST-015
- [x] **T-COORD-007**: Implement abort after configurable consecutive failure threshold → REQ-DIST-015

## Phase 3: Control Plane

- [x] **T-COORD-008**: Implement state derivation from live queue queries → REQ-DIST-017
- [x] **T-COORD-009**: Implement queue-level pause and resume → REQ-DIST-018
- [x] **T-COORD-010**: Implement idempotent cancel with promise deduplication → REQ-DIST-019
- [ ] **T-COORD-011**: Implement idempotent seeding via frontier dedup → REQ-DIST-020

## Phase 4: State-Store Connection

- [ ] **T-COORD-012**: Implement connection string parsing (host, port, password, ACL, TLS) → REQ-DIST-021
- [ ] **T-COORD-013**: Attach error handlers to all event-emitting components → REQ-DIST-022

## Phase 5: High Availability

- [x] **T-COORD-014**: Implement leader election via state-store SETNX with TTL → REQ-DIST-023
- [x] **T-COORD-015**: Implement lease renewal at TTL/3 interval → REQ-DIST-026
- [ ] **T-COORD-016**: Implement failover: standby acquires lease, re-derives state → REQ-DIST-024, REQ-DIST-025
- [x] **T-COORD-017**: Implement fencing: check isLeader() before every poll tick and command → REQ-DIST-027
- [x] **T-COORD-018**: Implement graceful lease release on shutdown → REQ-DIST-023

## Phase 6: Tests

- [x] **T-COORD-019**: Unit test for normal completion detection → REQ-DIST-012
- [x] **T-COORD-020**: Unit test for empty-queue warning (two consecutive polls) → REQ-DIST-013
- [x] **T-COORD-021**: Unit test for restart detection metric → REQ-DIST-014
- [x] **T-COORD-022**: Unit test for backoff escalation and abort threshold → REQ-DIST-015
- [ ] **T-COORD-023**: Distributed test for pause/resume with in-flight jobs → REQ-DIST-018
- [x] **T-COORD-024**: Unit test for idempotent cancel → REQ-DIST-019
- [ ] **T-COORD-025**: Integration test for state-store connection with auth → REQ-DIST-021
- [ ] **T-COORD-026**: Distributed test for leader election (two coordinators) → REQ-DIST-023
- [ ] **T-COORD-027**: Distributed test for failover (leader crash, standby takeover) → REQ-DIST-024

---

## Dependencies

| Task | Depends On | Blocks |
| --- | --- | --- |
| Phase 1 (completion) | url-frontier, core-contracts | application-lifecycle |
| Phase 2 (backoff) | — | Phase 1 |
| Phase 3 (control plane) | url-frontier | application-lifecycle |
| Phase 4 (connection) | configuration | Phase 1, Phase 3 |
| Phase 5 (HA) | Phase 4 (connection) | Phase 6 |
| Phase 6 (tests) | Phases 1-5 | — |

---

> **Provenance**: Created 2026-03-25. Implementation Agent task decomposition per ADR-020.
