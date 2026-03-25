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

## 4. SSRF Metrics

**REQ-SEC-014** (Ubiquitous)
The SSRF guard shall record a `ssrf_checks_total` counter with labels: `result` (`allowed`, `blocked`, `dns_failed`) and `reason` (e.g., `private_ipv4`, `private_ipv6`, `ipv4_mapped`, `dns_rebinding`, `scheme_disallowed`).

**REQ-SEC-015** (Ubiquitous)
The SSRF guard shall record a `ssrf_dns_resolution_seconds` histogram for DNS resolution latency.

**REQ-SEC-016** (Ubiquitous)
When a DNS query returns multiple IP addresses, the SSRF guard shall validate every resolved IP against blocked ranges — not just the first address. If any resolved IP is in a blocked range, the request shall be blocked.

**REQ-SEC-017** (Ubiquitous)
DNS resolution shall have a configurable timeout (default: 5s). Timeout behavior shall follow the configured DNS fail policy (REQ-SEC-006).

### Acceptance Criteria — SSRF Metrics

```gherkin
Given a URL resolving to a private IP
When the SSRF guard blocks it
Then ssrf_checks_total{result="blocked",reason="private_ipv4"} is incremented

Given a DNS query returning [1.2.3.4, 10.0.0.1]
When the SSRF guard validates all IPs
Then the request is blocked because 10.0.0.1 is private

Given a DNS resolution completing in 200ms
When the histogram is checked
Then ssrf_dns_resolution_seconds records 0.2

Given DNS_TIMEOUT_MS=5000 and a DNS query taking 6 seconds
When the timeout fires
Then the request follows the configured DNS fail policy (block or allow)
```

## 5. DNS Pinning Coordination Protocol

**REQ-SEC-018** (Ubiquitous)
The SSRF guard shall return the validated and pinned IP address alongside the validation result. The callingFetcher shall use this pinned IP for the HTTP connection (setting the `Host` header to the original domain). This eliminates the TOCTOU window between DNS validation and HTTP connect.

**REQ-SEC-019** (Ubiquitous)
The coordination interface between SSRF guard and Fetcher shall be:

```typescript
interface SsrfValidationResult {
  readonly allowed: boolean
  readonly pinnedIp: string | null   // Resolved IP to use for connection
  readonly originalHost: string       // Original domain for Host header
  readonly reason?: string            // Block reason if not allowed
}
```

### Acceptance Criteria — DNS Pinning

```gherkin
Given a URL "https://example.com/page"
When the SSRF guard validates and resolves DNS to 93.184.216.34
Then the result includes pinnedIp: "93.184.216.34"
And the Fetcher connects to 93.184.216.34 with Host: example.com
And no second DNS query is issued
```

## 6. Known Security Gaps (Resolved)

| Gap ID | Description | Status | Resolution |
| --- | --- | --- | --- |
| GAP-SEC-001 | IPv4-mapped IPv6 (`::ffff:127.0.0.1`) not blocked | **RESOLVED** | REQ-SEC-002 + design §3 normalization |
| GAP-SEC-002 | Missing CGNAT, multicast, broadcast | **RESOLVED** | Extended blocked ranges in design §2 |
| GAP-SEC-003 | DNS rebinding TOCTOU | **RESOLVED** | REQ-SEC-018–019 DNS pinning protocol |
| GAP-SEC-004 | DNS fail-open bypass | **RESOLVED** | REQ-SEC-006 + REQ-SEC-017 configurable policy |
| GAP-SEC-005 | Metrics server leaks details | **RESOLVED** | REQ-OBS-022 generic error body |

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
| REQ-SEC-014 | §4 (metrics) | MUST | Unit |
| REQ-SEC-015 | §4 (metrics) | MUST | Unit |
| REQ-SEC-016 | §4 (multi-IP) | MUST | Unit + Property |
| REQ-SEC-017 | §4 (DNS) | MUST | Unit |
| REQ-SEC-018 | §4 (TOCTOU) | MUST | Integration |
| REQ-SEC-019 | §4 (TOCTOU) | MUST | Unit |

---

> **Provenance**: Created 2026-03-25 from REQUIREMENTS-AGNOSTIC.md §4. EARS conversion per ADR-020. Updated 2026-03-25: added §4–5 (SSRF metrics, DNS pinning coordination) per PR Review Council findings F-SG-015/F-SG-022.
