# K8s E2E Testing — Extended Requirements

> Extended EARS requirements for production behavior E2E testing.
> Continues from [requirements.md](requirements.md) (REQ-K8E-001–025).
> Source: [ADR-006](../../adr/ADR-006-observability-stack.md), [ADR-008](../../adr/ADR-008-http-parsing-stack.md), [ADR-009](../../adr/ADR-009-resilience-patterns.md)

---

## Section 6: Redirect & HTTP Behavior (REQ-K8E-026–028)

**REQ-K8E-026** (Event-driven)
When the crawler encounters an HTTP 3xx redirect chain, the system shall follow redirects up to a configurable maximum (default: 10) and stop with a MaxRedirectsExceeded error beyond that limit.

**REQ-K8E-027** (Event-driven)
When the crawler follows a redirect, the system shall validate each hop's resolved IP against SSRF rules before making the request.

**REQ-K8E-028** (Event-driven)
When a redirect Location header contains a relative URL, the system shall resolve it against the current request URL per RFC 3986.

### Acceptance Criteria — Redirect & HTTP

```gherkin
Given a simulator serving /redirect?hops=15
When the crawler fetches the URL
Then the crawler stops after the max-redirect limit
And the crawl metrics record a redirect_limit_exceeded error

Given a redirect chain where hop 3 resolves to 127.0.0.1
When the crawler follows the chain
Then the request to the reserved IP is blocked by SSRF guard
```

## Section 7: Timeout & Circuit Breaker (REQ-K8E-029–031)

**REQ-K8E-029** (Event-driven)
When a fetch request exceeds the configured timeout (default: 30s), the system shall abort the request and record a timeout error metric.

**REQ-K8E-030** (Event-driven)
When 5 consecutive fetches to a domain fail, the circuit breaker shall open and subsequent requests to that domain shall fail fast without network I/O for the configured half-open delay.

**REQ-K8E-031** (State-driven)
While the circuit breaker is open for a domain, the system shall record circuit_breaker_open metrics and, after the half-open delay, shall allow one probe request to determine recovery.

### Acceptance Criteria — Timeout & Circuit Breaker

```gherkin
Given a simulator page at /slow?ms=60000 (exceeds 30s timeout)
When the crawler fetches the URL
Then the request is aborted within timeout + grace
And crawl_timeout_total metric increments

Given a domain returning 5 consecutive 503 errors
When the circuit breaker evaluates the domain
Then circuit_breaker_open_total increments for that domain
And subsequent requests fail fast until half-open delay elapses
```

## Section 8: Error Handling & Retry (REQ-K8E-032–034)

**REQ-K8E-032** (Event-driven)
When the crawler receives an HTTP 4xx response, the system shall classify it as a client error and NOT retry the request.

**REQ-K8E-033** (Event-driven)
When the crawler receives an HTTP 5xx response, the system shall retry with exponential backoff up to the configured maximum attempts.

**REQ-K8E-034** (Event-driven)
When a crawler receives an HTTP 429 Too Many Requests with a Retry-After header, the system shall respect the delay before retrying.

### Acceptance Criteria — Error Handling

```gherkin
Given a simulator page at /error?code=404
When the crawler fetches the URL
Then the page is marked as failed (not retried)
And crawl_error_total{status="404"} increments

Given a simulator page at /error?code=503
When the crawler fetches and receives 503 three times
Then crawl_retry_total increments for each retry attempt
```

## Section 9: Link Discovery & Depth Limiting (REQ-K8E-035–037)

**REQ-K8E-035** (Event-driven)
When the crawler processes a page containing a link trap (/trap?depth=N), the system shall respect the configured max-depth limit and stop discovering deeper links.

**REQ-K8E-036** (Ubiquitous)
The crawler shall never revisit a URL it has already fetched, using SHA-256 hash-based deduplication of canonical URLs.

**REQ-K8E-037** (Event-driven)
When the crawler encounters links with fragments (#), query parameters, or mixed case, the system shall normalize URLs to canonical form before dedup checking.

### Acceptance Criteria — Link Discovery

```gherkin
Given a trap page generating infinite /trap?depth=N links
When max-depth is configured to 3
Then the crawler stops at depth 3
And total pages crawled equals exactly the depth limit + 1

Given URLs /Page, /page, /page#section, /page?utm_source=x
When the crawler normalizes and deduplicates
Then only one canonical URL is fetched
```

## Section 10: Robots.txt Compliance (REQ-K8E-038–039)

**REQ-K8E-038** (Event-driven)
When a domain serves a robots.txt with Disallow rules for the crawler's user-agent, the system shall skip disallowed paths.

**REQ-K8E-039** (Event-driven)
When a domain's robots.txt specifies a Crawl-delay, the system shall wait at least that many seconds between consecutive requests to the domain.

### Acceptance Criteria — Robots.txt

```gherkin
Given robots.txt with "Disallow: /admin" for user-agent "*"
When the crawler discovers links to /admin/settings
Then no fetch request is made to /admin/settings

Given robots.txt with "Crawl-delay: 2"
When the crawler fetches two pages from the domain
Then at least 2 seconds elapse between requests
```

## Section 11: Observability Validation (REQ-K8E-040–042)

**REQ-K8E-040** (Ubiquitous)
Prometheus metrics shall accurately reflect the number of pages crawled, errors encountered, and bytes transferred — values must match within 5% of actual activity.

**REQ-K8E-041** (Event-driven)
When the crawler processes a page, structured logs shall include the trace ID that can be correlated with the span in the tracing backend.

**REQ-K8E-042** (Ubiquitous)
The /metrics endpoint shall expose all counters and histograms required by the Grafana dashboard: crawl_pages_total, crawl_error_total, crawl_duration_seconds, crawl_bytes_total.

### Acceptance Criteria — Observability

```gherkin
Given a crawl of the 7-page default simulator site
When crawl completes
Then crawl_pages_total = 7
And crawl_bytes_total > 0
And crawl_duration_seconds histogram has 7 observations

Given a crawl in progress
When checking structured log output
Then each log entry contains a "traceId" field
And the traceId is a valid 32-hex-character string
```

---

> **Provenance**: Created 2025-07-21 per ADR-020. 17 extended requirements (REQ-K8E-026–042) for production behavior E2E coverage.
