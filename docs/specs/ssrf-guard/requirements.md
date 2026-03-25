# SSRF Guard — Requirements

> EARS-format requirements for SSRF protection, fetch hardening, and container security.
> Source: [REQUIREMENTS-AGNOSTIC.md](../../research/REQUIREMENTS-AGNOSTIC.md) §4

---

## 1. SSRF Protection

**REQ-SEC-001** (Ubiquitous)
The system shall block outbound requests to private IPv4 ranges: `10.0.0.0/8`, `192.168.0.0/16`, `127.0.0.0/8`, `169.254.0.0/16`, `0.0.0.0/8`, `172.16.0.0/12`.

**REQ-SEC-002** (Ubiquitous)
The system shall block outbound requests to private IPv6 addresses: `::1`, `::`, `fc00::/7`, `fe80::/10`.

**REQ-SEC-003** (Ubiquitous)
The system shall perform DNS resolution and validate the resolved IP against blocked ranges before dispatching the HTTP request.

**REQ-SEC-004** (Event-driven)
When a redirect hop is followed, the system shall apply SSRF validation to every redirect destination — not only the initial URL.

**REQ-SEC-005** (Event-driven)
When a literal IP address is provided as the host, the system shall check it directly against blocked ranges without DNS resolution.

**REQ-SEC-006** (Unwanted behaviour)
If DNS resolution fails, then the system should allow the fetch to proceed (fail-open). This is a SHOULD-level requirement; a configurable DNS fail policy is recommended.

**REQ-SEC-007** (Optional feature)
Where `ALLOW_PRIVATE_IPS` is enabled, the system shall bypass SSRF blocking for testing environments.

### Acceptance Criteria — SSRF Protection

```gherkin
Given a URL resolving to 10.0.0.1
When the fetcher attempts to fetch it
Then the request is blocked with a "ssrf_blocked" error

Given a URL that redirects 302 → http://192.168.1.1/admin
When the redirect is followed
Then the redirect hop is blocked with "ssrf_blocked"

Given ALLOW_PRIVATE_IPS=true
When a private IP URL is fetched
Then the request proceeds without blocking
```

## 2. Fetch Hardening

**REQ-SEC-008** (Ubiquitous)
The system shall enforce a configurable redirect limit (default: 5). Exceeding it shall produce a `too_many_redirects` error.

**REQ-SEC-009** (Ubiquitous)
The system shall enforce a configurable response body size limit (default: 10 MiB) via streaming byte counting.

**REQ-SEC-010** (Ubiquitous)
The system shall enforce a configurable fetch timeout, cumulative across the entire redirect chain.

**REQ-SEC-011** (Ubiquitous)
Only `http:` and `https:` URI schemes shall be permitted for fetching.

### Acceptance Criteria — Fetch Hardening

```gherkin
Given a redirect chain of 6 hops and max_redirects=5
When the fetcher follows the chain
Then it returns a "too_many_redirects" error after the 5th hop

Given a response body of 15 MiB and max_response_bytes=10485760
When the body is streamed
Then the stream is destroyed at 10 MiB
And a "body_too_large" error is returned
```

## 3. Container Security

**REQ-SEC-012** (Ubiquitous)
The production container image shall run as a non-root user.

**REQ-SEC-013** (Ubiquitous)
The production install shall exclude dev dependencies and disable install scripts.

## 4. Known Security Gaps

| Gap ID | Description | Risk | Recommended Fix |
| --- | --- | --- | --- |
| GAP-SEC-001 | IPv4-mapped IPv6 (`::ffff:127.0.0.1`) not blocked | High | Normalize IPv4-mapped IPv6 to IPv4 before validation |
| GAP-SEC-002 | Missing CGNAT `100.64.0.0/10`, multicast `224.0.0.0/4`, broadcast `255.255.255.255/32` | Medium | Extend per RFC 6890 |
| GAP-SEC-003 | DNS rebinding TOCTOU between validation and HTTP connect | High | Pin resolved IP for HTTP connection |
| GAP-SEC-004 | DNS fail-open allows bypass when DNS is unreachable | Medium | Configurable DNS fail policy |
| GAP-SEC-005 | Metrics server leaks internal error details | Low | Generic error body; log details server-side |

---

## Traceability Matrix

| Requirement | Source | Priority | Test Type |
| --- | --- | --- | --- |
| REQ-SEC-001 | §4.1 | MUST | Unit + Property |
| REQ-SEC-002 | §4.1 | MUST | Unit |
| REQ-SEC-003 | §4.1 | MUST | Unit |
| REQ-SEC-004 | §4.1 | MUST | Scenario |
| REQ-SEC-005 | §4.1 | MUST | Unit |
| REQ-SEC-006 | §4.1 | SHOULD | Unit |
| REQ-SEC-007 | §4.1 | MUST | Unit |
| REQ-SEC-008 | §4.2 | MUST | Scenario |
| REQ-SEC-009 | §4.2 | MUST | Scenario |
| REQ-SEC-010 | §4.2 | MUST | Unit |
| REQ-SEC-011 | §4.2 | MUST | Unit |
| REQ-SEC-012 | §4.3 | MUST | Container test |
| REQ-SEC-013 | §4.3 | MUST | Container test |

---

> **Provenance**: Created 2026-03-25 from REQUIREMENTS-AGNOSTIC.md §4. EARS conversion per ADR-020.
