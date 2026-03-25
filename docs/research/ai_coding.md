# Agentic Coding Conventions: Architecture, Design, and Coding Practices for Maximum Reliability and Token Efficiency

## Executive Summary

The shift to agentic coding fundamentally changes what "good code" means. Code written for human readers and code optimised for AI-agent generation, navigation, and modification are converging but not identical — and the delta between them is highly actionable. This report synthesises empirical research, production case studies, and architectural analysis across six dimensions: **file and project structure, type system discipline, architecture patterns, code style, context engineering, and process conventions**. It treats agent reliability and token efficiency as first-class constraints alongside maintainability, and compares every recommendation with the alternatives discussed in the prior architecture analysis.

***

## 1. The Agentic Coding Constraint Model

Before analysing individual practices, it is critical to understand the three constraints that govern agent performance on real codebases.

### 1.1 Context Rot

A landmark 2025 study from Chroma Research, covering 18 leading LLMs including GPT-4.1, Claude 4, Gemini 2.5, and Qwen 3, demonstrated a phenomenon termed **context rot**: systematic, non-linear performance degradation as input context length increases, even on trivially simple tasks. In the LongMemEval benchmark, models given focused 300-token contexts outperformed the same models given the full 113k-token conversation. The mechanism is structural: longer context forces models to simultaneously perform retrieval and reasoning, whereas shorter focused context allows pure reasoning. The practical corollary is counterintuitive — models performing at 128k or 1M tokens in benchmarks may effectively operate at 50% or less of claimed context length before degradation is measurable.[^1][^2][^3]

### 1.2 The Token Budget as Architecture Constraint

Contemporary LLM serving systems treat all tokens equally, but in agentic workflows tokens have radically different marginal value. Tool definitions loaded statically can consume 150k tokens before a single line of task code is read; the Anthropic code execution MCP pattern reduces this to 2k tokens — a **98.7% reduction** — by loading tool schemas on demand from the filesystem rather than injecting them upfront. Similarly, a 500-line source file consumes approximately 9,000–10,000 tokens; a 50-line file consumes approximately 900–1,000. Every architectural decision about file granularity, function scope, and naming is simultaneously a token budget decision in an agentic environment.[^4][^5][^6]

### 1.3 The Stochastic–Deterministic Boundary

Production agentic systems face what has been formalised as the **Integration Paradox**: LLMs generate stochastic prose, but production systems require deterministic, schema-validated inputs and outputs. The most reliable agentic code architectures formally separate stochastic LLM generation from deterministic control flow. Research validating the **Dual-State Solution Space** framework — which separates workflow state (what the agent has done) from environment state (what the system contains) — shows task success rate improvements of up to 66 percentage points over one-shot baselines at only 1.2–2.1× baseline computational cost. The mechanism is **Atomic Action Pairs**: generation and verification are treated as inseparable transactions, where a Guard Function (syntax validation → unit test) must succeed before the workflow state can advance.[^7][^8]

***

## 2. Project and File Structure Conventions

### 2.1 Monorepo as Agentic Foundation

Monorepos provide AI agents with a **unified workspace view**, enabling dependency tracing and cross-module understanding that is structurally impossible across distributed repositories. The key affordances are:[^9]

- **Project graph**: structured map of every project and dependency, queryable by the agent without reading source files. The agent can determine blast radius from a single structured call rather than grepping imports.[^9]
- **Tagging/domain taxonomy**: classifying projects into domain areas (auth, shop, infra) gives the agent the same high-level architecture map a senior engineer holds, enabling progressive exploration from domain → project → file.[^9]
- **Atomic cross-project changes**: a cross-service refactor happens in one PR, tested by the monorepo tool's affected-project detection, with the agent iterating in a single session until CI is green.[^9]
- **Remote caching**: tasks that have run with the same inputs are restored from cache, making agent feedback loops dramatically faster.[^9]

Spectro Cloud's 2026 analysis explicitly identifies monorepos as the structural foundation for reliable agentic workflows, noting that open standards like `AGENTS.md` were designed assuming a single canonical instruction location.[^10]

### 2.2 File Size and Co-location

The single most actionable structural change for agentic coding reliability is **keeping files small and co-locating related code**. Research on LLM context consumption shows that a 500-line file consumes an order of magnitude more tokens than a 50-line file, and community experience confirms that 1,000+ line files cause agent context overload and context rot.[^11][^4]

The **Vertical Slice Architecture** convention — where all code for a feature (route, service, schema, types, tests) lives in the same folder — maps naturally to agent task boundaries. The prior analysis found VSA produces 44% smaller PRs (15 vs 27 files changed). For agentic work the benefit compounds: an agent implementing or modifying a feature can load the entire slice into a focused context without navigating a layered tree across multiple directories.[^12]

Recommended file structure conventions for agentic codebases:
- **Single responsibility per file**, targeting under 200–300 lines of implementation code
- Feature folders with co-located types, schemas, handlers, services, and tests
- `index.ts` barrel files only where necessary — they hide structure from the agent's file-traversal reasoning
- Clear, predictable naming that reveals domain and function without reading the file body

### 2.3 Dependency Topology Preservation

Research on hierarchical context pruning for repository-level LLM completion found that **maintaining topological dependencies of files** and increasing code file content in completion prompts improves accuracy, while pruning specific implementations of functions in dependent files does not significantly reduce accuracy. In practical terms: agents perform better when they can navigate import chains structurally rather than lexically. This is an argument for explicit imports over barrel re-exports, and for dependency injection patterns that make the dependency graph readable at a glance.[^13]

***

## 3. Type System Discipline

### 3.1 TypeScript as Agent-Native Language

An empirical 2025 analysis confirmed that TypeScript's type system produces measurably better LLM code generation outcomes than dynamically typed alternatives. The mechanism is **type-constrained decoding**: tighter types narrow the space of valid generated programs, causing the model to converge on correct implementations faster and with fewer hallucinations. The analysis notes that TypeScript is uniquely capable among mainstream languages of expressing constraints (e.g., "this object has the same keys as that type but camelCased") that directly constrain what generated code can do.[^14]

The converse failure mode is well-documented: under complex type errors, LLMs systematically fall back to `any`, hiding bugs and defeating the safety mechanism. Mission-critical codebases should therefore enforce `no-explicit-any` via ESLint and combine this with `strict: true`, `exactOptionalPropertyTypes`, and `noUncheckedIndexedAccess` in `tsconfig.json`. The plan's TypeScript toolchain phase already specifies these settings; the agentic coding context makes them doubly important.[^14]

### 3.2 Schema-First with Zod or TypeBox

The principle of **schema-first design** — defining the structure of data before the code that processes it — is the single most powerful alignment practice between domain design and agent reliability. Zod schemas provide compile-time TypeScript type inference and runtime validation simultaneously, eliminating an entire class of hallucinations where agents generate code that compiles but fails at runtime boundaries. TypeBox achieves the same with significantly better performance and direct JSON Schema compatibility.[^15][^16]

For agentic workflows specifically:
- Define Zod/TypeBox schemas for every API request and response boundary
- Use `z.infer<typeof Schema>` to derive TypeScript types rather than writing types separately — eliminates agent-introduced divergence between runtime and compile-time shapes
- Structured output from LLM tool calls should always be validated against a Zod schema before use[^17]
- Schema reinforcement learning research confirms that structured generation against explicit schemas significantly improves valid JSON output rates[^18]

The schema is the contract between the stochastic LLM generation phase and the deterministic domain logic. An agent that generates a handler function can be verified against the schema in the Guard Function without requiring human review.

### 3.3 Explicit Over Inferred

TypeScript's type inference is a developer convenience feature, but it becomes an agent reliability liability when type information must be reconstructed from implicit chains. Research on code completion models shows that **cross-file context and inter-file relationships** are critical for accurate completion, and that including topological dependencies improves accuracy. Explicit function signatures, explicit return types, and explicit interface definitions give the agent the information it needs from a single file load, without requiring it to trace inference chains across multiple files.[^19][^13]

Conventions:
- Always annotate function parameters and return types explicitly
- Prefer `interface` over `type` for public API shapes (agent-readable documentation via declaration merging)
- Avoid complex conditional types in public interfaces — they dramatically increase the probability of LLM fallback to `any`[^14]
- Use discriminated unions for variant types: the `type` field is a self-documenting and machine-checkable narrowing guard

***

## 4. Architecture Patterns Through the Agentic Lens

### 4.1 Hexagonal Architecture: Still Wins

Hexagonal (Ports & Adapters) architecture is particularly well-suited to agentic coding environments because the port/adapter boundary coincides perfectly with the boundary between deterministic domain logic and stochastic external dependencies (LLM APIs, databases, HTTP services). The domain layer contains pure functions and business logic; the adapters are thin implementations of domain-defined interfaces.[^20][^21]

For an agent working on domain logic, the constraint that the domain cannot import infrastructure classes is a **hard context boundary** — the agent cannot accidentally couple domain and infrastructure because the linting rule or DDD-Enforcer will immediately fail the Guard Function. Research shows a DDD-Enforcer VS Code extension achieving **100% detection accuracy** across 15 violation cases. An agent that violates hexagonal boundaries — for example, by importing Redis directly into a domain service for a performance optimisation — is caught immediately.[^22][^21]

The practical structure for a TypeScript Node.js backend:

```
src/
├── domain/          # Pure TypeScript — no framework, no I/O
│   ├── [feature]/
│   │   ├── [feature].entity.ts       # Domain entity
│   │   ├── [feature].port.ts         # Port interfaces (inbound/outbound)
│   │   ├── [feature].service.ts      # Domain service — pure functions
│   │   └── [feature].service.spec.ts # Unit tests (no mocks needed)
├── application/     # Use cases / orchestration
│   └── [feature]/
│       └── [feature].usecase.ts
├── infrastructure/  # Adapters implementing domain ports
│   ├── http/
│   ├── redis/
│   └── postgres/
└── interface/       # Entry points (Fastify routes, CLI, etc.)
```

This structure is **agent-navigable**: an agent asked to add a feature can start at `domain/[feature]/`, create the entity and port, then implement the adapter, with each step independently testable and independently verifiable.

### 4.2 DDD Bounded Contexts as Agent Task Boundaries

Domain-Driven Design's bounded context concept maps directly to agent task scope management. The problem of "prompt spaghetti" — agents that modify unrelated files across domain boundaries — is structurally identical to the DDD problem of domain model degradation. When a codebase is organised into explicit bounded contexts with clear ubiquitous language (domain terminology consistent within a context, potentially different across contexts), an agent can be given a task scoped to one context and will predictably stay within that boundary.[^23][^22]

The monorepo architecture supports this: each bounded context becomes a workspace package, with explicit `@domain/[context]` imports that cross-boundary violations are detectable by module boundary linting rules (Nx module boundary rules catch violations before tests run).[^9]

### 4.3 Modular Monolith as Default

The prior analysis recommended starting with a modular monolith rather than immediately adopting microservices. From an agentic coding perspective, this recommendation is reinforced. An agent working in a monorepo with clearly separated domain packages can perform atomic cross-cutting changes in a single session. In a microservices environment, the same change requires cross-repository coordination, multiple PRs, and broken context chains.

The decision gate for microservice extraction becomes: "Can this service boundary be owned by an agent team working in a separate context?" If the answer is yes, extract. If not, the blast radius of multi-repo context management exceeds the organisational benefits.

### 4.4 Modular Monolith vs Microservices

| Dimension | Modular Monolith | Microservices |
|---|---|---|
| Agent task atomicity | Single PR, full context | Multi-repo, context loss at boundaries |
| Context window usage | Unified dependency graph | Per-service context, integration gaps |
| Type safety across services | Full TypeScript inference | Codegen or manual sync required |
| Guard function coverage | CI covers whole system | Per-service CI, integration gaps |
| Complexity penalty | Low | High (orchestration, service mesh) |
| When to use | Default | After modular boundaries are stable + team scale demands it |

### 4.5 Event Sourcing and CQRS

Event sourcing is architecturally excellent for agentic coding systems because events are **immutable facts** — they cannot be mutated by an agent's incorrect edit. The event log serves as an audit trail that a debugging agent can replay to reconstruct system state. CQRS separates write models (commands) from read models (queries), which produces naturally small, single-purpose functions that are individually verifiable by a Guard Function.

The complexity cost is non-trivial. Event sourcing requires projection logic, snapshot management, and careful schema evolution. Agent-generated event schema changes require validation against the projection functions. The recommendation is: apply event sourcing to subdomains where audit, temporal querying, or event replay are genuine requirements — not as a default. Use CQRS read models (separate read repositories with denormalised projections) broadly, as they produce small, pure, easily testable projection functions that agents generate reliably.

### 4.6 Architecture Decision: The Hexagonal + VSA Hybrid

The optimal structure for agentic codebases combines **Hexagonal outer boundaries** (domain isolation from infrastructure) with **Vertical Slice inner organisation** (feature-cohesion within the domain). This was identified in the prior analysis as VSA reducing PR size by 44%. The combination provides:

- Hexagonal's hard infrastructure isolation → agent cannot corrupt domain with infrastructure imports
- VSA's feature cohesion → agent loads entire feature in one context, makes atomic changes
- Clear port interfaces → agent can generate stub implementations and verify against typed contracts

***

## 5. Code Style and Programming Paradigm Conventions

### 5.1 Functional Core, Imperative Shell

The **functional core, imperative shell** pattern — popularised by Gary Bernhardt — is the most agent-friendly programming style for TypeScript backends. Pure functions in the domain core take immutable inputs and return new values; side effects (I/O, state mutation) are isolated to the imperative shell (adapters, entry points).

Empirical research on LLM functional programming code generation confirms that models perform substantially worse on purely functional languages (Haskell, OCaml) than on hybrid languages, and tend to violate immutability and purity even when they technically compile. However, the same research shows that **providing explicit functional programming best practices in the prompt (via cursor rules or AGENTS.md) with static analysis feedback substantially recovers quality**. The practical conclusion: use TypeScript's functional capabilities (pure functions, `readonly`, `as const`, `Object.freeze`, `Array.map/filter/reduce`, `neverthrow`) in the domain core, with explicit rules instructing the agent to maintain purity; use imperative patterns in adapters where they are natural.[^24]

### 5.2 Pure Functions as Agent Primitives

Pure functions — deterministic, no side effects, no hidden state — are the ideal unit of agent-generated code for three reasons:

1. **Verifiability**: a Guard Function can invoke a pure function with known inputs and assert outputs without mocking infrastructure
2. **Composability**: agents can generate small pure functions and compose them without introducing implicit coupling
3. **Token efficiency**: a pure function's complete specification fits in a small context window; a stateful class with complex lifecycle requires loading the entire class and its dependencies

Research on LLM code generation confirms that pure functions and immutable data make programs easier to reason about for both humans and LLMs.[^25][^26]

### 5.3 Naming as Context

Self-documenting naming is not merely a style preference in agentic codebases — it is a token efficiency mechanism. When a function is named `calculateTotalOrderValueWithTax` rather than `calc`, an agent can determine its purpose without reading its body or its callers. This directly reduces the number of files the agent must load to complete a task, which reduces context window pressure and context rot risk.[^27]

Recommended conventions:
- Verbs for functions/methods that perform an action (`createOrder`, `validatePayload`, `fetchUserById`)
- Nouns/noun phrases for variables and types (`OrderTotal`, `UserRepository`, `PaymentGateway`)
- Domain ubiquitous language in all names — no abbreviations, no generic names (`data`, `result`, `temp`)
- Port/interface names that encode their role: `UserReadRepository` (outbound, read-only), `OrderCommandHandler` (inbound, write)
- Test file naming that mirrors implementation: `createOrder.service.spec.ts` next to `createOrder.service.ts`

### 5.4 SOLID, CUPID, GRASP, and KISS Through the Agentic Lens

The prior analysis established that **CUPID's gradient properties** (Composable, Unix-like, Predictable, Idiomatic, Domain-based) produce better daily code and collaboration than SOLID applied as rigid rules. This conclusion is reinforced by the agentic coding perspective.

| Principle Set | Agentic Reliability Impact | Token Efficiency Impact |
|---|---|---|
| **SRP** (Single Responsibility) | High: small files, verifiable units | High: fewer tokens per task context |
| **OCP** (Open/Closed) | Medium: port-based extension is agent-friendly | Neutral |
| **LSP** (Liskov) | Medium: type system enforces at compile time | Neutral |
| **ISP** (Interface Segregation) | High: small ports load in small contexts | High: agents load only the port they need |
| **DIP** (Dependency Inversion) | Very High: DI = mockability = Guard Function works | High: DI containers documented in config |
| **CUPID: Composable** | Very High: pure functions compose predictably | High: composable = small, single-purpose |
| **CUPID: Predictable** | Very High: agent can reason about outcomes | High: fewer retries needed |
| **CUPID: Domain-based** | Very High: bounded context alignment | High: agent stays in correct context |
| **KISS** | Very High: LLMs struggle with complex logic | Very High: simple = fewer tokens, fewer errors |
| **DRY** | Medium: carefully applied; over-DRY increases coupling | Medium: less code to load, but abstraction adds layers |
| **YAGNI** | Very High: agents tend to over-engineer | High: prevents speculative generality that adds file load |

KISS and YAGNI are particularly important because agents, when not constrained, systematically over-engineer solutions — adding abstractions, patterns, and generality that are not needed and are expensive to load into context for future modifications.[^28]

### 5.5 Object-Oriented vs Functional vs Railway-Oriented Programming

**OOP with classes** is well-supported by LLMs (dominant in training data) but produces complex lifecycle concerns that require loading entire class hierarchies into context. It remains appropriate for adapters and infrastructure code where object lifecycle is natural (database connection pools, HTTP client instances).

**Functional Programming (pure TypeScript)** produces the most agent-reliable domain code but requires explicit instruction in cursor rules to override the model's imperative bias. Use functional patterns for: data transformations, business rules, validation logic, and domain services.[^24]

**Railway-Oriented Programming** (neverthrow's `Result<T, E>` or Effect-TS Either) is the single most impactful error-handling pattern for agent reliability. An agent generating domain code with `Result` types cannot accidentally throw an exception that escapes the domain boundary — errors are always explicit values in the return type, visible to the type checker and to the Guard Function that validates output. An agent that returns `err(new ValidationError(...))` instead of `throw` is making the error path a verifiable, type-safe datum.

**Reactive Programming** (RxJS) adds significant complexity and non-linear execution flow. Agents trained predominantly on imperative code produce lower-quality RxJS code and are more likely to introduce subscription leaks or incorrect operator chains. Use RxJS only where stream-based data flow is a genuine requirement (e.g., real-time event streams). For most request/response HTTP flows, `async/await` with `Result` types is simpler, more agent-reliable, and produces code that passes Guard Functions more consistently.

### 5.6 Concurrency Model for Node.js

A critical clarification from the prior analysis: Node.js does **not** support thousands of OS threads. The concurrency model is:

| Layer | Mechanism | Agent Coding Convention |
|---|---|---|
| I/O concurrency | Event loop + libuv async I/O | `async/await` everywhere; never block the event loop |
| CPU parallelism | `worker_threads` module | Explicit `Worker` instantiation; keep CPU tasks isolated in worker files |
| Multi-core scaling | `cluster` module / multiple processes | Managed at deployment level (PM2, Kubernetes) |
| Structured concurrency | Effect-TS Fibers (not native) | Wrap concurrent operations in `Effect.all` or `Effect.fork` |
| Green threads / fibers | No native support; Effect-TS only | Use only when adopting full Effect-TS stack |

For agentic coding, `async/await` with explicit error handling is strongly preferred over raw Promises, RxJS, or Effect-TS fibers — it is the most predictable pattern for LLM generation and the easiest to verify in a Guard Function. Effect-TS is appropriate for teams adopting its full ecosystem; it should not be introduced incrementally.

***

## 6. Context Engineering: AGENTS.md, Cursor Rules, and CLAUDE.md

### 6.1 The AGENTS.md Research Finding

A 2026 ETH Zurich study (the most comprehensive empirical analysis of context files to date) produced a counterintuitive finding: LLM-generated context files (the `AGENTS.md` files produced by `/init` commands) **reduced task success rates in 5 of 8 settings** by an average of 0.5–2 percentage points and consistently increased inference costs by 20–23%. The mechanism: agents follow context file instructions closely, which causes them to run more tests, open more files, execute more grep searches, and perform more quality checks than the specific task requires — thorough but wasteful behaviour.[^29][^30]

Human-written context files showed a marginal improvement: approximately 4% average task success increase on AGENTbench, but with the same 19% cost increase. The implication is precise: **context files should contain only information the agent cannot reliably infer from the code itself**.[^31][^29]

### 6.2 Optimal Context File Strategy

| File | Purpose | Target Size | What to Include |
|---|---|---|---|
| Root `AGENTS.md` | Router / architecture map | Under 200 words | Links to sub-documents, domain tags, tech stack summary |
| `.cursor/rules/[domain].mdc` | Auto-attached scoped rules | Under 500 lines per file | Domain-specific conventions, critical invariants |
| `CLAUDE.md` | Claude Code specific | Minimal | Commands, boundaries (never/ask/always), key patterns |
| Feature-level `README.md` | Self-documenting domain context | Short | Ubiquitous language, non-obvious decisions |

The root `AGENTS.md` should function as a router, pointing agents to only the relevant sub-documents for their current task — this manages context window pressure on long-running agentic sessions. Cursor's `.mdc` rules system with auto-attachment (activating rules when matching file patterns are open) is currently the most granular and context-efficient system available, preferred over always-on monolithic rules.[^32][^33][^34]

Critically: **prune context files regularly**. Outdated instructions describing code that no longer exists cause agents to follow ghost conventions, wasting tokens and reducing reliability.[^35][^31]

### 6.3 Spec-Driven Development as Primary Process Discipline

The most impactful process change for agentic coding reliability is **spec-driven development (SDD)**: writing specifications before writing code. The workflow:[^36][^37]

1. **Specify** (`spec.md`): user journeys, experiences, edge cases, acceptance criteria per feature. Given/When/Then acceptance criteria give the agent a concrete "done" target.[^36]
2. **Plan** (`plan.md`): tech stack, architecture decisions, integration constraints. Commit alongside code.
3. **Tasks** (`tasks.md`): small, isolated work items each with acceptance criteria. Each task is implementable and verifiable in isolation.
4. **Implement**: agent tackles tasks one by one; the spec provides the completion target; the Guard Function (tests matching acceptance criteria) provides verification.

Addy Osmani (Google engineering director) describes this as "waterfall in 15 minutes": 40% strategic thinking, 40% AI-ready documentation, 15% execution, 5% quality control. The bottleneck in agent-assisted development shifts from "can we generate code fast enough?" to "do we know clearly enough what we want?".[^38][^39][^36]

### 6.4 Atomic Tasks and Commit Discipline

Agent tasks should be scoped to single, atomic changes — the equivalent of a small, focused PR a human engineer would submit for review. Key practices:[^40]
- One task = one logical change = one commit
- Commits as save points (rollback is the recovery mechanism when agents drift)[^40]
- Never commit agent-generated code you cannot explain or defend — you remain the author[^41]
- Review agent output with parallel AI review (different models catch different issues)[^38]

***

## 7. The Dual-State Agentic Code Loop

Combining all above practices, the optimal agentic code loop for a TypeScript/Node.js backend is:

```
1. Spec          → spec.md with acceptance criteria
2. Plan          → plan.md with architecture decisions
3. Task          → atomic task with AC, scoped to one VSA feature slice
4. Generate      → agent generates code in isolated feature folder
5. Guard: Syntax → tsc --noEmit (type check as syntax guard)
6. Guard: Lint   → ESLint (no-any, architecture rules, naming)  
7. Guard: Unit   → Vitest unit tests matching acceptance criteria
8. Guard: Integ  → Testcontainers integration test (if port adapter)
9. Pass → Commit  | Fail → Agent receives guard error trace, retries
```

This loop implements the Atomic Action Pairs pattern — generation and verification are inseparable. Each guard failure provides specific, structured feedback that the agent can use to self-correct without human intervention. Research validates that this pattern achieves up to 66 percentage point improvement in success rates at 1.2–2.1× computational cost.[^8]

***

## 8. Comparative Analysis: Original Plan vs Agentic Coding Findings

The 12-phase plan described in the prior session is architecturally sound. The following table shows where each phase is reinforced, requires modification, or needs new additions based on agentic coding research.

| Plan Phase | Status | Agentic Coding Finding |
|---|---|---|
| Phase 1: Monorepo + Config | **Reinforced** | Monorepos are architecturally necessary for agentic AI, not just developer convenience[^9][^10] |
| Phase 2: TypeScript toolchain | **Reinforced + Expand** | Add `no-explicit-any`, architecture lint rules (Nx module boundary), Guard Function CI gates |
| Phase 3: Clean Architecture | **Upgrade** | Specify Hexagonal outer + VSA inner; explicit port interfaces; DDD bounded context per package |
| Phase 4: Redis Architecture | **Unchanged** | Redis adapter lives in `infrastructure/`, behind a domain port — hexagonal protects domain |
| Phase 5: API Design (tRPC) | **Reinforced** | tRPC's TypeScript-first inference is maximally agent-reliable; Zod schema-first validation mandatory |
| Phase 6: Database Layer | **Add schema-first** | Drizzle/Prisma schemas are domain contracts; agent generates migrations from schema, not reverse |
| Phase 7: Resilience | **Add Atomic Action Pairs** | Retry/circuit breaker logic should use Guard Functions with typed Result returns |
| Phase 8: Observability | **Add agent context** | Trace IDs propagated through structured logging enable agent debugging sessions |
| Phase 9: Testing | **Expand guard loop** | Tests are Guard Functions; Vitest + Testcontainers tests must run per-task before commit |
| Phase 10: Security | **Add linting guards** | Architecture lint (no direct infra import in domain) + Trivy as pre-commit guard |
| Phase 11: CI/CD | **Add SDD workflow** | spec.md → plan.md → tasks.md checked into repo; CI validates task acceptance criteria |
| Phase 12: IaC | **Unchanged** | Pulumi TS IaC benefits from same type discipline; schema-first for cloud resource configs |
| **New: Phase 0** | **Add** | Spec-Driven Development process setup before Phase 1; AGENTS.md/cursor rules architecture |

### Critical Additions to the Plan

**Error handling strategy** (currently absent): Three-tier error handling with `neverthrow` for domain (typed Result), try/catch at HTTP boundary (adapter), Effect-TS optionally for infrastructure retry/circuit breaker logic.

**Guard Function CI pipeline** (partial in Phase 9): Every task in the agentic loop must have a Guard Function chain (tsc → eslint → vitest) that runs before commit. This is the mechanical implementation of the Atomic Action Pair pattern.

**Context engineering setup** (currently absent): An explicit phase for creating the context file architecture (`AGENTS.md` router, scoped `.cursor/rules/*.mdc` files, `CLAUDE.md`). This should happen in Phase 1 alongside monorepo setup.

**Spec-Driven Development workflow** (currently absent): PRD/spec format, `spec.md` template, task decomposition workflow — the process layer above the technical implementation.

***

## 9. Summary: The Hierarchy of Agentic Coding Conventions

Ranked by empirical impact on both reliability and token efficiency:

1. **Small files + co-location (VSA)** — most direct impact on context rot and token budget
2. **Strict TypeScript + Zod schema-first** — eliminates entire classes of runtime hallucinations
3. **Hexagonal outer + VSA inner architecture** — hard architectural guards that catch agent violations mechanically
4. **Atomic Action Pairs (Guard Functions in CI)** — turns stochastic generation into reliable iteration
5. **Spec-Driven Development** — addresses the upstream clarity problem; agents fail on ambiguous specs
6. **Minimal, human-written, topic-scoped context files** — more is not better; precision wins
7. **Pure functions in domain core** — maximally verifiable, maximally composable
8. **Railway-Oriented error handling (Result types)** — errors are type-safe, guard-verifiable data
9. **Programmatic tool calling (code actions over JSON tools)** — 98.7% token reduction for tool-heavy workflows
10. **Monorepo with project graph + domain tags** — provides the architecture map agents need without file reads

---

## References

1. [Going Beyond the Context Window: Recursive Language Models in ...](https://towardsdatascience.com/going-beyond-the-context-window-recursive-language-models-in-action/) - Instead, the LLM writes Python code to programmatically inspect, decompose, and recursively invoke s...

2. [Context Rot: How Increasing Input Tokens Impacts LLM Performance](https://research.trychroma.com/context-rot) - Lower similarity needle-question pairs increases the rate of performance degradation. Distractors ha...

3. [The Definitive 2025 Guide to Mastering AI System Design - FlowHunt](https://www.flowhunt.io/blog/context-engineering/) - This demonstrates that context rot degrades both retrieval and reasoning in actual dialogue settings...

4. [Context Length Guide 2025: Master AI Context Windows ...](https://local-ai-zone.github.io/guides/context-length-optimization-ultimate-guide-2025.html) - Code Examples: Simple function (10 lines) = approximately 150-200 tokens; Medium script (50 lines) =...

5. [Autellix: An Efficient Serving Engine for LLM Agents as General Programs](https://arxiv.org/pdf/2502.13965.pdf) - Large language model (LLM) applications are evolving beyond simple chatbots
into dynamic, general-pu...

6. [Code execution with MCP: building more efficient AI agents - Anthropic](https://www.anthropic.com/engineering/code-execution-with-mcp) - Intermediate tool results consume additional tokens. Most MCP clients allow models to directly call ...

7. [Agentic AI Architecture: A Theoretical Blueprint for ...](https://www.linkedin.com/posts/georgepolzer_the-agentic-ai-integration-paradox-activity-7434624727681277952-O8VC) - The Agentic AI "Integration Paradox" LLMs generate stochastic prose, but production systems demand d...

8. [Contents - arXiv](https://arxiv.org/html/2512.20660v1) - Atomic Action Pairs couple generation with verification as indivisible transactions, where Guard Fun...

9. [AI & Monorepos](https://monorepo.tools/ai) - Monorepos provide AI agents with a unified workspace view , enabling better dependency tracing and c...

10. [Will AI turn 2026 into the year of the monorepo?](https://www.spectrocloud.com/blog/will-ai-turn-2026-into-the-year-of-the-monorepo) - Monorepo or polyrepo in the age of AI? Learn about the pros and cons of both and why monorepos are b...

11. [If every file in your codebase is 1000+ lines long… don't be ...](https://www.reddit.com/r/vibecoding/comments/1mi6guu/if_every_file_in_your_codebase_is_1000_lines_long/) - Some people just let AI run wild building full projects, 50+ files, components with 1,000+ lines of ...

12. [A Structured Workflow for "Vibe Coding" Full-Stack Apps](https://dev.to/wasp/a-structured-workflow-for-vibe-coding-full-stack-apps-352l) - After completing a significant phase or feature slice defined in our Plan, I made it a habit to task...

13. [Hierarchical Context Pruning: Optimizing Real-World Code Completion with
  Repository-Level Pretrained Code LLMs](https://arxiv.org/pdf/2406.18294.pdf) - ...simply
concatenating the entire code repository often exceeds the context window
limits of these ...

14. [Type-constrained code generation with language models](https://news.ycombinator.com/item?id=43978357) - I completely agree that TypeScript is ideal for LLMs. The type system and the extensive training dat...

15. [Zod: TypeScript-first schema validation with static type inference](https://news.ycombinator.com/item?id=41764163) - Data and Schema fit into the ecosystem perfectly, making it really easy to compose very resilient, s...

16. [Implementing structured outputs as a feature for any LLM - inferable.ai](https://www.inferable.ai/blog/posts/llm-json-parser-structured-output) - Learn how to build reliable JSON parsing for LLMs using Zod schemas and recursive retries. A practic...

17. [Read This Before Building AI Agents: Lessons From The ...](https://dev.to/isaachagoel/read-this-before-building-ai-agents-lessons-from-the-trenches-333i) - What is an AI Agent? An AI agent orchestrates multiple LLM calls to make decisions, use tools, and a...

18. [Learning to Generate Structured Output with Schema Reinforcement ...](https://aclanthology.org/2025.acl-long.243/) - Abstract. This study investigates the structured generation capabilities of large language models (L...

19. [aiXcoder-7B: A Lightweight and Effective Large Language Model for Code Processing](https://www.semanticscholar.org/paper/6c42b31f7b9de8f8380da80ca9ccf56276da621a) - Large Language Models (LLMs) have been widely used in code completion, and researchers are focusing ...

20. [“Ports & Adapters for AI” — Why Hexagonal Architecture Still Wins in ...](https://www.linkedin.com/pulse/ports-adapters-ai-why-hexagonal-architecture-still-wins-varun-singh-l9owe) - “Ports & Adapters for AI” — Why Hexagonal Architecture Still Wins in the LLM Stack · Varun Singh · ⚙...

21. [Quantitative Analysis of Technical Debt and Pattern Violation ... - arXiv](https://arxiv.org/html/2512.04273v1) - Hexagonal Architecture (Ports and Adapters) mandates that the Domain Layer must have no outside depe...

22. [DDD-Enforcer: An AI-Powered Multi-Agent System for Real-Time Domain-Driven Design Enforcement](https://ieeexplore.ieee.org/document/11418529/) - Domain Model Degradation increases architectural technical debt by violating ubiquitous language and...

23. [From “Prompt Spaghetti” to Bounded Contexts: DDD for Agentic ...](https://vibekode.it/agentic-engineering/ddd-agentic-codebase-architecture) - This presentation shows how Domain-Driven Design (DDD) turns agentic coding from “prompt spaghetti” ...

24. [Perish or Flourish? A Holistic Evaluation of Large Language Models ...](https://arxiv.org/html/2601.02060v1) - We present the first empirical evaluation of LLMs for functional programming code generation, system...

25. [How will AI change programming languages? | Christopher Walton](https://www.linkedin.com/posts/christopherwalton_ai-programming-specification-activity-7403163765078188032-13qV) - Key Characteristics: - Focuses on what, not how. - Uses immutable data and pure functions. - Avoids ...

26. [Vibe Coding: Toward an AI‑Native Paradigm for Semantic and Intent ...](https://arxiv.org/html/2510.17842v1) - Functional programming emphasizes pure functions and immutable data, aiming to make programs easier ...

27. [General guidelines and best practices for AI code generation](https://gist.github.com/juanpabloaj/d95233b74203d8a7e586723f14d3fb0e) - 4. Comments and Documentation · Write comments to explain the "why" (intent, design decisions, non-o...

28. [Unveiling Inefficiencies in LLM-Generated Code: Toward a Comprehensive
  Taxonomy](http://arxiv.org/pdf/2503.06327.pdf) - Large Language Models (LLMs) are widely adopted for automated code generation
with promising results...

29. [New Research Reassesses the Value of AGENTS.md Files ...](https://www.infoq.com/news/2026/03/agents-context-file-value-review/) - The researchers found that LLM-generated context files degrade performance, actually reducing the ta...

30. [When AGENTS.md Backfires: What a New Study Says About ...](https://notchrisgroves.com/when-agents-md-backfires/) - A new ETH Zurich study finds that LLM-generated context files reduce task success rates and raise in...

31. [Large AGENTS.md Files Hurt AI Agent Performance by 20%](https://www.linkedin.com/posts/autonomyio_evaluating-agentsmd-are-repository-level-activity-7436682845722492928-X8-o) - The study found that large AGENTS.md files can reduce agent performance and increase costs by about ...

32. [Steering AI Agents in Monorepos with AGENTS.md](https://dev.to/datadog-frontend-dev/steering-ai-agents-in-monorepos-with-agentsmd-13g0) - A good baseline of steering documents makes AI more predictable and reliable. Hinting it to follow y...

33. [CLAUDE.md, AGENTS.md, and Every AI Config File Explained](https://www.deployhq.com/blog/ai-coding-config-files-guide) - Every AI coding tool now reads a configuration file from your project. Claude Code looks for CLAUDE....

34. [Some notes on AI Agent Rule / Instruction / Context files / etc · GitHub](https://gist.github.com/0xdevalias/f40bc5a6f84c4c5ad862e314894b2fa6) - Claude Code is an agentic coding assistant that automatically pulls context into prompts. This conte...

35. [Setting Up Cursor Rules for Consistent AI Behavior](https://stevekinney.com/courses/ai-development/cursor-rules) - Configure project and user-level rules to enforce coding standards and guide AI behavior in Cursor.

36. [Spec-Driven Development and Agentic Coding | The Data Column](https://vishalgandhi.in/spec-driven-development/) - I spent a lot of months during 2025 doing what most engineers were doing: throwing prompts at Claude...

37. [How to write a good spec for AI agents - Elevate | Addy Osmani](https://addyo.substack.com/p/how-to-write-a-good-spec-for-ai-agents) - The key is to write smart specs: documents that guide the agent clearly, stay within practical conte...

38. [5 AI Coding Best Practices from a Google AI Director (That ...](https://hamy.xyz/blog/2026-01_ai-engineering-best-practices) - Osmani's first principle: create a spec before writing any code. He calls it "waterfall in 15 minute...

39. ["My AI coding workflow in 2026" | Addy Osmani](https://www.linkedin.com/posts/addyosmani_ai-programming-softwareengineering-activity-7420197342873735168-xmGX) - LLM Coding Workflow Best Practices · How to Make LLM Output More Human-Like · How Llms Improve Codin...

40. [My LLM coding workflow going into 2026](https://app.daily.dev/posts/my-llm-coding-workflow-going-into-2026-vi9oycjke) - A comprehensive guide to using LLM coding assistants effectively in 2026. Key practices include star...

41. [10 tips for writing software with LLM agents](https://liveandletlearn.net/post/10-tips-writing-software-llm-agents/) - My LLM agent-based setup · 1: OWN the code change · 2: Make the most of the opportunity to learn eff...

