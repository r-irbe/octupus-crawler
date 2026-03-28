# SSRF Guard — Tasks

> Implementation tasks traceable to [requirements.md](requirements.md). Dependency-ordered.
> Design: [design.md](design.md)

---

## Phase 1: IP Range Checking

- [x] **T-SEC-001**: Implement IPv4 CIDR range checker for all blocked ranges → REQ-SEC-001
- [x] **T-SEC-002**: Implement IPv6 blocked address checker → REQ-SEC-002
- [x] **T-SEC-003**: Implement IPv4-mapped IPv6 normalization (`::ffff:x.x.x.x` → IPv4) → GAP-SEC-001
- [x] **T-SEC-004**: Extend blocked ranges with CGNAT, multicast, broadcast → GAP-SEC-002
- [x] **T-SEC-005**: Implement literal IP detection (skip DNS for raw IPs) → REQ-SEC-005

## Phase 2: DNS Resolution & Validation

- [x] **T-SEC-006**: Implement DNS resolver wrapper with fail-open/fail-closed policy → REQ-SEC-003, REQ-SEC-006
- [x] **T-SEC-007**: Implement DNS IP pinning for HTTP connection (close TOCTOU gap) → GAP-SEC-003
- [x] **T-SEC-008**: Implement configurable `ALLOW_PRIVATE_IPS` bypass → REQ-SEC-007

## Phase 3: Fetch Hardening

- [x] **T-SEC-009**: Implement redirect counter with configurable limit → REQ-SEC-008
- [x] **T-SEC-010**: Implement streaming body size limiter with `Content-Length` pre-flight → REQ-SEC-009
- [x] **T-SEC-011**: Implement cumulative timeout via AbortSignal → REQ-SEC-010
- [x] **T-SEC-012**: Implement per-redirect SSRF validation hook → REQ-SEC-004

## Phase 4: Container Security

- [x] **T-SEC-013**: Configure Dockerfile for non-root execution → REQ-SEC-012
- [x] **T-SEC-014**: Configure production install (no dev deps, no install scripts) → REQ-SEC-013

## Phase 5: SSRF Metrics & DNS Enhancements

- [x] **T-SEC-023**: Implement `ssrf_checks_total` counter with `result` and `reason` labels → REQ-SEC-014
- [x] **T-SEC-024**: Implement `ssrf_dns_resolution_seconds` histogram → REQ-SEC-015
- [x] **T-SEC-025**: Implement multi-IP DNS validation (all resolved IPs checked against blocked ranges) → REQ-SEC-016
- [x] **T-SEC-026**: Implement configurable DNS resolution timeout (default: 5s) with fail-policy integration → REQ-SEC-017
- [x] **T-SEC-027**: Implement `SsrfValidationResult` interface returning pinned IP → REQ-SEC-018, REQ-SEC-019
- [x] **T-SEC-028**: Expose `pinnedIp` and `originalHost` in validation result for Fetcher consumption → REQ-SEC-019

## Phase 6: Tests

- [x] **T-SEC-015**: Property tests for IPv4 range checking (all private ranges blocked) → REQ-SEC-001
- [x] **T-SEC-016**: Unit tests for IPv6 blocking → REQ-SEC-002
- [x] **T-SEC-017**: Unit tests for IPv4-mapped IPv6 normalization → GAP-SEC-001
- [x] **T-SEC-018**: Scenario test: redirect chain with private IP mid-chain → REQ-SEC-004
- [x] **T-SEC-019**: Unit test for DNS fail-open and fail-closed policies → REQ-SEC-006
- [x] **T-SEC-020**: Unit test for ALLOW_PRIVATE_IPS bypass → REQ-SEC-007
- [x] **T-SEC-021**: Scenario test: body size limit with streaming response → REQ-SEC-009
- [x] **T-SEC-022**: Container test: verify non-root execution → REQ-SEC-012
- [x] **T-SEC-029**: Unit test for `ssrf_checks_total` counter labels → REQ-SEC-014
- [x] **T-SEC-030**: Unit test for DNS resolution histogram recording → REQ-SEC-015
- [x] **T-SEC-031**: Property test for multi-IP DNS validation (no false negatives) → REQ-SEC-016
- [x] **T-SEC-032**: Unit test for DNS timeout and fail-policy behavior → REQ-SEC-017
- [x] **T-SEC-033**: Integration test for pinned IP returned in validation result → REQ-SEC-018, REQ-SEC-019

---

## Dependencies

| Task | Depends On | Blocks |
| --- | --- | --- |
| Phase 1 (IP ranges) | — | Phase 2, http-fetching |
| Phase 2 (DNS + validation) | Phase 1 | Phase 3, http-fetching |
| Phase 3 (fetch hardening) | Phase 2 | http-fetching |
| Phase 4 (container) | — | infrastructure |
| Phase 5 (metrics/DNS) | Phase 2 | http-fetching (pinned IP) |
| Phase 6 (tests) | Phases 1-5 | — |

---

> **Provenance**: Created 2026-03-25. Security Agent task decomposition per ADR-020. Updated 2026-03-25: added Phase 5 (REQ-SEC-014–019 metrics, multi-IP DNS, DNS pinning). Updated 2026-03-26: checked completed tasks per G11 spec update gate.
