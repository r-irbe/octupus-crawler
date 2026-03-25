# HTTP Fetching — Tasks

> Implementation tasks traceable to [requirements.md](requirements.md). Dependency-ordered.
> Design: [design.md](design.md)

---

## Phase 1: Politeness Controller

- [ ] **T-FETCH-001**: Implement LRU Map with configurable hard cap and eviction → REQ-FETCH-013
- [ ] **T-FETCH-002**: Implement per-domain delay enforcement with immediate first request → REQ-FETCH-009, REQ-FETCH-010
- [ ] **T-FETCH-003**: Ensure failed fetches do not break domain serialization → REQ-FETCH-011
- [ ] **T-FETCH-004**: Implement stale entry pruning → REQ-FETCH-012

## Phase 2: HTTP Client Adapter

- [ ] **T-FETCH-005**: Implement HTTP client wrapper with configurable User-Agent → REQ-FETCH-001, REQ-FETCH-002
- [ ] **T-FETCH-006**: Make HTTP client injectable via Fetcher contract → REQ-FETCH-003
- [ ] **T-FETCH-007**: Implement manual redirect loop with counter → REQ-FETCH-004
- [ ] **T-FETCH-008**: Resolve relative `Location` headers at each redirect hop → REQ-FETCH-005
- [ ] **T-FETCH-009**: Handle 3xx without Location as HTTP error → REQ-FETCH-006
- [ ] **T-FETCH-010**: Wire SSRF validation into redirect loop → REQ-FETCH-007
- [ ] **T-FETCH-011**: Record final URL when different from request URL → REQ-FETCH-008

## Phase 3: Response Processing

- [ ] **T-FETCH-012**: Implement Content-Length pre-flight size check → REQ-FETCH-015
- [ ] **T-FETCH-013**: Implement streaming byte counter with stream destruction → REQ-FETCH-014
- [ ] **T-FETCH-014**: Implement UTF-8 body decoding → REQ-FETCH-016
- [ ] **T-FETCH-015**: Drain redirect/non-2xx response bodies → REQ-FETCH-017

## Phase 4: Error Classification

- [ ] **T-FETCH-016**: Implement error classifier mapping exceptions to 9 FetchError variants → REQ-FETCH-018
- [ ] **T-FETCH-017**: Track wall-clock duration for every fetch → REQ-FETCH-019

## Phase 5: Tests

- [ ] **T-FETCH-018**: Unit tests for politeness delay enforcement and LRU eviction → REQ-FETCH-009 to 013
- [ ] **T-FETCH-019**: Scenario tests for redirect chain following (success, limit exceeded) → REQ-FETCH-004, REQ-FETCH-008
- [ ] **T-FETCH-020**: Scenario test for relative Location resolution → REQ-FETCH-005
- [ ] **T-FETCH-021**: Scenario test for 3xx without Location → REQ-FETCH-006
- [ ] **T-FETCH-022**: Scenario test for body size limit (Content-Length pre-flight + streaming) → REQ-FETCH-014, REQ-FETCH-015
- [ ] **T-FETCH-023**: Unit tests for all 9 error classification variants → REQ-FETCH-018
- [ ] **T-FETCH-024**: Unit test for duration tracking → REQ-FETCH-019

---

## Dependencies

| Task | Depends On | Blocks |
| --- | --- | --- |
| Phase 1 (politeness) | — | Phase 2 |
| Phase 2 (HTTP client) | ssrf-guard, Phase 1 | crawl-pipeline integration |
| Phase 3 (response) | Phase 2 | crawl-pipeline integration |
| Phase 4 (errors) | core-contracts: error types | — |
| Phase 5 (tests) | Phases 1-4 | — |

---

> **Provenance**: Created 2026-03-25. Implementation Agent task decomposition per ADR-020.
