# Worklog: HTTP Fetching Implementation

| Field | Value |
| --- | --- |
| Date | 2026-03-26 |
| Branch | `work/http-fetching` |
| Scope | `packages/http-fetching` |
| Commits | `f31c85b` (scaffold), `4a3b3b3` (implementation), `5f56529` (review fixes) |

## Summary

Implemented the HTTP Fetching package (`@ipf/http-fetching`) — core HTTP client with manual redirect loop, per-hop SSRF validation, politeness enforcement, stream processing, and error classification.

## Files Created

| File | Purpose | Lines |
| --- | --- | --- |
| `src/lru-map.ts` | Bounded LRU Map with eviction | 68 |
| `src/politeness-controller.ts` | Per-domain delay, promise-chain serialization, TLD+1 | 130 |
| `src/error-classifier.ts` | Maps exceptions to 9 FetchError variants | 140 |
| `src/stream-processor.ts` | Content-Length pre-flight, streaming byte counter, drain | 85 |
| `src/http-fetcher.ts` | Main fetcher: redirect loop, SSRF, metrics | 210 |
| `src/fetch-types.ts` | FetchMetrics contract + NULL_FETCH_METRICS | 20 |

## Tests: 63 passing across 6 test files

| File | Tests | Coverage |
| --- | --- | --- |
| `lru-map.unit.test.ts` | 11 | Eviction, ordering, capacity, edge cases |
| `politeness-controller.unit.test.ts` | 14 | Delay, concurrency, TLD+1, pruning, disposal |
| `error-classifier.unit.test.ts` | 13 | All 9 variants + classifyTimeout |
| `stream-processor.unit.test.ts` | 11 | Content-Length, streaming limits, drain |
| `http-fetcher.unit.test.ts` | 8 | Redirects, relative Location, metrics |
| `http-fetcher-edge.unit.test.ts` | 6 | SSRF pinned IP, drain errors, timeout, HTTP errors |

## Decisions

1. **Promise-chain politeness** (not timestamp): REQ-FETCH-020 mandates concurrency-safe serialization
2. **`tldts` for TLD+1**: REQ-FETCH-021 requires public suffix list; tldts lightweight
3. **Manual redirect loop**: Per design.md — needed for per-hop SSRF validation
4. **Local `SsrfCheckResult` → imported `SsrfValidationResult`**: Fixed in review (F-01), contract-first per ADR-020
5. **`classifyTimeout` preserves `timeoutMs`**: Fixed in review (F-03), aids incident response
6. **PC orchestration is caller's responsibility**: Documented in code (F-02), crawl-pipeline will integrate

## Review Council Findings

| ID | Severity | Finding | Resolution |
| --- | --- | --- | --- |
| F-01 | Major | Local SsrfCheckResult instead of importing SsrfValidationResult | Fixed: import from @ipf/ssrf-guard |
| F-02 | Minor | PolitenessController not integrated in httpFetch | Documented: caller orchestrates |
| F-03 | Minor | classifyAbortError always uses timeoutMs: 0 | Fixed: added classifyTimeout with config.timeoutMs |
| F-07 | Minor | No timeout test | Fixed: added slow client + short timeoutMs test |

## Deferred Items

- Property-based tests for http-fetching (fast-check) — to be added in testing hardening pass
- Integration with crawl-pipeline (PolitenessController orchestration)

---

> **Provenance**: Created 2026-03-26. Implementation Agent worklog per G9.
