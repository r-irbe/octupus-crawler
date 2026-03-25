# Crawl Pipeline — Tasks

> Implementation tasks traceable to [requirements.md](requirements.md). Dependency-ordered.
> Design: [design.md](design.md)

---

## Phase 1: URL Processing

- [ ] **T-CRAWL-001**: Implement URL normalization function (strip fragment, trailing slash, sort params) → REQ-CRAWL-002
- [ ] **T-CRAWL-002**: Implement `NormalizedUrl` branded type → REQ-CRAWL-003
- [ ] **T-CRAWL-003**: Implement `CrawlUrl` factory function with scheme check → REQ-CRAWL-001, REQ-CRAWL-003
- [ ] **T-CRAWL-004**: Handle empty/invalid URL inputs returning typed errors → REQ-CRAWL-004

## Phase 2: Data Types

- [ ] **T-CRAWL-005**: Define `FrontierEntry` type with all required fields → REQ-CRAWL-013
- [ ] **T-CRAWL-006**: Define `FetchResult` type → REQ-CRAWL-016
- [ ] **T-CRAWL-007**: Define `CrawlResult` type (fetch result + discovered URLs + enqueued count)

## Phase 3: Pipeline Stages

- [ ] **T-CRAWL-008**: Implement validate stage (depth guard + domain allow-list) → REQ-CRAWL-007, REQ-CRAWL-008
- [ ] **T-CRAWL-009**: Implement fetch stage (delegates to Fetcher contract) → REQ-CRAWL-005
- [ ] **T-CRAWL-010**: Implement discover stage (content-type gate, link extraction, relative URL resolution, per-page dedup) → REQ-CRAWL-009, REQ-CRAWL-010, REQ-CRAWL-011, REQ-CRAWL-012
- [ ] **T-CRAWL-011**: Implement enqueue stage (child depth calc, batch enqueue, error mapping) → REQ-CRAWL-014, REQ-CRAWL-015
- [ ] **T-CRAWL-012**: Compose stages via `Result.andThen()` chaining → REQ-CRAWL-005, REQ-CRAWL-006

## Phase 4: Tests

- [ ] **T-CRAWL-013**: Property tests for URL normalization (determinism, idempotence) → REQ-CRAWL-002
- [ ] **T-CRAWL-014**: Unit tests for scheme validation → REQ-CRAWL-001
- [ ] **T-CRAWL-015**: Unit tests for empty/invalid URL error paths → REQ-CRAWL-004
- [ ] **T-CRAWL-016**: Unit tests for validate stage (depth guard, domain filter) → REQ-CRAWL-007, REQ-CRAWL-008
- [ ] **T-CRAWL-017**: Unit tests for content-type gate → REQ-CRAWL-009
- [ ] **T-CRAWL-018**: Scenario test for full pipeline with mock fetcher → REQ-CRAWL-005
- [ ] **T-CRAWL-019**: Unit tests for relative URL resolution against final URL → REQ-CRAWL-010
- [ ] **T-CRAWL-020**: Unit tests for malformed href graceful handling → REQ-CRAWL-012

---

## Dependencies

| Task | Depends On | Blocks |
| --- | --- | --- |
| Phase 1 (URL processing) | core-contracts: error types | http-fetching, url-frontier |
| Phase 2 (data types) | Phase 1 | Phase 3 |
| Phase 3 (pipeline stages) | Phase 2, core-contracts (Fetcher, Frontier, LinkExtractor) | worker-management |
| Phase 4 (tests) | Phases 1-3 | — |

---

> **Provenance**: Created 2026-03-25. Implementation Agent task decomposition per ADR-020.
