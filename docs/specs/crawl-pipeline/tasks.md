# Crawl Pipeline — Tasks

> Implementation tasks traceable to [requirements.md](requirements.md). Dependency-ordered.
> Design: [design.md](design.md)

---

## Phase 1: URL Processing

- [x] **T-CRAWL-001**: Implement URL normalization function (strip fragment, trailing slash, sort params) → REQ-CRAWL-002
- [x] **T-CRAWL-002**: Implement `NormalizedUrl` branded type → REQ-CRAWL-003
- [x] **T-CRAWL-003**: Implement `CrawlUrl` factory function with scheme check → REQ-CRAWL-001, REQ-CRAWL-003
- [x] **T-CRAWL-004**: Handle empty/invalid URL inputs returning typed errors → REQ-CRAWL-004

## Phase 2: Data Types

- [x] **T-CRAWL-005**: Define `FrontierEntry` type with all required fields → REQ-CRAWL-013
- [x] **T-CRAWL-006**: Define `FetchResult` type → REQ-CRAWL-016
- [x] **T-CRAWL-007**: Define `CrawlResult` type (fetch result + discovered URLs + enqueued count)

## Phase 3: Pipeline Stages

- [x] **T-CRAWL-008**: Implement validate stage (depth guard + domain allow-list) → REQ-CRAWL-007, REQ-CRAWL-008
- [x] **T-CRAWL-009**: Implement fetch stage (delegates to Fetcher contract) → REQ-CRAWL-005
- [x] **T-CRAWL-010**: Implement discover stage (content-type gate, link extraction, relative URL resolution, per-page dedup) → REQ-CRAWL-009, REQ-CRAWL-010, REQ-CRAWL-011, REQ-CRAWL-012
- [x] **T-CRAWL-011**: Implement enqueue stage (child depth calc, batch enqueue, error mapping) → REQ-CRAWL-014, REQ-CRAWL-015
- [x] **T-CRAWL-012**: Compose stages via `Result.andThen()` chaining → REQ-CRAWL-005, REQ-CRAWL-006

## Phase 4: IDN & Cross-Spec Integration

- [x] **T-CRAWL-021**: Implement IDN→Punycode conversion (IDNA 2008) and non-ASCII path/query percent-encoding → REQ-CRAWL-017
- [x] **T-CRAWL-022**: Implement `FetchResult.finalUrl` as full `CrawlUrl` object (raw, normalized, domain) → REQ-CRAWL-018
- [x] **T-CRAWL-023**: Implement `LinkExtractor.extract()` returning `Result<string[], LinkExtractError>` with partial results → REQ-CRAWL-019

## Phase 5: Tests

- [x] **T-CRAWL-013**: Property tests for URL normalization (determinism, idempotence) → REQ-CRAWL-002
- [x] **T-CRAWL-014**: Unit tests for scheme validation → REQ-CRAWL-001
- [x] **T-CRAWL-015**: Unit tests for empty/invalid URL error paths → REQ-CRAWL-004
- [x] **T-CRAWL-016**: Unit tests for validate stage (depth guard, domain filter) → REQ-CRAWL-007, REQ-CRAWL-008
- [x] **T-CRAWL-017**: Unit tests for content-type gate → REQ-CRAWL-009
- [x] **T-CRAWL-018**: Scenario test for full pipeline with mock fetcher → REQ-CRAWL-005
- [x] **T-CRAWL-019**: Unit tests for relative URL resolution against final URL → REQ-CRAWL-010
- [x] **T-CRAWL-020**: Unit tests for malformed href graceful handling → REQ-CRAWL-012
- [x] **T-CRAWL-024**: Unit + property tests for IDN→Punycode conversion → REQ-CRAWL-017
- [x] **T-CRAWL-025**: Unit test for FetchResult.finalUrl as CrawlUrl object → REQ-CRAWL-018
- [x] **T-CRAWL-026**: Unit test for LinkExtractor Result return type with partial results → REQ-CRAWL-019

---

## Dependencies

| Task | Depends On | Blocks |
| --- | --- | --- |
| Phase 1 (URL processing) | core-contracts: error types | http-fetching, url-frontier |
| Phase 2 (data types) | Phase 1 | Phase 3 |
| Phase 3 (pipeline stages) | Phase 2, core-contracts (Fetcher, Frontier, LinkExtractor) | worker-management |
| Phase 4 (IDN/cross-spec) | Phase 1, Phase 3, core-contracts | http-fetching |
| Phase 5 (tests) | Phases 1-4 | — |

---

> **Provenance**: Created 2026-03-25. Implementation Agent task decomposition per ADR-020. Updated 2026-03-25: added Phase 4 (REQ-CRAWL-017–019 IDN, finalUrl CrawlUrl, LinkExtractor Result). Updated 2026-03-26: checked completed tasks per G11 spec update gate.
