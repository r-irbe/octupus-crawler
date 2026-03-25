# HTTP Fetching — Design

> Architecture for HTTP client, redirect handling, politeness enforcement, and response processing.
> Implements: [requirements.md](requirements.md) | ADRs: [ADR-008](../../adr/ADR-008-http-parsing-stack.md), [ADR-009](../../adr/ADR-009-resilience-patterns.md)

---

## 1. Fetcher Architecture

```mermaid
graph TD
    subgraph Fetcher["Fetcher Adapter"]
        PC[Politeness Controller]
        RC[Redirect Controller]
        SSRF[SSRF Guard]
        HC[HTTP Client]
        SP[Stream Processor]
    end

    REQ[FrontierEntry] --> PC
    PC -->|delay enforced| SSRF
    SSRF -->|validated| HC
    HC -->|response| RC
    RC -->|redirect| SSRF
    RC -->|final response| SP
    SP -->|body| RES[FetchResult]
```

## 2. Politeness Controller

```typescript
interface PolitenessController {
  /** Waits for the per-domain delay, then allows execution */
  acquire(domain: string): Promise<void>
  /** Releases the domain slot (success or failure) */
  release(domain: string): void
}
```

Internal state:

- `Map<string, number>` — domain → last-request-timestamp
- LRU eviction when map size exceeds `MAX_DOMAINS` (default: 10,000)
- First request to a domain proceeds immediately (REQ-FETCH-010)
- Failed fetches call `release()` to preserve the chain (REQ-FETCH-011)
- Background pruning of stale entries older than `STALE_THRESHOLD` (REQ-FETCH-012)

## 3. Redirect Controller

```mermaid
sequenceDiagram
    participant F as Fetcher
    participant SSRF as SSRF Guard
    participant H as HTTP Client

    F->>H: GET url (manual redirect: off)
    H-->>F: 302, Location: /new
    F->>F: Increment redirect counter
    alt Counter > max_redirects
        F-->>F: Return too_many_redirects
    end
    F->>F: Resolve relative Location
    F->>SSRF: validate(/new)
    alt SSRF blocked
        F-->>F: Return ssrf_blocked
    end
    F->>H: GET /new
    H-->>F: 200 OK
    F-->>F: Set finalUrl = /new
```

Key decisions:

- Disable automatic redirects in the HTTP client; handle manually for SSRF + counting
- Cumulative timeout via `AbortSignal.timeout()` wrapping the entire chain
- Relative `Location` resolved against current URL at each hop (REQ-FETCH-005)
- 3xx without `Location` → HTTP error (REQ-FETCH-006)

## 4. Stream Processor

```mermaid
graph LR
    RESP[HTTP Response] --> CL{Content-Length?}
    CL -->|> max| ABORT[Fast reject: body_too_large]
    CL -->|<= max or absent| STREAM[Streaming read]
    STREAM --> COUNT[Byte counter]
    COUNT -->|> max| DESTROY[Destroy stream: body_too_large]
    COUNT -->|complete| DECODE[UTF-8 decode]
    DECODE --> RESULT[Body string]
```

- Pre-flight `Content-Length` check (REQ-FETCH-015)
- Streaming byte counter with stream destruction (REQ-FETCH-014)
- UTF-8 decoding (REQ-FETCH-016)
- Non-2xx/redirect bodies discarded to free connections (REQ-FETCH-017)

## 5. Error Classification Map

| Error Condition | FetchError Kind | Detection |
| --- | --- | --- |
| AbortSignal timeout | `timeout` | AbortError type |
| Socket/network failure | `network` | Generic error fallback |
| Non-2xx status (non-redirect) | `http` | Status code check |
| SSRF blocked | `ssrf_blocked` | SSRF guard return |
| Redirect limit exceeded | `too_many_redirects` | Counter check |
| Body over limit | `body_too_large` | Byte counter |
| DNS lookup failure | `dns_resolution_failed` | DNS error code |
| SSL/TLS failure | `ssl_error` | Error code pattern |
| TCP connection refused | `connection_refused` | ECONNREFUSED code |

## 6. Design Decisions

| Decision | Choice | Rationale |
| --- | --- | --- |
| HTTP client | undici (ADR-008) | High performance, non-blocking, HTTP/1.1+2 |
| Redirect handling | Manual loop | SSRF validation per hop; counter control |
| Politeness data structure | LRU Map | Bounded memory; O(1) get/set |
| Timeout strategy | Cumulative `AbortSignal` | Covers entire redirect chain (REQ-SEC-010) |
| Body streaming | Transform stream with byte counter | Constant memory; early abort |

---

> **Provenance**: Created 2026-03-25. Architect Agent design for HTTP fetching per ADR-008/009/020.
