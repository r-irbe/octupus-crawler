# Crawl Pipeline — Requirements

> EARS-format requirements for URL processing, pipeline composition, link extraction, and frontier entries.
> Source: [REQUIREMENTS-AGNOSTIC.md](../../research/REQUIREMENTS-AGNOSTIC.md) §3

---

## 1. URL Processing

**REQ-CRAWL-001** (Ubiquitous)
The system shall permit only `http:` and `https:` URI schemes. When a URL bears a different scheme, the system shall reject it with a `disallowed_scheme` typed error.

**REQ-CRAWL-002** (Ubiquitous)
The system shall normalize every accepted URL: strip hash fragments, preserve `www.` prefix, remove trailing slashes, remove bare `/` path, and lexicographically sort query parameters by key. The normalized form shall be deterministic.

**REQ-CRAWL-003** (Ubiquitous)
Each successfully processed URL shall produce a `CrawlUrl` structure containing: `raw` (original string), `normalized` (branded/newtype form preventing accidental interchange), and `domain` (lowercased hostname).

**REQ-CRAWL-004** (Event-driven)
When an empty or syntactically invalid URL is processed, the system shall return a typed error (`empty_url` or `invalid_url`) through the Result channel — not throw an exception.

### Acceptance Criteria — URL Processing

```gherkin
Given a URL "https://example.com/path?b=2&a=1#section"
When it is normalized
Then the result is "https://example.com/path?a=1&b=2"
And the domain is "example.com"

Given an empty string
When it is processed as a URL
Then a Result.err with kind "empty_url" is returned

Given "ftp://example.com"
When it is processed
Then a Result.err with kind "disallowed_scheme" is returned
```

## 2. Pipeline Composition

**REQ-CRAWL-005** (Ubiquitous)
The crawl pipeline shall be composed as a linear chain: `validate → fetch → discover links → enqueue`. Each stage receives the success output of the previous stage. Any stage failure short-circuits the remainder.

**REQ-CRAWL-006** (Ubiquitous)
Each pipeline stage shall accept its external dependencies via constructor or function parameters. No stage shall directly instantiate or import concrete infrastructure.

**REQ-CRAWL-007** (Event-driven)
When an entry's `depth` exceeds the configured maximum, the validate stage shall reject it with `depth_exceeded` before any HTTP request is issued.

**REQ-CRAWL-008** (State-driven)
While an allow-list is configured, the validate stage shall reject any entry whose domain is not in the list with `domain_not_allowed` before any HTTP request is issued.

**REQ-CRAWL-009** (Event-driven)
When a fetch response has a content type other than `text/html`, the discover stage shall yield an empty set of discovered URLs.

**REQ-CRAWL-010** (Ubiquitous)
Relative `href` values shall be resolved against the final URL of the fetch (after all redirects), not the original request URL.

**REQ-CRAWL-011** (Ubiquitous)
Discovered URLs from a single page shall be deduplicated by their normalized form before enqueue.

**REQ-CRAWL-012** (Unwanted behaviour)
If an `href` fails URL parsing or scheme validation, then the pipeline shall silently skip it. The pipeline shall not crash due to a malformed href.

### Acceptance Criteria — Pipeline Composition

```gherkin
Given a FrontierEntry with depth 5 and maxDepth config of 3
When the pipeline processes it
Then it is rejected with kind "depth_exceeded"
And no HTTP request is made

Given a successful fetch returning text/html with 10 links (3 duplicates)
When link discovery runs
Then 7 unique normalized URLs are produced

Given a fetch returning application/json
When link discovery runs
Then zero URLs are discovered
```

## 3. Frontier Entry Metadata

**REQ-CRAWL-013** (Ubiquitous)
Each `FrontierEntry` shall carry: `url` (CrawlUrl), `depth` (non-negative integer), `discoveredBy` (worker ID), `discoveredAt` (epoch ms), and `parentUrl` (normalized URL or null).

**REQ-CRAWL-014** (Ubiquitous)
Discovered URLs shall be assigned `depth = parent.depth + 1`. Seed URLs have `depth = 0`.

**REQ-CRAWL-015** (Unwanted behaviour)
If an enqueue operation fails, then the pipeline shall produce a `CrawlError` with kind `queue_error`.

## 4. Fetch Result

**REQ-CRAWL-016** (Ubiquitous)
Each fetch shall produce a `FetchResult` containing: `requestedUrl`, `finalUrl` (after redirects, null if none), `statusCode`, `contentType`, `body`, `fetchTimestamp`, and `fetchDurationMs`.

### Acceptance Criteria — Metadata & Results

```gherkin
Given a page at depth 2 containing a link to /child
When the link is enqueued
Then the child entry has depth 3
And discoveredBy matches the current worker ID
And parentUrl is the normalized URL of the parent page

Given a fetch to a URL that redirects 301 → final URL
When the FetchResult is produced
Then requestedUrl is the original URL
And finalUrl is the redirect destination
And fetchDurationMs is greater than 0
```

---

## Traceability Matrix

| Requirement | Source | Priority | Test Type |
| --- | --- | --- | --- |
| REQ-CRAWL-001 | §3.1 | MUST | Unit + Property |
| REQ-CRAWL-002 | §3.1 | MUST | Unit + Property |
| REQ-CRAWL-003 | §3.1 | MUST | Unit |
| REQ-CRAWL-004 | §3.1 | MUST | Unit |
| REQ-CRAWL-005 | §3.2 | MUST | Unit + Integration |
| REQ-CRAWL-006 | §3.2 | MUST | Unit |
| REQ-CRAWL-007 | §3.2 | MUST | Unit |
| REQ-CRAWL-008 | §3.2 | MUST | Unit |
| REQ-CRAWL-009 | §3.2 | MUST | Unit |
| REQ-CRAWL-010 | §3.2 | MUST | Scenario |
| REQ-CRAWL-011 | §3.2 | MUST | Unit |
| REQ-CRAWL-012 | §3.2 | MUST | Unit |
| REQ-CRAWL-013 | §3.3 | MUST | Unit |
| REQ-CRAWL-014 | §3.3 | MUST | Unit |
| REQ-CRAWL-015 | §3.3 | MUST | Unit |
| REQ-CRAWL-016 | §3.4 | MUST | Unit |

---

> **Provenance**: Created 2026-03-25 from REQUIREMENTS-AGNOSTIC.md §3. EARS conversion per ADR-020.
