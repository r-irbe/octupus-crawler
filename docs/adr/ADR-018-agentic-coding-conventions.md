# ADR-018: Agentic Coding Conventions

| Field | Value |
| --- | --- |
| **Status** | Accepted |
| **Date** | 2026-03-25 |
| **Deciders** | Architecture Council |
| **Relates to** | ADR-001, ADR-007, ADR-012, ADR-013, ADR-015, ADR-016, ADR-019, ADR-020 |

## Context

AI agents are first-class codebase contributors. LLM performance degrades non-linearly with context length ("context rot"), token budgets are an architecture constraint, and stochastic generation requires deterministic verification. See [research/ai_coding.md](../research/ai_coding.md) and [research/collapse.md](../research/collapse.md).

## Decision Drivers

Agent reliability, token efficiency, deterministic verification, human-agent parity, minimal context files.

## Decision

### 1. Context Rot Mitigation

Effective context length is ≤50% of claimed window before degradation (NoLiMa: 10/12 models drop <50% at 32K). The attention basin (arXiv 2508.05128) concentrates attention at context edges; the context cliff (arXiv 2601.14123) sets practical threshold at ~2,500 tokens.

- **File size**: ≤200 lines target, 300 hard limit — split along feature/responsibility
- **Co-location**: All feature code (handler, service, types, schema, tests) in same directory (VSA, ADR-015)
- **Direct imports**: No `index.ts` barrel re-exports — preserve dependency topology
- **Self-documenting names**: `calculateTotalOrderValueWithTax` not `calc`

### 2. Atomic Action Pairs (Guard Functions)

Stochastic generation + deterministic verification as inseparable transaction. Up to +66pp success at 1.2–2.1× cost (arXiv 2512.20660).

Chain: `tsc --noEmit` → `eslint --max-warnings 0` → `vitest run` → Pass → Commit | Fail → retry (max 3 total) → escalate.

Implemented as pre-commit hooks (Husky), CI gates (GitHub Actions), and agent self-check.

### 3. Spec-Driven Development

Bottleneck shifts from generation speed to specification clarity. Full SDD methodology in **[ADR-020](ADR-020-spec-driven-development.md)**: EARS syntax, three-document structure, contract-first API, property tests, formal methods.

Workflow: `requirements.md` → `design.md` → `tasks.md` → implement one task at a time; Guard Functions verify.

### 4. Context Engineering

ETH Zurich 2026: LLM-generated context files reduce success in 5/8 settings (-0.5–2%, +20–23% cost). Human-written: +4%, +19% cost.

| File | Target Size | Content |
| --- | --- | --- |
| `AGENTS.md` | ~200 lines | Package layout, coding rules, naming, commands, ADR routing |
| `CLAUDE.md` | < 200 lines | Claude-specific extensions |
| `copilot-instructions.md` | < 100 lines | Copilot-specific guidance |
| `docs/agents/*.md` | As needed | Agent definitions |
| State tracker | < 80 lines | Task queue, current state, decisions — re-read before every task |

Hygiene: prune ghost conventions, AGENTS.md is canonical, tool-specific files extend (not duplicate), human-written over LLM-generated.

### 5. Token Budget as Architecture Constraint

| Source | Tokens | Optimization |
| --- | --- | --- |
| 500-line file | ~10K | Split to ≤200 lines (~4K) |
| 50-line file | ~1K | Ideal for agent context |
| Static tool defs | Up to 150K | MCP on-demand (98.7% reduction) |

### 6. Stochastic–Deterministic Boundary

Stochastic zone (agent generates) → Zod schema validation (bridge, ADR-013) → deterministic zone (domain logic). Maps to Hexagonal Architecture (ADR-015): domain core is deterministic; adapters validated at ports.

### 7. Atomic Tasks and Commit Discipline

One task = one logical change = one commit. Commits are save points for rollback. Max 3 total attempts per Guard Function failure before escalating.

### 8–10. Schema-First, Explicit Types, Pure Functions

- **Schema-first**: Zod schema before handler; `z.infer<>` for types; schema IS the contract
- **Explicit types**: Annotate all params/returns; prefer `interface`; avoid complex conditional types
- **Pure functions**: Verifiable (known inputs→outputs), composable, token-efficient. Stateful classes avoided in domain core

### 11. Context Collapse Prevention

Ten failure modes documented in [ADR-021](ADR-021-context-collapse-prevention.md). Five-layer prevention: budget governance, positional anti-bias, compression (state tracker), persona anchoring, memory governance.

Key findings: persona drift is worse in larger models (Anthropic+Oxford 2026); safety destabilizes at 200K tokens; OWASP ASI-06 (memory poisoning) is an active threat.

### 12. Enforcement Protocol

Descriptive instructions are insufficient — agents skip process steps unless hard gates prevent progress. See [post-mortem](../worklogs/2026-03-25-implementation-postmortem.md).

- **Pre-flight (G1–G4)**: Plan → Branch → Spec → State tracker. No code until satisfied
- **Per-task (G5–G7)**: Guard Functions → Commit → State update. Re-read state before next task
- **Completion (G8–G10)**: Review → Worklog → Report to user

Agent delegation: >1 package → separate subagents for implementation, testing, review. Single agent implementing AND reviewing is a protocol violation.

Violation: gate unsatisfiable after 3 attempts → STOP → escalate with full context. MUST rules violated → STOP → explain conflict.

## Consequences

**Positive**: Guard Functions enable reliable iteration (+66pp); file size limits reduce context rot; SDD shifts effort to highest-leverage activity; schema-first eliminates runtime-only failures.
**Negative**: 200-line limit increases file count; SDD adds upfront docs; Guard Function loop adds 1.2–2.1× cost.
**Risks**: File limit may challenge complex algorithms (mitigated: composed functions); spec quality bounds agent output.

## Evidence

Context rot: 300-token focused > 113k full (Chroma 2025). Attention basin: primacy bias (arXiv 2508.05128). NoLiMa: 50% perf at 32K. Safety: GPT-4.1-nano 40% refusal spike at 200K (arXiv 2512.02445). Persona drift: larger models drift more (Anthropic+Oxford 2026). ACE: +10.6% (Stanford, arXiv 2510.04618). HiAgent: 35% reduction (ACL 2025). InfiniteICL: 90% reduction at 103% baseline (ACL 2025). Atomic pairs: +66pp (arXiv 2512.20660). ETH context files: -0.5–2% for LLM-generated (2026). DDD-Enforcer: 100% detection (IEEE 2026). MCP: 98.7% token reduction (Anthropic 2026). OWASP ASI Top 10 (Dec 2025). MASFT: 14 failure modes. AMBIG-SWE: silent progress 48.8%→28% (ICLR 2026). Generation-then-Comprehension: 86% vs 50% delegation.

## Validation

- Avg file size <200 lines (CI measured)
- Guard pass rate >80% first attempt
- Every feature task has Given/When/Then
- Context files: AGENTS.md <200, CLAUDE.md <200, copilot-instructions.md <100
- Zero `any` in domain code (ESLint)
- Task completion >90% within 3 attempts

## Related

- [ADR-001](ADR-001-monorepo-tooling.md), [ADR-007](ADR-007-testing-strategy.md), [ADR-012](ADR-012-ci-cd-pipeline.md), [ADR-013](ADR-013-configuration-management.md)
- [ADR-015](ADR-015-application-architecture-patterns.md), [ADR-016](ADR-016-coding-standards-principles.md), [ADR-019](ADR-019-ideation-decision-protocols.md)
- [ADR-020](ADR-020-spec-driven-development.md), [ADR-021](ADR-021-context-collapse-prevention.md)
- [research/collapse.md](../research/collapse.md), [research/ai_coding.md](../research/ai_coding.md)
