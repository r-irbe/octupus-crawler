# ADR-016: Coding Standards & Principles

| Field | Value |
| --- | --- |
| **Status** | Accepted |
| **Date** | 2026-03-25 |
| **Deciders** | Architecture Council |
| **Relates to** | ADR-001, ADR-007, ADR-011, ADR-012, ADR-013, ADR-015, ADR-017 |

## Context

A distributed system with multiple developers and AI agents contributing code needs explicit coding standards beyond what linters enforce. The project must decide on a code quality philosophy, naming conventions, TypeScript strictness level, error handling strategy, and programming paradigm. Without explicit decisions, code style diverges and quality becomes inconsistent.

Research into coding principles (see [docs/research/code.md](../research/code.md) Parts IV–VII) evaluated SOLID, CUPID, GRASP, DRY/KISS/YAGNI, Clean Code, OOP, FP, FOOP, and error handling strategies.

## Decision

### 1. Code Quality Philosophy: CUPID Primary, SOLID Secondary

**CUPID** (Composable, Unix philosophy, Predictable, Idiomatic, Domain-based) is adopted as the primary code quality lens. CUPID frames quality as a gradient ("is this more or less composable?") rather than binary compliance ("does this comply with SRP?"), producing better code conversations focused on outcomes.

**SOLID** remains a useful secondary reference, particularly Single Responsibility (interpreted pragmatically) and Dependency Inversion (aligned with Hexagonal ports). SOLID is not applied dogmatically — ISP taken to extremes fragments cohesive concepts; OCP produces rigid inheritance hierarchies.

**GRASP** (General Responsibility Assignment Software Patterns) is used for micro-level responsibility decisions: which service owns which query (Information Expert), object creation responsibility (Creator), and Protected Variations (port interfaces).

**DRY/KISS/YAGNI** serve as the guard against over-engineering:

- DRY applied to business rules and domain knowledge, not incidental code similarity
- KISS as the default — every abstraction layer requires explicit justification
- YAGNI especially for architectural decisions: no Event Sourcing, CQRS read models, or microservice extractions until the problem that justifies them is present

### 2. Programming Paradigm: FOOP (Functional Object-Oriented Programming)

The project adopts FOOP — TypeScript classes for encapsulation and DI wiring, functional patterns inside those classes:

- **Classes**: Used for NestJS providers, DI wiring, encapsulation, module boundaries
- **Functional patterns inside classes**: Pure functions, immutable data (`readonly`, `as const`), `Array.map/filter/reduce`, pipe composition, Result types for errors
- **Composition over inheritance**: Classes hold references to collaborators and delegate; inheritance is used only when polymorphism is genuinely needed
- **Aggregates**: Classes with pure functional methods that return new state rather than mutating in place

### 3. Error Handling: Three-Tier Strategy

| Layer | Approach | Library | Rationale |
| --- | --- | --- | --- |
| **Domain** | `Result<T, DomainError>` | `neverthrow` | Errors are typed in function signatures; callers must handle explicitly |
| **Infrastructure** | `try/catch` or optionally `Effect-TS` | Built-in / `effect` | Infrastructure failures are handled at boundaries; Effect for complex retry/resource pipelines |
| **Application/HTTP** | `try/catch` at outermost boundary | Built-in | Convert all errors to HTTP responses with correlation IDs |

**Typed error hierarchy** using discriminated unions:

```typescript
type AppError =
  | { _tag: 'NotFound'; resource: string; id: string }
  | { _tag: 'Validation'; field: string; message: string }
  | { _tag: 'Unauthorized'; reason: string }
  | { _tag: 'InfraFailure'; service: string; cause: unknown };
```

`neverthrow` is chosen over `fp-ts` (deprecated — founder joined the Effect-TS team, merger complete) and over full `Effect-TS` (learning curve too high for incremental adoption; avoid unless adopting the full ecosystem). Effect-TS is available as an optional infrastructure-layer tool for complex retry/resource pipelines but is NOT recommended for domain logic. The `safeTry` generator API provides Rust-like `?` error propagation.

### 4. TypeScript Strict Configuration

```jsonc
// tsconfig.base.json — strictest viable configuration
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "exactOptionalPropertyTypes": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

Critical flags:

- `exactOptionalPropertyTypes`: Prevents assigning `undefined` to optional properties
- `noUncheckedIndexedAccess`: Array/map access returns `T | undefined`, forcing null checks
- `noImplicitOverride`: Forces explicit `override` keyword in class hierarchies

### 5. ESLint Configuration

```text
@typescript-eslint/strict-type-checked       # Strict type rules
@typescript-eslint/no-explicit-any → error   # Use `unknown` + Zod instead
@typescript-eslint/no-floating-promises      # Critical for async correctness
@typescript-eslint/no-misused-promises       # Prevents subtle async bugs
@typescript-eslint/consistent-type-imports   # `import type` enforcement
unicorn/prefer-module                        # Enforce ESM
import-x/no-cycle                            # Prevent circular dependencies
```

ESLint module-boundary rules enforce the architectural layering from ADR-015.

### 6. Naming Conventions

| Artifact | Convention | Example |
| --- | --- | --- |
| Files | kebab-case | `user-repository.ts` |
| Classes | PascalCase | `UserRepository` |
| Interfaces | PascalCase (no `I` prefix) | `UserRepository` |
| Type aliases | PascalCase | `UserId` |
| Functions | camelCase | `findUserById` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_RETRY_ATTEMPTS` |
| Zod schemas | PascalCase + `Schema` | `CreateUserSchema` |
| Environment variables | SCREAMING_SNAKE_CASE | `REDIS_CLUSTER_URL` |
| BullMQ queues | kebab-case | `crawl-jobs` |
| Domain events | PascalCase past tense | `CrawlCompleted` |

### 7. Concurrency Model

The project adopts an explicit concurrency strategy:

1. **Event loop** (default): I/O-bound work uses async/await on the single-threaded event loop — handles thousands of concurrent connections per process
2. **Worker threads** (`node:worker_threads`): CPU-bound work (HTML parsing of large documents, content hashing) is offloaded to a worker thread pool to keep the event loop unblocked
3. **Cluster** (`node:cluster`): Process-level horizontal scaling — N processes per machine (N = CPU cores), each with its own event loop. Shared state lives in Redis, not in-process
4. **TC39 `using` keyword**: Adopted for deterministic resource cleanup (connections, locks, file handles) via `Symbol.dispose` (Node.js 24+, TypeScript 5.2+)

### 8. Documentation in Code

- Every public function and exported type has a JSDoc comment with `@param`, `@returns`, `@throws`
- A function signature with well-typed parameters and a precise return type IS documentation — comments supplement, not replace, types
- Comments explain *why*, not *what* — the code shows what, the types show shape, comments explain rationale

### 9. Agentic Coding Conventions (ADR-018)

The following coding practices directly improve AI agent reliability and token efficiency:

**Pure functions as agent primitives**: Pure functions (deterministic, no side effects) are the ideal unit of agent-generated code. They are verifiable by Guard Functions with known inputs/outputs, composable without implicit coupling, and token-efficient (complete specification fits in a small context window). Use FOOP classes for DI wiring but fill them with pure functional methods.

**Naming as context engineering**: Self-documenting naming is a token efficiency mechanism. When a function is named `calculateTotalOrderValueWithTax` rather than `calc`, an agent determines purpose without reading the function body. This directly reduces files loaded per task and context rot risk. Conventions:

- Verbs for functions: `createOrder`, `validatePayload`, `fetchUserById`
- Nouns for types: `OrderTotal`, `UserRepository`, `PaymentGateway`
- Domain ubiquitous language in all names — no abbreviations, no generic names (`data`, `result`, `temp`)
- Port names encode role: `UserReadRepository` (outbound, read), `OrderCommandHandler` (inbound, write)

**Explicit types over inferred**: TypeScript inference is a developer convenience but an agent reliability liability. Explicit annotations give agents type information from a single file load without tracing inference chains:

- Always annotate function parameters and return types explicitly
- Prefer `interface` over `type` for public API shapes (declaration merging aids agent reasoning)
- Avoid complex conditional types in public interfaces (increases LLM fallback to `any`)
- Discriminated unions with literal `_tag` fields for variant types

**KISS and YAGNI for agents**: Agents, when not constrained, systematically over-engineer solutions. KISS and YAGNI are applied as hard constraints:

- Every abstraction layer requires explicit justification in a code comment or spec
- No speculative generality — build for the current requirement only
- Simple code = fewer tokens to load = fewer hallucinations

**Railway-Oriented error handling for agent reliability**: `neverthrow` Result types prevent agents from accidentally throwing exceptions that escape domain boundaries. Errors are always explicit values in the return type, visible to the type checker and Guard Functions. An agent returning `err(new ValidationError(...))` makes the error path a verifiable, type-safe datum.

## Consequences

### Positive

- CUPID's gradient model prevents dogmatic code review debates
- neverthrow makes error paths explicit in function signatures — the compiler enforces handling
- Strict TypeScript catches 30–40% more bugs at compile time
- Naming conventions eliminate bikeshedding
- FOOP captures the best of both OOP (DI, encapsulation) and FP (purity, immutability, composability)

### Negative

- `noUncheckedIndexedAccess` adds verbosity to array-heavy code (requires null checks)
- neverthrow adds a dependency and requires team familiarity with Result type patterns
- Strict ESLint rules may initially slow developers unfamiliar with TypeScript strict mode
- CUPID is less well-known than SOLID — requires team education

### Risks

- At ESLint rule bypass via `eslint-disable` comments undermines the safety net — CI must report eslint-disable usage counts
- neverthrow adoption at domain boundaries only requires discipline to not let thrown exceptions leak through

## Evidence

- TypeScript strict mode produces 30–40% fewer production bugs and 20–25% faster developer onboarding ([research/arch.md](../research/arch.md) Ecosystem Baseline)
- TypeScript type-constrained decoding narrows valid LLM generation space — tighter types reduce hallucinations; TypeScript uniquely capable of expressing constraints that directly constrain generated code ([research/ai_coding.md](../research/ai_coding.md) §3.1)
- CUPID was proposed by Dan North as a properties-based replacement for SOLID's binary rules ([research/code.md](../research/code.md) Part IV §4.2)
- neverthrow provides `safeTry` generator API for ergonomic error propagation, closest approximation to Rust's `?` operator ([research/code.md](../research/code.md) Part V §5.3)
- fp-ts is effectively deprecated; its founder joined the Effect-TS team ([research/code.md](../research/code.md) Part V §5.2)
- Effect-TS: powerful but NOT suitable for incremental adoption — requires full ecosystem commitment; use neverthrow for domain, Effect selectively for infrastructure retry/resource pipelines ([research/ai_coding.md](../research/ai_coding.md) §5.6)
- Pure functions verified by Guard Functions achieve up to +66pp task success rate improvement ([research/ai_coding.md](../research/ai_coding.md) §5.2)
- KISS and YAGNI critical for agents: unconstrained agents systematically over-engineer ([research/ai_coding.md](../research/ai_coding.md) §5.4)
- LLMs perform worse generating Haskell/OCaml than TypeScript; pure FP languages require explicit FP constraints but TypeScript hybrid is better for LLM generation ([research/ai_coding.md](../research/ai_coding.md) §5.1)
- Neuroscience rationale for FOOP: pure function decomposition aligns with DMN/ECN coupling patterns that produce creative solutions ([research/ideating.md](../research/ideating.md) §1.2)

## Related

- [ADR-001: Monorepo Tooling](ADR-001-monorepo-tooling.md) — Package structure and file conventions
- [ADR-007: Testing Strategy](ADR-007-testing-strategy.md) — Test code follows coding standards
- [ADR-011: API Framework](ADR-011-api-framework.md) — Fastify + NestJS code patterns
- [ADR-012: CI/CD Pipeline](ADR-012-ci-cd-pipeline.md) — ESLint enforcement in CI
- [ADR-013: Configuration Management](ADR-013-configuration-management.md) — Zod schema-first
- [ADR-015: Architecture Patterns](ADR-015-application-architecture-patterns.md) — Hexagonal + VSA structure
- [ADR-017: Service Communication](ADR-017-service-communication.md) — tRPC/Temporal code patterns, discriminated union events
- [ADR-018: Agentic Coding](ADR-018-agentic-coding-conventions.md) — Pure functions, naming as context, explicit types, agent-specific conventions
- [ADR-020: Spec-Driven Development](ADR-020-spec-driven-development.md) — Zod/TypeBox as runtime contract enforcement tier in specification hierarchy

---

> **Provenance**: Created 2026-03-25 from analysis of [docs/research/code.md](../research/code.md) Parts IV–VII, [docs/research/arch.md](../research/arch.md) Phase 2, and [docs/research/ai_coding.md](../research/ai_coding.md) §§3,5. Synthesizes coding standards and agentic coding conventions into enforceable project decisions. Added ADR-020 cross-reference. Updated 2026-03-25: expanded Effect-TS guidance (selective adoption), TypeScript empirical evidence with LLM-specific rationale, LLM FP language comparison, neuroscience rationale for FOOP from [ideating.md](../research/ideating.md).
