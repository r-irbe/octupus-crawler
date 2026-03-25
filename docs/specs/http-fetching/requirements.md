# HTTP Fetching — Requirements

> EARS-format requirements for HTTP client, redirect handling, politeness, response processing, and error classification.
> Source: [REQUIREMENTS-AGNOSTIC.md](../../research/REQUIREMENTS-AGNOSTIC.md) §5

---

## 1. HTTP Client

**REQ-FETCH-001** (Ubiquitous)
The system shall use a performant, non-blocking HTTP client for fetching.

**REQ-FETCH-002** (Ubiquitous)
Every HTTP request shall include a configurable `User-Agent` header.

**REQ-FETCH-003** (Ubiquitous)
The HTTP client shall be injectable/replaceable for deterministic testing.

### Acceptance Criteria — HTTP Client

```gherkin
Given a configured User-Agent string "IPF-Crawler/1.0"
When an HTTP request is made
Then the User-Agent header is "IPF-Crawler/1.0"

Given a test environment
When the fetcher is instantiated
Then a mock HTTP client can be injected via the Fetcher contract
```

## 2. Redirect Handling

**REQ-FETCH-004** (Ubiquitous)
The fetcher shall follow redirects (301, 302, 303, 307, 308) up to a configurable maximum limit.

**REQ-FETCH-005** (Event-driven)
When a `Location` header contains a relative URL, the system shall resolve it against the current request URL.

**REQ-FETCH-006** (Unwanted behaviour)
If a 3xx response lacks a `Location` header, then the system shall treat it as an HTTP error.

**REQ-FETCH-007** (Event-driven)
When a redirect hop is followed, the system shall invoke SSRF validation on the redirect destination.

**REQ-FETCH-008** (Event-driven)
When the final URL differs from the original request URL, the system shall record the final URL in the `FetchResult`.

### Acceptance Criteria — Redirects

```gherkin
Given a 301 redirect from /a to /b to /c
When the fetcher follows the chain
Then the FetchResult.finalUrl is /c
And the FetchResult.requestedUrl is /a

Given a 302 response without a Location header
When the fetcher processes it
Then an "http" error is returned
```

## 3. Politeness

**REQ-FETCH-009** (Ubiquitous)
Requests to the same domain shall be serialized with a configurable minimum delay between consecutive requests.

**REQ-FETCH-010** (Event-driven)
When the first request to a domain is made, the system shall proceed immediately with no delay.

**REQ-FETCH-011** (Unwanted behaviour)
If a fetch fails, then the domain's serialization chain shall not be broken.

**REQ-FETCH-012** (Ubiquitous)
Stale domain entries shall be pruned automatically to prevent unbounded memory growth.

**REQ-FETCH-013** (Ubiquitous)
The domain tracking structure shall enforce a hard cap (e.g., 10,000 entries) with eviction of least-recently-used domains.

### Acceptance Criteria — Politeness

```gherkin
Given two requests to example.com with POLITENESS_DELAY_MS=1000
When the second request is issued
Then it waits at least 1000ms after the first request completes

Given 10,001 unique domains have been tracked and the cap is 10,000
When the next domain is added
Then the least-recently-used domain is evicted
```

## 4. Response Processing

**REQ-FETCH-014** (Ubiquitous)
Response bodies shall be consumed via streaming with byte counting. Exceeding the size limit shall destroy the stream and return `body_too_large`.

**REQ-FETCH-015** (Event-driven)
When `Content-Length` exceeds the configured maximum, the system shall fast-path reject the response before streaming the body.

**REQ-FETCH-016** (Ubiquitous)
Response bodies shall be decoded as UTF-8 text.

**REQ-FETCH-017** (Event-driven)
When a response is a redirect or non-2xx status, the system shall drain/discard the response body to free underlying connections.

### Acceptance Criteria — Response Processing

```gherkin
Given a response with Content-Length: 20000000 and max 10485760
When the response headers are received
Then the request is aborted immediately with "body_too_large"
And no body bytes are streamed

Given a 301 redirect response with a body
When the redirect is followed
Then the redirect body is discarded
```

## 5. Error Classification

**REQ-FETCH-018** (Ubiquitous)
All fetch failures shall be classified into the 9 `FetchError` variants: `timeout`, `network`, `http`, `ssrf_blocked`, `too_many_redirects`, `body_too_large`, `dns_resolution_failed`, `ssl_error`, `connection_refused`.

**REQ-FETCH-019** (Ubiquitous)
Wall-clock duration shall be tracked for every fetch (success and failure).

---

## Traceability Matrix

| Requirement | Source | Priority | Test Type |
| --- | --- | --- | --- |
| REQ-FETCH-001 | §5.1 | MUST | Integration |
| REQ-FETCH-002 | §5.1 | MUST | Unit |
| REQ-FETCH-003 | §5.1 | MUST | Unit |
| REQ-FETCH-004 | §5.2 | MUST | Scenario |
| REQ-FETCH-005 | §5.2 | MUST | Unit |
| REQ-FETCH-006 | §5.2 | MUST | Scenario |
| REQ-FETCH-007 | §5.2 | MUST | Scenario |
| REQ-FETCH-008 | §5.2 | MUST | Scenario |
| REQ-FETCH-009 | §5.3 | MUST | Unit |
| REQ-FETCH-010 | §5.3 | MUST | Unit |
| REQ-FETCH-011 | §5.3 | MUST | Unit |
| REQ-FETCH-012 | §5.3 | MUST | Unit |
| REQ-FETCH-013 | §5.3 | MUST | Unit |
| REQ-FETCH-014 | §5.4 | MUST | Scenario |
| REQ-FETCH-015 | §5.4 | MUST | Scenario |
| REQ-FETCH-016 | §5.4 | MUST | Unit |
| REQ-FETCH-017 | §5.4 | MUST | Scenario |
| REQ-FETCH-018 | §5.5 | MUST | Unit |
| REQ-FETCH-019 | §5.5 | MUST | Unit |

---

> **Provenance**: Created 2026-03-25 from REQUIREMENTS-AGNOSTIC.md §5. EARS conversion per ADR-020.
