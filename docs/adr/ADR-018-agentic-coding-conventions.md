# ADR-018: Agentic Coding Conventions

| Field | Value |
| --- | --- |
| **Status** | Accepted |
| **Date** | 2026-03-25 |
| **Deciders** | Architecture Council |
| **Relates to** | ADR-001, ADR-007, ADR-012, ADR-013, ADR-015, ADR-016, ADR-019, ADR-020 |

## Context

AI agents (Claude Code, GitHub Copilot, and custom agents defined in `docs/agents/`) are first-class contributors to this codebase. Empirical research (2025–2026) demonstrates that LLM performance degrades non-linearly with context length ("context rot"), that token budgets are an architecture constraint, and that stochastic LLM generation requires deterministic verification gates to produce reliable outcomes. The project needs explicit conventions that optimize for both human readability and AI agent reliability.

Research into agentic coding practices (see [docs/research/ai_coding.md](../research/ai_coding.md)) evaluated context rot, token efficiency, Guard Functions, Atomic Action Pairs, spec-driven development, and context engineering strategies including AGENTS.md, CLAUDE.md, and tool-specific instruction files.

## Decision Drivers

- Agent reliability: reduce hallucinations and context rot
- Token efficiency: minimize tokens consumed per task
- Deterministic verification: every generation step must be verifiable
- Human-agent parity: conventions that benefit both audiences
- Minimal context files: precision over volume in agent instructions

## Decision

### 1. Context Rot Mitigation

LLMs experience measurable performance degradation as input context grows, even on trivially simple tasks. Models given focused 300-token contexts outperform the same models given 113k-token full conversations. The practical implication: **effective context length is 50% or less of claimed context window before degradation is measurable**.

Conventions to mitigate context rot:

- **File size target**: Implementation files under 200–300 lines. Files exceeding 300 lines must be split along feature or responsibility boundaries
- **Co-location**: All code for a feature (handler, service, types, schema, tests) lives in the same directory (VSA from ADR-015)
- **Explicit imports over barrel files**: `index.ts` barrel re-exports hide structure from agent file-traversal reasoning; use direct imports to preserve dependency topology
- **Self-documenting names**: `calculateTotalOrderValueWithTax` over `calc` — agents determine purpose without reading function bodies, reducing files loaded per task

### 2. Atomic Action Pairs (Guard Functions)

The Dual-State Solution Space framework separates stochastic LLM generation from deterministic control flow. Every code generation step is paired with a verification step as an inseparable transaction — an **Atomic Action Pair**. Research validates up to 66 percentage point improvement in task success rates at 1.2–2.1× computational cost.

The Guard Function chain for every task:

```text
1. Generate   → Agent produces code in isolated feature folder
2. Guard: tsc → tsc --noEmit (type check as syntax guard)
3. Guard: ESLint → eslint --max-warnings 0 (style + architecture rules)
4. Guard: Unit → vitest run (unit tests matching acceptance criteria)
5. Guard: Integration → vitest run --project integration (if port/adapter)
6. Pass → Commit | Fail → Agent receives guard error trace, retries (max 3 total attempts)
```

Guard Functions are implemented as:
- **Pre-commit hooks** (Husky + lint-staged): tsc, ESLint, gitleaks
- **CI pipeline gates** (GitHub Actions): full test suite, coverage, ADR compliance
- **Agent self-check**: agents run `tsc --noEmit` and `vitest run` before declaring task complete

### 3. Spec-Driven Development (SDD)

The most impactful process change for agentic coding reliability. The bottleneck shifts from code generation speed to specification clarity. For the comprehensive SDD methodology — EARS requirements syntax, three-document structure, specification hierarchy, contract-first API development, property-based test derivation, evidence-driven quality gates, and formal methods tier — see **[ADR-020: Spec-Driven Development](ADR-020-spec-driven-development.md)**.

Workflow:

```text
1. spec.md   → User journeys, edge cases, Given/When/Then acceptance criteria
2. plan.md   → Architecture decisions, integration constraints, ADR references
3. tasks.md  → Small isolated work items, each with acceptance criteria
4. Implement → Agent tackles one task at a time; spec provides completion target;
               Guard Functions provide verification
```

File locations:
- Feature-level specs: `apps/<service>/src/features/<feature>/spec.md`
- Cross-cutting specs: `docs/specs/<topic>.md`
- Task tracking: `docs/specs/<topic>.tasks.md`

SDD conventions:
- 40% strategic thinking, 40% AI-ready documentation, 15% execution, 5% quality control
- Given/When/Then acceptance criteria are mandatory for every feature task
- Specs are committed alongside code — they ARE documentation
- Agents must read the spec before starting any implementation task

### 4. Context Engineering

ETH Zurich research (2026) found that LLM-generated context files **reduce task success rates** in 5 of 8 settings by 0.5–2% while increasing inference costs by 20–23%. Human-written context files show marginal improvement (~4%) with the same 19% cost increase. The implication: **context files should contain only information the agent cannot reliably infer from the code itself**.

| File | Purpose | Target Size | Content |
| --- | --- | --- | --- |
| `AGENTS.md` (root) | Canonical AI instructions (tool-agnostic) | < 200 lines | Package layout, coding rules, naming, commands, ADR routing |
| `CLAUDE.md` (root) | Claude Code-specific extensions | < 200 lines | Agent framework, orchestration, workflows, automation routing |
| `.github/copilot-instructions.md` | GitHub Copilot-specific extensions | < 100 lines | Code completion, chat, PR, test generation guidance |
| Feature-level `README.md` | Self-documenting domain context | < 100 lines | Ubiquitous language, non-obvious decisions |
| `docs/agents/*.md` | Agent definitions | As needed | Capabilities, skills, escalation rules |

Context file hygiene:
- **Prune regularly**: Outdated instructions describing removed code cause agents to follow ghost conventions
- **AGENTS.md as canonical source**: Tool-agnostic rules that all AI coding tools share; tool-specific files extend it
- **Tool-specific files reference, not duplicate**: CLAUDE.md and copilot-instructions.md add only tool-specific capabilities
- **No redundant information**: If the code, types, or tests already express a convention, do not repeat it in a context file

### 5. Token Budget as Architecture Constraint

Token consumption is a first-class architecture metric:

| Source | Token Cost | Optimization |
| --- | --- | --- |
| 500-line source file | ~9,000–10,000 tokens | Split to ≤200 lines (~3,500–4,000 tokens) |
| 50-line source file | ~900–1,000 tokens | Ideal for agent task context |
| Static tool definitions | Up to 150k tokens | Load on demand (MCP pattern: 2k tokens, 98.7% reduction) |
| Barrel `index.ts` re-exports | Hidden structure cost | Use direct imports |

Architectural decisions that affect token budget:
- **File granularity**: Single responsibility per file, targeting ≤200 lines
- **Function scope**: Pure functions with explicit types load in small contexts
- **Naming**: Domain ubiquitous language names eliminate need to read function bodies
- **Interface segregation**: Small port interfaces load only what agents need

### 6. Stochastic–Deterministic Boundary

Production agentic systems formally separate stochastic LLM generation from deterministic control flow:

- **Stochastic zone**: Agent generates code, proposes changes, drafts documentation
- **Deterministic zone**: Type checker, linter, tests, schema validation, CI pipeline
- **Bridge**: Zod schemas (ADR-013) validate at the boundary — agent-generated data must pass schema validation before entering deterministic domain logic

This maps directly to the Hexagonal Architecture (ADR-015): the domain core is deterministic; adapters (including AI agent output) are validated at ports.

### 7. Atomic Tasks and Commit Discipline

Agent tasks must be scoped to single, atomic changes:

- One task = one logical change = one commit
- Commits as save points — rollback is the recovery mechanism when agents drift
- Agent-generated code must be explainable and defensible by the human author
- Maximum 3 total attempts per Guard Function failure before escalating to user (1 initial + 2 retries)

### 8. Schema-First as Agent Reliability Pattern

Zod/TypeBox schemas provide compile-time TypeScript type inference AND runtime validation simultaneously, eliminating hallucinations where agents generate code that compiles but fails at runtime boundaries:

- Define schemas for every API request/response boundary
- Use `z.infer<typeof Schema>` to derive types (never write types separately)
- Validate all structured LLM output against Zod schemas before use
- The schema IS the contract between stochastic generation and deterministic domain logic

### 9. Explicit Types Over Inferred

TypeScript's type inference is a developer convenience but an agent reliability liability when type information must be reconstructed from implicit chains:

- Always annotate function parameters and return types explicitly
- Prefer `interface` over `type` for public API shapes
- Avoid complex conditional types in public interfaces (increases probability of LLM fallback to `any`)
- Use discriminated unions with literal `_tag` fields for variant types

### 10. Pure Functions as Agent Primitives

Pure functions are the ideal unit of agent-generated code:

- **Verifiable**: Guard Function invokes with known inputs, asserts outputs, no mocking needed
- **Composable**: Small pure functions compose without implicit coupling
- **Token-efficient**: Complete specification fits in a small context window
- Stateful classes with complex lifecycle require loading entire hierarchies — avoid in domain core

## Consequences

### Positive

- Guard Functions turn stochastic generation into reliable iteration (up to +66pp success rate)
- File size constraints directly reduce context rot and token waste
- Spec-driven development shifts the bottleneck to the highest-leverage activity (specification clarity)
- Minimal context files avoid the 20% cost increase from verbose context
- Schema-first eliminates an entire class of runtime-only agent failures
- Atomic tasks with commit discipline make agent drift recoverable

### Negative

- 200-line file limit increases file count (more files to navigate)
- Spec-driven development adds upfront documentation work
- Guard Function CI loop adds 1.2–2.1× computational cost per task
- Context file pruning requires ongoing maintenance discipline

### Risks

- Developers may resist 200-line file limit for complex algorithms (mitigated: split across composed functions)
- Spec quality directly bounds agent output quality — poor specs produce poor code
- Guard Function retries can loop on fundamentally incorrect approaches (mitigated: max 3 total attempts then escalate)

## Evidence

- Context rot: models at 300-token focused context outperform same models at 113k tokens (Chroma Research 2025)
- Atomic Action Pairs: +66pp task success rate at 1.2–2.1× cost (arXiv 2512.20660)
- LLM-generated context files: -0.5–2% success rate, +20–23% cost (ETH Zurich 2026, InfoQ)
- Human-written context files: +4% success rate, +19% cost (ETH Zurich 2026)
- Type-constrained decoding: TypeScript strict types narrow valid generation space, reducing hallucinations
- DDD-Enforcer: 100% detection accuracy across 15 violation cases (IEEE 2026)
- File size: 500 lines ≈ 9,000–10,000 tokens; 50 lines ≈ 900–1,000 tokens
- MCP code execution pattern: 98.7% token reduction for tool-heavy workflows (Anthropic 2026)

## Validation

- Average implementation file size < 200 lines (measured via CI)
- Guard Function pass rate > 80% on first attempt (agent self-check before commit)
- Spec coverage: every feature task has Given/When/Then acceptance criteria
- Context file total size: AGENTS.md < 200 lines, CLAUDE.md < 200 lines, copilot-instructions.md < 100 lines
- Zero `any` type annotations in domain code (ESLint enforced)
- Agent task completion rate > 90% within 3 total Guard Function attempts

## Related

- [ADR-001: Monorepo Tooling](ADR-001-monorepo-tooling.md) — Monorepo as agentic foundation, file structure
- [ADR-007: Testing Strategy](ADR-007-testing-strategy.md) — Tests as Guard Functions
- [ADR-012: CI/CD Pipeline](ADR-012-ci-cd-pipeline.md) — Guard Function CI gates
- [ADR-013: Configuration Management](ADR-013-configuration-management.md) — Zod schema-first as agent reliability pattern
- [ADR-015: Application Architecture](ADR-015-application-architecture-patterns.md) — Hex+VSA as agent task boundaries
- [ADR-016: Coding Standards](ADR-016-coding-standards-principles.md) — Pure functions, explicit types, naming as context
- [ADR-019: Ideation & Decision Protocols](ADR-019-ideation-decision-protocols.md) — Anti-sycophancy, reasoning frameworks, structured ideation, human–AI collaboration
- [ADR-020: Spec-Driven Development](ADR-020-spec-driven-development.md) — Comprehensive SDD methodology extending §3: EARS syntax, three-document structure, quality gates, formal methods

---

> **Provenance**: Created 2026-03-25 from analysis of [docs/research/ai_coding.md](../research/ai_coding.md). Synthesizes empirical agentic coding research into enforceable project conventions. Updated 2026-03-25: removed Cursor references, clarified retry semantics (3 total attempts), harmonized with automation/skills/instruction docs. Added ADR-019/020 cross-references.
