# URL Frontier — Tasks

> Implementation tasks traceable to [requirements.md](requirements.md). Dependency-ordered.
> Design: [design.md](design.md)

---

## Phase 1: Core Frontier

- [ ] **T-DIST-001**: Implement deterministic job ID derivation (SHA-256 of normalized URL) → REQ-DIST-001
- [ ] **T-DIST-002**: Implement depth-to-priority mapping for BFS ordering → REQ-DIST-002
- [ ] **T-DIST-003**: Implement batch enqueue via `addBulk()` (single round-trip) → REQ-DIST-004
- [ ] **T-DIST-004**: Define shared constant queue name → REQ-DIST-006

## Phase 2: Retry & Retention

- [ ] **T-DIST-005**: Configure exponential backoff retry (3 attempts, 1s base) → REQ-DIST-003
- [ ] **T-DIST-006**: Configure sliding window retention (10K completed, 5K failed) → REQ-DIST-005

## Phase 3: Frontier Contract Adapter

- [ ] **T-DIST-007**: Implement `Frontier` contract adapter wrapping the queue
- [ ] **T-DIST-008**: Implement `enqueue()` returning `Result<number, QueueError>`
- [ ] **T-DIST-009**: Implement `size()` returning frontier statistics
- [ ] **T-DIST-010**: Implement `close()` with graceful queue shutdown

## Phase 4: Tests

- [ ] **T-DIST-011**: Distributed test: idempotent enqueue (same URL = same job ID) → REQ-DIST-001
- [ ] **T-DIST-012**: Unit test: depth-to-priority mapping → REQ-DIST-002
- [ ] **T-DIST-013**: Distributed test: retry with backoff timing → REQ-DIST-003
- [ ] **T-DIST-014**: Integration test: batch enqueue round-trip count → REQ-DIST-004
- [ ] **T-DIST-015**: Distributed test: retention window eviction → REQ-DIST-005

---

## Dependencies

| Task | Depends On | Blocks |
| --- | --- | --- |
| Phase 1 (core) | core-contracts (Frontier interface, CrawlUrl type) | Phase 3 |
| Phase 2 (retry/retention) | Phase 1 | — |
| Phase 3 (adapter) | Phase 1, Phase 2 | crawl-pipeline, worker-management |
| Phase 4 (tests) | Phases 1-3 | — |

---

> **Provenance**: Created 2026-03-25. Implementation Agent task decomposition per ADR-020.
