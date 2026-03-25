# Skill: Code Generation

| Field | Value |
| --- | --- |
| **ID** | `code-generation` |
| **Status** | Active |
| **Created** | 2026-03-24 |
| **Used By** | Implementation |

## Purpose

Enables agents to write production TypeScript/Node.js code that follows project conventions, ADR decisions, and strict quality standards.

## Capabilities

### Code Writing

- Write TypeScript with strict mode enabled
- Follow project module structure (ADR-001)
- Use project dependencies (never introduce unapproved deps)
- Apply resilience patterns from ADR-009
- Use Zod config patterns from ADR-013
- Follow Fastify patterns from ADR-011

### Code Quality Gates

Before marking code generation complete:

1. ✅ TypeScript strict mode — no `any` types without justification
2. ✅ ESLint clean — zero warnings, zero errors
3. ✅ Imports from correct packages (respect monorepo boundaries)
4. ✅ No hardcoded configuration (use Zod-validated env vars)
5. ✅ Graceful shutdown implemented for any long-running process
6. ✅ OpenTelemetry instrumentation for any new service boundary
7. ✅ Error handling at system boundaries (user input, external APIs)
8. ✅ No secrets in code

### Patterns Library

| Pattern | ADR | When |
| --- | --- | --- |
| Zod config validation | ADR-013 | Any new config key |
| BullMQ queue/worker | ADR-002 | New job types |
| Fastify route + schema | ADR-011 | New API endpoints |
| OTel custom metric | ADR-006 | New measurable behavior |
| Circuit breaker (cockatiel) | ADR-009 | External calls |
| Graceful shutdown | ADR-009 | Any new service |
| Testcontainers setup | ADR-007 | New integration test |
| undici fetch + cheerio parse | ADR-008 | New crawl behavior |
| Guard Function chain | ADR-018 | Every code generation task |
| Spec-Driven Development | ADR-018 | Every new feature |

### Agentic Code Generation Conventions (ADR-018)

All code generation MUST follow these agentic coding conventions:

**File size**: Target ≤200 lines per implementation file. If a generated file exceeds 300 lines, split along feature/responsibility boundaries before committing.

**Guard Function loop**: After generating code, run the full guard chain before declaring task complete:

```text
1. tsc --noEmit       → Must pass
2. eslint             → Must pass (zero warnings)
3. vitest run         → Must pass (relevant tests)
4. If fail → read error, fix, retry (max 3 total attempts)
5. If 3 failures → escalate to user
```

**Naming as context**: Use domain ubiquitous language. `calculateTotalOrderValueWithTax` not `calc`. Agent must determine function purpose from name alone.

**Explicit types**: Always annotate function parameters and return types. Never rely on inference for public API surfaces.

**Pure functions first**: Generate pure functions in domain core. Side effects only in adapters.

**Schema-first**: Define Zod schema before writing handler code. Use `z.infer<typeof Schema>` for types.

**Direct imports**: Use `import { X } from './feature/x.service'` not barrel re-exports.

**Spec-first**: Read `spec.md` before starting any feature implementation. Map Given/When/Then criteria to test cases.

## Rules

1. Read existing code before writing new code (codebase-analysis first)
2. Follow existing patterns in the codebase — consistency over novelty
3. No premature abstraction — wait for the third instance before extracting
4. One module, one concern — keep files focused
5. Export only what's needed — minimize public API surface

## Related

- [Implementation Agent](../agents/implementation.md)
- [ADR-015: Architecture Patterns](../adr/ADR-015-application-architecture-patterns.md) — Hexagonal+VSA structure, DDD entity/value object patterns
- [ADR-016: Coding Standards](../adr/ADR-016-coding-standards-principles.md) — CUPID, FOOP, neverthrow, naming conventions, ESLint rules
- [ADR-017: Service Communication](../adr/ADR-017-service-communication.md) — tRPC routers, Temporal workflows, Redis Streams events
- [ADR-018: Agentic Coding Conventions](../adr/ADR-018-agentic-coding-conventions.md) — Guard Functions, file size, naming, schema-first
- [ADR-020: Spec-Driven Development](../adr/ADR-020-spec-driven-development.md) — EARS requirements, three-document spec structure, contract-first API

---

> **Provenance**: Created 2026-03-24; updated 2026-03-25 with agentic coding conventions from [docs/research/ai_coding.md](../research/ai_coding.md). Added ADR-015/016/017/020 cross-references.
