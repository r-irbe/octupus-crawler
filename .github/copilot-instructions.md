# GitHub Copilot Instructions for IPF Crawler

> This file is automatically loaded by GitHub Copilot when working in this repository.
> It extends [AGENTS.md](../AGENTS.md) (the project-wide AI coding instructions) with Copilot-specific guidance.

## Canonical Instructions

Read [AGENTS.md](../AGENTS.md) for all coding rules, naming conventions, architecture decisions, package layout, and key patterns. Those rules are **binding** — everything in this file is additive.

## Copilot-Specific Guidance

### Code Completion

When completing code in this project:

- Use `neverthrow` `Result<T, E>` for domain layer error returns, not thrown exceptions
- Prefer `import { X } from './specific-file'` over barrel imports from `index.ts`
- Always add explicit return type annotations to functions
- Use Zod schemas (`z.object(...)`) for request/response shapes, derive types with `z.infer<>`
- For new config keys, add to the Zod schema in `packages/config/`
- For new API routes, use Fastify's `@fastify/type-provider-zod` pattern
- For Redis/PG/S3 tests, use Testcontainers — never mock infrastructure

### Chat / Inline Chat

When asked to generate or modify code:

1. Check the [ADR routing table](../AGENTS.md) for the relevant architecture decision
2. Follow the [package layout](../AGENTS.md) for file placement
3. Follow the [feature structure](../AGENTS.md) for feature organization
4. Apply the [coding rules (MUST/SHOULD/NEVER)](../AGENTS.md) from AGENTS.md
5. Run the Guard Function chain mentally: would `tsc`, `eslint`, and `vitest` pass?

### PR Descriptions

When generating PR descriptions:

- Reference the relevant ADR(s) by number
- Include a "Testing" section describing what was tested
- Note any ADR compliance implications
- Use conventional commit format for PR title

### Test Generation

When generating tests:

- Unit tests: Vitest, pure function assertions, no mocks for infra
- Integration tests: Vitest + Testcontainers (`GenericContainer('redis:7-alpine')`)
- Contract tests: Pact for inter-service contracts
- Property tests: fast-check for domain functions with large input spaces
- Follow the test pyramid: 65% unit, 20% integration, 10% contract, 5% e2e

### TypeScript Configuration

This project uses ultra-strict TypeScript. Be aware of:

- `exactOptionalPropertyTypes`: Can't assign `undefined` to optional props
- `noUncheckedIndexedAccess`: Array/map access returns `T | undefined`
- `noImplicitOverride`: Must use `override` keyword in class hierarchies
- `no-explicit-any` ESLint rule: Use `unknown` + Zod parse instead of `any`

### Domain Language

Use these exact terms in code:

| Term | Meaning |
| --- | --- |
| `CrawlJob` | A unit of work to fetch and parse a URL |
| `URLFrontier` | The prioritized queue of URLs to crawl |
| `DomainPolicy` | Rate limits and rules per target domain |
| `FetchResult` | The outcome of an HTTP fetch (success or failure) |
| `ParseResult` | Extracted data from HTML content |
| `URLDiscovered` | Domain event when new URLs are found during parsing |
| `CrawlCompleted` | Domain event when a CrawlJob succeeds |
| `CrawlFailed` | Domain event when a CrawlJob fails after retries |

## Key File Locations

| What | Where |
| --- | --- |
| All ADRs | `docs/adr/ADR-*.md` |
| Shared types | `packages/core/src/` |
| Config schema | `packages/config/src/` |
| ESLint config | `packages/eslint-config/` |
| Test utilities | `packages/testing/src/` |
| Zod schemas | `packages/validation/src/` |
| OTel setup | `packages/observability/src/` |
| Redis abstractions | `packages/redis/src/` |
| DB schemas | `packages/database/src/` |

## Additional ADR Awareness

### ADR-015: Architecture Patterns
- **Hexagonal + VSA hybrid**: Clean Architecture at bounded context boundaries; Vertical Slice Architecture within
- **DDD**: Entities, Value Objects, Aggregates, Domain Events in `domain/` subfolder
- **Modular monolith first**: Extract to microservices only when proven necessary

### ADR-016: Coding Standards
- **CUPID over SOLID**: Quality as gradient, not binary compliance
- **FOOP**: Functional-Object-Oriented Programming — pure functions + thin class wrappers
- **neverthrow**: `Result<T, DomainError>` for domain layer, `try/catch` only at HTTP boundary

### ADR-017: Service Communication
- **tRPC internal**: Type-safe service-to-service calls within the monolith
- **TypeSpec/OpenAPI external**: External API contracts via TypeSpec → OpenAPI generation
- **Temporal**: Durable workflow orchestration + Saga compensation patterns
- **Redis Streams**: Domain events with discriminated unions + versioning

### ADR-018: Agentic Coding (Key Details)
- **File size**: ≤200 lines target, 300 hard limit — split along feature/responsibility boundaries
- **Guard Functions**: `tsc → eslint → vitest` chain, max 3 total attempts before escalation
- **Spec-Driven Development**: `requirements.md` → `design.md` → `tasks.md` before new features
- **Atomic Action Pairs**: code change + test in same commit

### ADR-019: Ideation & Decision Protocols
- **Anti-sycophancy**: Maintain position when evidence supports it (78.5% threshold)
- **Reasoning frameworks**: CoT, ToT, GoT, SPIRAL — match complexity to task
- **Structured ideation**: Incubation + association phases before convergence

### ADR-020: Spec-Driven Development
- **EARS requirements**: `When <trigger>, the <system> shall <response>` — five patterns for structured requirements
- **Three-document specs**: `requirements.md` (EARS) → `design.md` (architecture) → `tasks.md` (implementation)
- **Contract-first API**: TypeSpec → OpenAPI 3.1 → Spectral lint → Dredd validation → Pact consumer tests
- **Property tests from EARS**: EARS requirements derive fast-check properties for specification validation
- **Quality gates**: 5-dimension framework (task success, context preservation, latency, safety, evidence coverage)
- **Formal methods (selective)**: TLA+ for rate limiting, circuit breaker, distributed locking

---

> **Provenance**: Created 2026-03-25. Extends AGENTS.md with GitHub Copilot-specific completion and chat guidance. Updated 2026-03-25: added ADR-015 through ADR-019 awareness sections. Updated 2026-03-25: added ADR-020 (SDD) awareness.
