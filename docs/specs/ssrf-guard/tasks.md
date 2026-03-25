# SSRF Guard — Tasks

> Implementation tasks traceable to [requirements.md](requirements.md). Dependency-ordered.
> Design: [design.md](design.md)

---

## Phase 1: IP Range Checking

- [ ] **T-SEC-001**: Implement IPv4 CIDR range checker for all blocked ranges → REQ-SEC-001
- [ ] **T-SEC-002**: Implement IPv6 blocked address checker → REQ-SEC-002
- [ ] **T-SEC-003**: Implement IPv4-mapped IPv6 normalization (`::ffff:x.x.x.x` → IPv4) → GAP-SEC-001
- [ ] **T-SEC-004**: Extend blocked ranges with CGNAT, multicast, broadcast → GAP-SEC-002
- [ ] **T-SEC-005**: Implement literal IP detection (skip DNS for raw IPs) → REQ-SEC-005

## Phase 2: DNS Resolution & Validation

- [ ] **T-SEC-006**: Implement DNS resolver wrapper with fail-open/fail-closed policy → REQ-SEC-003, REQ-SEC-006
- [ ] **T-SEC-007**: Implement DNS IP pinning for HTTP connection (close TOCTOU gap) → GAP-SEC-003
- [ ] **T-SEC-008**: Implement configurable `ALLOW_PRIVATE_IPS` bypass → REQ-SEC-007

## Phase 3: Fetch Hardening

- [ ] **T-SEC-009**: Implement redirect counter with configurable limit → REQ-SEC-008
- [ ] **T-SEC-010**: Implement streaming body size limiter with `Content-Length` pre-flight → REQ-SEC-009
- [ ] **T-SEC-011**: Implement cumulative timeout via AbortSignal → REQ-SEC-010
- [ ] **T-SEC-012**: Implement per-redirect SSRF validation hook → REQ-SEC-004

## Phase 4: Container Security

- [ ] **T-SEC-013**: Configure Dockerfile for non-root execution → REQ-SEC-012
- [ ] **T-SEC-014**: Configure production install (no dev deps, no install scripts) → REQ-SEC-013

## Phase 5: Tests

- [ ] **T-SEC-015**: Property tests for IPv4 range checking (all private ranges blocked) → REQ-SEC-001
- [ ] **T-SEC-016**: Unit tests for IPv6 blocking → REQ-SEC-002
- [ ] **T-SEC-017**: Unit tests for IPv4-mapped IPv6 normalization → GAP-SEC-001
- [ ] **T-SEC-018**: Scenario test: redirect chain with private IP mid-chain → REQ-SEC-004
- [ ] **T-SEC-019**: Unit test for DNS fail-open and fail-closed policies → REQ-SEC-006
- [ ] **T-SEC-020**: Unit test for ALLOW_PRIVATE_IPS bypass → REQ-SEC-007
- [ ] **T-SEC-021**: Scenario test: body size limit with streaming response → REQ-SEC-009
- [ ] **T-SEC-022**: Container test: verify non-root execution → REQ-SEC-012

---

## Dependencies

| Task | Depends On | Blocks |
| --- | --- | --- |
| Phase 1 (IP ranges) | — | Phase 2, http-fetching |
| Phase 2 (DNS + validation) | Phase 1 | Phase 3, http-fetching |
| Phase 3 (fetch hardening) | Phase 2 | http-fetching |
| Phase 4 (container) | — | infrastructure |
| Phase 5 (tests) | Phases 1-3 | — |

---

> **Provenance**: Created 2026-03-25. Security Agent task decomposition per ADR-020.
