# ADR-008: HTTP & Parsing Stack — undici + cheerio + Playwright

| Field | Value |
| --- | --- |
| **Status** | Accepted |
| **Created** | 2026-03-24 |
| **Last Updated** | 2026-03-24 |
| **Author(s)** | Architecture Council |
| **Reviewers** | Architect, Skeptic, SRE, Distributed Systems Specialist, Research Engineer Advisor |
| **Supersedes** | N/A |
| **Superseded By** | N/A |

## Context

The crawler must fetch web pages at high throughput and parse HTML to extract content and links. Pages may be static HTML or JavaScript-rendered SPAs. The HTTP client must support connection pooling, HTTP/2, timeouts, and be observable. The parser must handle malformed HTML gracefully.

## Decision Drivers

- HTTP throughput and connection pooling
- HTTP/2 support
- Memory efficiency at high concurrency
- Robust HTML parsing of malformed markup
- JavaScript rendering capability for SPAs
- OpenTelemetry auto-instrumentation
- Resource footprint per worker pod

## Considered Options

### Option A: undici (native) + cheerio + Playwright

**Pros:**

- undici: fastest Node.js HTTP client, native in Node 22+, connection pooling, HTTP/2
- cheerio: parse static HTML at ~100MB/s, jQuery-like API, low memory
- Playwright: headless Chromium for JS-rendered pages, full browser API
- undici auto-instrumented by OpenTelemetry
- cheerio is synchronous and stateless — easy to parallelize
- Playwright can be used selectively (only for pages that need JS rendering)

**Cons:**

- Playwright requires Chromium binary (~400MB per worker image)
- Two parsing paths (static vs rendered) add complexity

### Option B: axios + jsdom

**Pros:**

- axios: familiar API
- jsdom: full DOM API in Node.js

**Cons:**

- axios: slower than undici, no connection pooling by default
- jsdom: 10-50x slower than cheerio for parsing, higher memory
- jsdom is overkill for link/content extraction

### Option C: puppeteer for everything

**Pros:**

- Single tool for fetch + render + parse
- Full browser API

**Cons:**

- Massive resource overhead (headless Chrome per page)
- Cannot scale to high throughput without enormous compute
- Overkill for static pages (95%+ of web)

## Decision

Adopt a **tiered fetching strategy**:

1. **Default path**: undici fetch → cheerio parse (fast, lightweight)
2. **JS-render path**: Playwright pool → rendered HTML → cheerio parse (only when needed)

### Implementation

```typescript
// packages/worker/src/fetcher.ts
import { request } from 'undici';

export async function fetchPage(url: string, options: FetchOptions) {
  const response = await request(url, {
    maxRedirections: 5,
    headersTimeout: 10_000,
    bodyTimeout: 30_000,
    headers: {
      'User-Agent': options.userAgent,
      'Accept': 'text/html',
    },
  });

  if (response.statusCode >= 400) {
    throw new FetchError(url, response.statusCode);
  }

  return {
    html: await response.body.text(),
    statusCode: response.statusCode,
    headers: response.headers,
    contentType: response.headers['content-type'],
  };
}
```

```typescript
// packages/worker/src/parser.ts
import * as cheerio from 'cheerio';

export function parsePage(html: string, baseUrl: string): ParseResult {
  const $ = cheerio.load(html);

  return {
    title: $('title').text(),
    links: $('a[href]')
      .map((_, el) => new URL($(el).attr('href')!, baseUrl).href)
      .get()
      .filter(isValidUrl),
    text: $('body').text().trim(),
    meta: {
      description: $('meta[name="description"]').attr('content') ?? '',
      robots: $('meta[name="robots"]').attr('content') ?? '',
    },
  };
}
```

### JS Rendering Pool

```typescript
// packages/worker/src/renderer.ts
import { chromium, Browser } from 'playwright';

let browserPool: Browser;

export async function initRenderer(poolSize: number) {
  browserPool = await chromium.launch({ headless: true });
}

export async function renderPage(url: string): Promise<string> {
  const context = await browserPool.newContext();
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
    return await page.content();
  } finally {
    await context.close();
  }
}
```

### Decision Logic

```typescript
export async function crawlPage(job: CrawlJob): Promise<CrawlResult> {
  let html: string;

  if (job.requiresJs) {
    html = await renderPage(job.url);
  } else {
    const response = await fetchPage(job.url, fetchOptions);
    html = response.html;
  }

  return parsePage(html, job.url);
}
```

## Consequences

### Positive

- Static pages fetched at maximum throughput with minimal resources
- Connection pooling via undici reduces TCP overhead
- cheerio's speed enables parsing thousands of pages per second per pod
- Playwright available as fallback for JS-heavy sites
- OpenTelemetry traces cover the full fetch→parse pipeline

### Negative

- Worker images with Playwright are larger (~400MB Chromium)
- Two code paths for static vs JS-rendered (mitigated: shared parser)
- Playwright browser pool consumes significant memory

### Risks

- Playwright browser memory leaks on long-running workers (mitigated: context-per-page with cleanup)
- undici breaking changes in Node.js updates (mitigated: native API, well-maintained)

## Validation

- Static page fetch+parse: < 100ms p95 per page
- JS-rendered page: < 5s p95 per page
- Worker pod memory: < 512MB for static-only, < 2GB with Playwright
- Link extraction accuracy: > 99% on test corpus

## Related

- [ADR-009: Resilience Patterns](ADR-009-resilience-patterns.md) — Circuit breakers per domain
- [ADR-006: Observability Stack](ADR-006-observability-stack.md) — undici auto-instrumented
- [ADR-002: Job Queue System](ADR-002-job-queue-system.md) — Jobs specify `requiresJs` flag

---

> **Provenance**: Created 2026-03-24 during initial architecture design phase. Based on benchmarking of Node.js HTTP clients and HTML parsers for high-throughput web crawling.
