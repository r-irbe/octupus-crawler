# Completion Detection & Control Plane — Tasks

> Implementation tasks traceable to [requirements.md](requirements.md). Dependency-ordered.
> Design: [design.md](design.md)

---

## Phase 1: Completion Detector

- [ ] **T-COORD-001**: Implement poll loop with configurable interval → REQ-DIST-012
- [ ] **T-COORD-002**: Implement normal completion check (pending=0, done>0) → REQ-DIST-012
- [ ] **T-COORD-003**: Implement empty-queue guard (two consecutive polls) → REQ-DIST-013
- [ ] **T-COORD-004**: Implement restart detection (done>0, no live events on first poll) → REQ-DIST-014
- [ ] **T-COORD-005**: Implement once guard for completion-wait call → REQ-DIST-016

## Phase 2: Backoff Controller

- [ ] **T-COORD-006**: Implement exponential backoff with capped skip ticks → REQ-DIST-015
- [ ] **T-COORD-007**: Implement abort after configurable consecutive failure threshold → REQ-DIST-015

## Phase 3: Control Plane

- [ ] **T-COORD-008**: Implement state derivation from live queue queries → REQ-DIST-017
- [ ] **T-COORD-009**: Implement queue-level pause and resume → REQ-DIST-018
- [ ] **T-COORD-010**: Implement idempotent cancel with promise deduplication → REQ-DIST-019
- [ ] **T-COORD-011**: Implement idempotent seeding via frontier dedup → REQ-DIST-020

## Phase 4: State-Store Connection

- [ ] **T-COORD-012**: Implement connection string parsing (host, port, password, ACL, TLS) → REQ-DIST-021
- [ ] **T-COORD-013**: Attach error handlers to all event-emitting components → REQ-DIST-022

## Phase 5: Tests

- [ ] **T-COORD-014**: Unit test for normal completion detection → REQ-DIST-012
- [ ] **T-COORD-015**: Unit test for empty-queue warning (two consecutive polls) → REQ-DIST-013
- [ ] **T-COORD-016**: Unit test for restart detection metric → REQ-DIST-014
- [ ] **T-COORD-017**: Unit test for backoff escalation and abort threshold → REQ-DIST-015
- [ ] **T-COORD-018**: Distributed test for pause/resume with in-flight jobs → REQ-DIST-018
- [ ] **T-COORD-019**: Unit test for idempotent cancel → REQ-DIST-019
- [ ] **T-COORD-020**: Integration test for state-store connection with auth → REQ-DIST-021

---

## Dependencies

| Task | Depends On | Blocks |
| --- | --- | --- |
| Phase 1 (completion) | url-frontier, core-contracts | application-lifecycle |
| Phase 2 (backoff) | — | Phase 1 |
| Phase 3 (control plane) | url-frontier | application-lifecycle |
| Phase 4 (connection) | configuration | Phase 1, Phase 3 |
| Phase 5 (tests) | Phases 1-4 | — |

---

> **Provenance**: Created 2026-03-25. Implementation Agent task decomposition per ADR-020.
