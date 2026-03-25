# Skill: Code Generation

**Agent**: Implementation

Write production TypeScript/Node.js code following project conventions, ADR decisions, and strict quality standards.

## Quality Gates (pre-commit)

1. TypeScript strict — no `any` types
2. ESLint clean — zero warnings/errors
3. Imports respect monorepo boundaries (ADR-001)
4. No hardcoded config — Zod-validated env vars (ADR-013)
5. Graceful shutdown for long-running processes (ADR-009)
6. OTel instrumentation at service boundaries (ADR-006)
7. Error handling at system boundaries only
8. No secrets in code

## Pattern Library

| Pattern | ADR | When |
| --- | --- | --- |
| Zod config validation | ADR-013 | New config key |
| BullMQ queue/worker | ADR-002 | New job types |
| Fastify route + schema | ADR-011 | New API endpoints |
| Circuit breaker (cockatiel) | ADR-009 | External calls |
| Graceful shutdown | ADR-009 | New service |
| Testcontainers | ADR-007 | Integration tests |
| undici + cheerio | ADR-008 | Crawl behavior |
| Guard Function chain | ADR-018 | Every task |

## Agentic Conventions (ADR-018)

- **File size**: ≤200 lines target, 300 hard limit — split along feature boundaries
- **Guard loop**: tsc → eslint → vitest → pass or retry (max 3) → escalate
- **Naming as context**: domain ubiquitous language, purpose from name alone
- **Explicit types**: annotate all params and return types
- **Pure functions first**: domain core is pure; side effects in adapters only
- **Schema-first**: Zod schema before handler, `z.infer<>` for types
- **Direct imports**: `import { X } from './feature/x.service'` — no barrels
- **Spec-first**: Read `requirements.md` → map Given/When/Then to tests

## Rules

1. Read existing code before writing (codebase-analysis first)
2. Follow existing patterns — consistency over novelty
3. No premature abstraction — wait for third instance
4. One module, one concern
5. Export only what's needed

## Related

- [ADR-015](../adr/ADR-015-application-architecture-patterns.md), [ADR-016](../adr/ADR-016-coding-standards-principles.md), [ADR-017](../adr/ADR-017-service-communication.md)
- [ADR-018](../adr/ADR-018-agentic-coding-conventions.md), [ADR-020](../adr/ADR-020-spec-driven-development.md)
