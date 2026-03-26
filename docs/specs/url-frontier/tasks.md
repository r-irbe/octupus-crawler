# URL Frontier — Tasks

> Implementation tasks traceable to [requirements.md](requirements.md). Dependency-ordered.
> Design: [design.md](design.md)

---

## Phase 1: Core Frontier

- [x] **T-DIST-001**: Implement deterministic job ID derivation (SHA-256 of normalized URL) → REQ-DIST-001
- [x] **T-DIST-002**: Implement depth-to-priority mapping for BFS ordering → REQ-DIST-002
- [x] **T-DIST-003**: Implement batch enqueue via `addBulk()` (single round-trip) → REQ-DIST-004
- [x] **T-DIST-004**: Define shared constant queue name → REQ-DIST-006

## Phase 2: Retry & Retention

- [x] **T-DIST-005**: Configure exponential backoff retry (3 attempts, 1s base) → REQ-DIST-003
- [x] **T-DIST-006**: Configure sliding window retention (10K completed, 5K failed) → REQ-DIST-005

## Phase 3: Frontier Contract Adapter

- [x] **T-DIST-007**: Implement `Frontier` contract adapter wrapping the queue
- [x] **T-DIST-008**: Implement `enqueue()` returning `Result<number, QueueError>`
- [x] **T-DIST-009**: Implement `size()` returning frontier statistics
- [x] **T-DIST-010**: Implement `close()` with graceful queue shutdown

## Phase 4: URL Normalization & Collision Resilience

- [ ] **T-DIST-016**: Implement comprehensive URL normalization (scheme/host lowercasing, default port removal, path encoding normalization, fragment removal, query param sorting, trailing slash) → REQ-DIST-007
- [x] **T-DIST-017**: Document SHA-256 truncation collision resistance analysis (2^64 birthday bound, <10^{-10} for ≤10^9 URLs) → REQ-DIST-008
- [x] **T-DIST-018**: Implement `url_frontier_collisions_total` counter metric (detect via addBulk discrepancy) → REQ-DIST-009

## Phase 5: Tests

- [x] **T-DIST-011**: Distributed test: idempotent enqueue (same URL = same job ID) → REQ-DIST-001
- [x] **T-DIST-012**: Unit test: depth-to-priority mapping → REQ-DIST-002
- [ ] **T-DIST-013**: Distributed test: retry with backoff timing → REQ-DIST-003
- [ ] **T-DIST-014**: Integration test: batch enqueue round-trip count → REQ-DIST-004
- [ ] **T-DIST-015**: Distributed test: retention window eviction → REQ-DIST-005
- [ ] **T-DIST-019**: Property test: URL normalization idempotence (normalize(normalize(url)) === normalize(url)) → REQ-DIST-007
- [x] **T-DIST-020**: Unit test: collision resistance documentation accuracy → REQ-DIST-008
- [x] **T-DIST-021**: Integration test: collision counter increment on addBulk discrepancy → REQ-DIST-009

---

## Dependencies

| Task | Depends On | Blocks |
| --- | --- | --- |
| Phase 1 (core) | core-contracts (Frontier interface, CrawlUrl type) | Phase 3 |
| Phase 2 (retry/retention) | Phase 1 | — |
| Phase 3 (adapter) | Phase 1, Phase 2 | crawl-pipeline, worker-management |
| Phase 4 (normalization) | Phase 1, crawl-pipeline (URL processing) | Phase 5 |
| Phase 5 (tests) | Phases 1-4 | — |

---

> **Provenance**: Created 2026-03-25. Implementation Agent task decomposition per ADR-020. Updated 2026-03-25: added Phase 4 (REQ-DIST-007–009 URL normalization, collision analysis, collision metric). Updated 2026-03-26: checked completed tasks per G11 spec update gate.
