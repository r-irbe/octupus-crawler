# Application Lifecycle — Tasks

> Implementation tasks traceable to [requirements.md](requirements.md). Dependency-ordered.
> Design: [design.md](design.md)

---

## Phase 1: Configuration

- [ ] **T-LIFE-001**: Define Zod schema for required env vars (STATE_STORE_URL, METRICS_PORT, etc.) → REQ-LIFE-CFG-002
- [ ] **T-LIFE-002**: Define Zod schema for optional env vars with defaults → REQ-LIFE-CFG-003
- [ ] **T-LIFE-003**: Implement `loadConfig()` returning `Result<Config, ValidationError>` → REQ-LIFE-CFG-001

## Phase 2: Startup Sequence

- [ ] **T-LIFE-004**: Implement config validation gate (exit 1 on failure) → REQ-LIFE-001
- [ ] **T-LIFE-005**: Implement seed URL validation (exit 1 on empty list) → REQ-LIFE-002
- [ ] **T-LIFE-006**: Implement observability initialization before app wiring → REQ-LIFE-003
- [ ] **T-LIFE-007**: Configure logger with worker ID and service name bindings → REQ-LIFE-004
- [ ] **T-LIFE-008**: Start tracer before crawl begins → REQ-LIFE-005
- [ ] **T-LIFE-009**: Start job consumer before seeding → REQ-LIFE-006

## Phase 3: Seeding

- [ ] **T-LIFE-010**: Implement seed URL processing (skip invalid, log warnings) → REQ-LIFE-007
- [ ] **T-LIFE-011**: Enqueue valid seeds at depth 0 with discoveredBy: 'coordinator' → REQ-LIFE-008
- [ ] **T-LIFE-012**: Log enqueue failures during seeding → REQ-LIFE-009
- [ ] **T-LIFE-013**: Record frontier size metric after seeding → REQ-LIFE-010

## Phase 4: Signal Handling

- [ ] **T-LIFE-014**: Register SIGINT handler → REQ-LIFE-011
- [ ] **T-LIFE-015**: Register SIGTERM handler → REQ-LIFE-012
- [ ] **T-LIFE-016**: Register uncaughtException handler (log fatal, exit 1) → REQ-LIFE-013
- [ ] **T-LIFE-017**: Register unhandledRejection handler (log fatal, exit 1) → REQ-LIFE-014
- [ ] **T-LIFE-018**: Wrap main() in try/catch (log fatal, exit 1) → REQ-LIFE-015
- [ ] **T-LIFE-019**: Handle state-store abort (exit 3) → REQ-LIFE-016
- [ ] **T-LIFE-020**: Handle successful completion (exit 0) → REQ-LIFE-017

## Phase 5: Graceful Shutdown

- [ ] **T-LIFE-021**: Implement idempotent shutdown guard → REQ-LIFE-018
- [ ] **T-LIFE-022**: Implement Phase 1 drain (consumer.close with timeout) → REQ-LIFE-019
- [ ] **T-LIFE-023**: Implement Phase 2 teardown (Promise.allSettled) → REQ-LIFE-019, REQ-LIFE-020
- [ ] **T-LIFE-024**: Log teardown failures with component name → REQ-LIFE-021
- [ ] **T-LIFE-025**: Define typed ShutdownReason discriminated union → REQ-LIFE-022
- [ ] **T-LIFE-026**: Implement coordinator close (clear interval, settle promise) → REQ-LIFE-023
- [ ] **T-LIFE-027**: Ensure coordinator does not close shared resources → REQ-LIFE-024

## Phase 6: Worker Processing

- [ ] **T-LIFE-028**: Implement job payload validation (Zod/type guard) → REQ-LIFE-025
- [ ] **T-LIFE-029**: Re-throw queue_error for queue retry → REQ-LIFE-026
- [ ] **T-LIFE-030**: Record metrics for success and failure → REQ-LIFE-027
- [ ] **T-LIFE-031**: Create single fetcher instance, reused across jobs → REQ-LIFE-028

## Phase 7: Tests

- [ ] **T-LIFE-032**: Unit tests for config loading (valid, invalid, missing) → REQ-LIFE-CFG-001 to 003
- [ ] **T-LIFE-033**: Unit test for seed validation and invalid URL skipping → REQ-LIFE-007
- [ ] **T-LIFE-034**: Scenario tests for signal handling (SIGINT, SIGTERM) → REQ-LIFE-011, 012
- [ ] **T-LIFE-035**: Unit test for idempotent shutdown → REQ-LIFE-018
- [ ] **T-LIFE-036**: Unit test for settle-all teardown with partial failure → REQ-LIFE-020, 021
- [ ] **T-LIFE-037**: Unit test for queue_error re-throw → REQ-LIFE-026
- [ ] **T-LIFE-038**: Scenario test for full startup → completion → shutdown → REQ-LIFE-001 to 017

---

## Dependencies

| Task | Depends On | Blocks |
| --- | --- | --- |
| Phase 1 (config) | core-contracts (error types) | Everything |
| Phase 2 (startup) | Phase 1, observability, url-frontier, worker-management | Phase 3 |
| Phase 3 (seeding) | Phase 2, crawl-pipeline | Phase 4 |
| Phase 4 (signals) | — | Phase 5 |
| Phase 5 (shutdown) | Phase 4 | — |
| Phase 6 (worker) | crawl-pipeline, http-fetching | — |
| Phase 7 (tests) | Phases 1-6 | — |

---

> **Provenance**: Created 2026-03-25. Implementation Agent task decomposition per ADR-020.
