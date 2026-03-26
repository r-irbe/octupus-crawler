# Core Contracts & Architecture — Tasks

> Implementation tasks traceable to [requirements.md](requirements.md). Dependency-ordered.
> Design: [design.md](design.md)

---

## Phase 1: Contract Types

- [x] **T-ARCH-001**: Define `FetchError` discriminated union with 9 variants and typed constructors → REQ-ARCH-012, REQ-ARCH-013
- [x] **T-ARCH-002**: Define `UrlError` discriminated union with 3 variants and typed constructors → REQ-ARCH-012, REQ-ARCH-013
- [x] **T-ARCH-003**: Define `CrawlError` discriminated union (superset of FetchError + UrlError + 3 variants) → REQ-ARCH-012, REQ-ARCH-013
- [x] **T-ARCH-004**: Define `CrawlUrl` branded type with `raw`, `normalized`, `domain` fields → REQ-CRAWL-003 (cross-ref)
- [x] **T-ARCH-005**: Define `Frontier` interface (enqueue, size, close) → REQ-ARCH-002, REQ-ARCH-009
- [x] **T-ARCH-006**: Define `Fetcher` interface (async with typed error) → REQ-ARCH-002, REQ-ARCH-010
- [x] **T-ARCH-007**: Define `Logger` interface (5 levels + child) → REQ-ARCH-002, REQ-ARCH-010
- [x] **T-ARCH-008**: Define `CrawlMetrics` interface (counters + gauges) → REQ-ARCH-002, REQ-ARCH-010
- [x] **T-ARCH-009**: Define `JobConsumer` interface (start, close) → REQ-ARCH-002, REQ-ARCH-009
- [x] **T-ARCH-010**: Define `JobEventSource` interface (event handlers + close) → REQ-ARCH-002, REQ-ARCH-009
- [x] **T-ARCH-011**: Define `LinkExtractor` interface (synchronous) → REQ-ARCH-002, REQ-ARCH-010
- [x] **T-ARCH-012**: Define `ControlPlane` interface (state, pause, resume, cancel, progress, close) → REQ-ARCH-002, REQ-ARCH-009

## Phase 2: Configuration

- [x] **T-ARCH-013**: Create Zod schema for all configuration variables (required + optional) → REQ-ARCH-014
- [x] **T-ARCH-014**: Implement `loadConfig(env)` returning `Result<Config, ValidationError>` → REQ-ARCH-014
- [x] **T-ARCH-015**: Define narrow config slice types for each consumer → REQ-ARCH-015

## Phase 3: Static Analysis Rules

- [x] **T-ARCH-016**: Configure eslint import rules enforcing layer boundaries → REQ-ARCH-001, REQ-ARCH-003 to 005
- [x] **T-ARCH-017**: Configure circular dependency detection (build-time) → REQ-ARCH-007
- [x] **T-ARCH-018**: Configure test boundary rules (no test→prod, no prod→test imports) → REQ-ARCH-008
- [x] **T-ARCH-019**: Add contracts-purity rule (no runtime code in contracts layer) → REQ-ARCH-002

## Phase 4: Composition Root

- [x] **T-ARCH-020**: Implement composition root with phased wiring sequence → REQ-ARCH-006
- [x] **T-ARCH-021**: Register signal handlers in composition root → REQ-ARCH-006 (step 4)

## Phase 5: Composition Root Safety

- [x] **T-ARCH-026**: Implement singleton guard (throw on second composition root instantiation) → REQ-ARCH-016
- [x] **T-ARCH-027**: Implement reverse-order cleanup on partial startup failure → REQ-ARCH-017
- [x] **T-ARCH-028**: Define `Disposable` interface with `close(): Promise<void>` and track all disposables → REQ-ARCH-018

## Phase 6: Tests

- [x] **T-ARCH-022**: Unit tests for all error constructors (compile-time + runtime validation) → REQ-ARCH-012, REQ-ARCH-013
- [x] **T-ARCH-023**: Unit tests for config loading (valid, invalid, missing cases) → REQ-ARCH-014
- [x] **T-ARCH-024**: Static analysis test verifying zero circular deps → REQ-ARCH-007
- [x] **T-ARCH-025**: Static analysis test verifying layer boundary compliance → REQ-ARCH-001 to 005
- [x] **T-ARCH-029**: Unit test for singleton guard (second call throws) → REQ-ARCH-016
- [x] **T-ARCH-030**: Scenario test for partial startup failure cleanup → REQ-ARCH-017
- [x] **T-ARCH-031**: Unit test for Disposable interface and close() tracking → REQ-ARCH-018

## Deferred (from G8 Review Council)

- [x] **T-ARCH-032**: Add `sensitiveFields` constant to config listing secret keys (`S3_ACCESS_KEY`, `S3_SECRET_KEY`, `DATABASE_URL`) → prevents accidental logging of Config objects. Add `toSafeLog(config)` helper that redacts sensitive values. → Review finding S-1 (Major, sustained)
- [x] **T-ARCH-033**: Strip credentials from URLs before embedding in error `message` fields (e.g., `https://user:pass@host/` → `https://***@host/`). Applies to all error constructors in `fetch-error.ts`, `url-error.ts`. → Review finding S-2 (Minor, sustained)

---

## Dependencies

| Task | Depends On | Blocks |
| --- | --- | --- |
| Phase 1 (contracts) | — | All other features |
| Phase 2 (config) | T-ARCH-001 to 003 (error types) | application-lifecycle, infrastructure |
| Phase 3 (lint rules) | Phase 1 | CI pipeline |
| Phase 4 (composition root) | Phase 1, Phase 2 | application-lifecycle |
| Phase 5 (safety) | Phase 4 | application-lifecycle |
| Phase 6 (tests) | Phases 1-5 | — |

---

> **Provenance**: Created 2026-03-25. Implementation Agent task decomposition per ADR-020. Updated 2026-03-25: added Phase 5 (REQ-ARCH-016–018 singleton guard, cleanup, Disposable).
