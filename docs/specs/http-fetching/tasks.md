# HTTP Fetching — Tasks

> Implementation tasks traceable to [requirements.md](requirements.md). Dependency-ordered.
> Design: [design.md](design.md)

---

## Phase 1: Politeness Controller

- [x] **T-FETCH-001**: Implement LRU Map with configurable hard cap and eviction → REQ-FETCH-013
- [x] **T-FETCH-002**: Implement per-domain delay enforcement with immediate first request → REQ-FETCH-009, REQ-FETCH-010
- [x] **T-FETCH-003**: Ensure failed fetches do not break domain serialization → REQ-FETCH-011
- [x] **T-FETCH-004**: Implement stale entry pruning → REQ-FETCH-012

## Phase 2: HTTP Client Adapter

- [x] **T-FETCH-005**: Implement HTTP client wrapper with configurable User-Agent → REQ-FETCH-001, REQ-FETCH-002
- [x] **T-FETCH-006**: Make HTTP client injectable via Fetcher contract → REQ-FETCH-003
- [x] **T-FETCH-007**: Implement manual redirect loop with counter → REQ-FETCH-004
- [x] **T-FETCH-008**: Resolve relative `Location` headers at each redirect hop → REQ-FETCH-005
- [x] **T-FETCH-009**: Handle 3xx without Location as HTTP error → REQ-FETCH-006
- [x] **T-FETCH-010**: Wire SSRF validation into redirect loop → REQ-FETCH-007
- [x] **T-FETCH-011**: Record final URL when different from request URL → REQ-FETCH-008

## Phase 3: Response Processing

- [x] **T-FETCH-012**: Implement Content-Length pre-flight size check → REQ-FETCH-015
- [x] **T-FETCH-013**: Implement streaming byte counter with stream destruction → REQ-FETCH-014
- [x] **T-FETCH-014**: Implement UTF-8 body decoding → REQ-FETCH-016
- [x] **T-FETCH-015**: Drain redirect/non-2xx response bodies → REQ-FETCH-017

## Phase 4: Error Classification

- [x] **T-FETCH-016**: Implement error classifier mapping exceptions to 9 FetchError variants → REQ-FETCH-018
- [x] **T-FETCH-017**: Track wall-clock duration for every fetch → REQ-FETCH-019

## Phase 5: Metrics & Integration

- [x] **T-FETCH-025**: Implement `fetches_total` counter with `status` and `error_kind` labels → REQ-FETCH-022
- [x] **T-FETCH-026**: Implement `fetch_duration_seconds` histogram with configurable buckets → REQ-FETCH-022
- [x] **T-FETCH-027**: Implement `redirects_followed_total` counter and `body_bytes_received_total` counter → REQ-FETCH-022
- [x] **T-FETCH-028**: Implement per-domain promise-chain serialization for concurrency safety → REQ-FETCH-020
- [x] **T-FETCH-029**: Implement TLD+1 domain grouping via public suffix list → REQ-FETCH-021
- [x] **T-FETCH-030**: Integrate SSRF guard pinned IP result (use `pinnedIp` + `Host` header) → REQ-FETCH-023
- [x] **T-FETCH-031**: Implement stream drain error handling (catch + log, continue redirect chain) → REQ-FETCH-024

## Phase 6: Tests

- [x] **T-FETCH-018**: Unit tests for politeness delay enforcement and LRU eviction → REQ-FETCH-009 to 013
- [x] **T-FETCH-019**: Scenario tests for redirect chain following (success, limit exceeded) → REQ-FETCH-004, REQ-FETCH-008
- [x] **T-FETCH-020**: Scenario test for relative Location resolution → REQ-FETCH-005
- [x] **T-FETCH-021**: Scenario test for 3xx without Location → REQ-FETCH-006
- [x] **T-FETCH-022**: Scenario test for body size limit (Content-Length pre-flight + streaming) → REQ-FETCH-014, REQ-FETCH-015
- [x] **T-FETCH-023**: Unit tests for all 9 error classification variants → REQ-FETCH-018
- [x] **T-FETCH-024**: Unit test for duration tracking → REQ-FETCH-019
- [x] **T-FETCH-032**: Unit test for per-domain promise-chain concurrency safety → REQ-FETCH-020
- [x] **T-FETCH-033**: Unit test for TLD+1 domain grouping → REQ-FETCH-021
- [x] **T-FETCH-034**: Unit test for all fetcher metric recording → REQ-FETCH-022
- [x] **T-FETCH-035**: Integration test for SSRF pinned IP connection → REQ-FETCH-023
- [x] **T-FETCH-036**: Unit test for stream drain error handling during redirect → REQ-FETCH-024

---

## Dependencies

| Task | Depends On | Blocks |
| --- | --- | --- |
| Phase 1 (politeness) | — | Phase 2 |
| Phase 2 (HTTP client) | ssrf-guard, Phase 1 | crawl-pipeline integration |
| Phase 3 (response) | Phase 2 | crawl-pipeline integration |
| Phase 4 (errors) | core-contracts: error types | — |
| Phase 5 (metrics/integration) | Phase 2, ssrf-guard (pinned IP) | — |
| Phase 6 (tests) | Phases 1-5 | — |

---

> **Provenance**: Created 2026-03-25. Implementation Agent task decomposition per ADR-020. Updated 2026-03-25: added Phase 5 (REQ-FETCH-020–024 concurrency safety, TLD+1, metrics, SSRF integration, drain handling). Updated 2026-03-26: checked completed tasks per G11 spec update gate.
