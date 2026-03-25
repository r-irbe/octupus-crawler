# ADR-020: Spec-Driven Development

| Field | Value |
| --- | --- |
| **Status** | Accepted |
| **Date** | 2026-03-25 |
| **Deciders** | Architecture Council |
| **Relates to** | ADR-007, ADR-011, ADR-014, ADR-016, ADR-017, ADR-018, ADR-019 |

## Context

ADR-018 §3 introduced Spec-Driven Development (SDD) as a process for agentic coding, establishing the `spec.md → plan.md → tasks.md → implement` workflow. However, the broader SDD methodology — covering specification levels, EARS requirements syntax, formal methods tiers, contract-first API development, evidence-driven quality gates, property-based test derivation, and human-AI collaboration models — was not codified.

Research into SDD practices (see [docs/research/spec.md](../research/spec.md)) evaluated the full SDD landscape: Martin Fowler's three-level taxonomy (spec-first, spec-anchored, spec-as-source), EARS structured requirements, tooling (Kiro, GitHub Spec Kit, BMAD Method), quality gate frameworks, property-based testing integration, formal methods tiers, contract-first API design, agent runtime constraints, and human-AI collaboration patterns.

This ADR establishes the comprehensive SDD methodology for IPF, extending ADR-018 §3 with the full specification hierarchy, requirement syntax standards, quality gate integration, and formal methods tier.

## Decision Drivers

- AI agents require structured specifications to ground generation and prevent hallucination
- EARS requirements syntax enables formal reasoning and property-based test derivation
- Contract-first API design prevents the 47% backward-compatibility failure rate
- Specification drift between specs and code causes silent quality degradation
- Evidence-driven quality gates provide measurable release confidence
- Formal methods are justified for critical algorithms (rate limiting, distributed locking, circuit breaker math)

## Decision

### 1. Specification Level: Spec-Anchored

IPF adopts the **spec-anchored** level from Martin Fowler's taxonomy: specifications are maintained throughout the feature lifecycle; changes start in the spec, and code is updated accordingly. Specs are committed alongside code in git.

| Level | IPF Adoption |
| --- | --- |
| Spec-first | Used for spikes and throwaway prototypes only |
| **Spec-anchored** | **Default for all features and cross-cutting concerns** |
| Spec-as-source | Not adopted (insufficient tooling maturity in 2026) |

### 2. EARS Requirements Syntax

All feature requirements use **EARS (Easy Approach to Requirements Syntax)** — the structured natural-language format that eliminates ambiguity, enables formal reasoning, and supports direct property-based test generation.

The five EARS patterns:

| Pattern | Keyword | Template | Example |
| --- | --- | --- | --- |
| Ubiquitous | (none) | `The <system> shall <response>` | The API shall return JSON responses |
| Event-driven | When | `When <trigger>, the <system> shall <response>` | When a request exceeds rate limit, the system shall return 429 |
| State-driven | While | `While <state>, the <system> shall <response>` | While circuit breaker is OPEN, the system shall return cached data |
| Unwanted behaviour | If/Then | `If <trigger>, then the <system> shall <response>` | If upstream timeout occurs, then the system shall enqueue for retry |
| Optional feature | Where | `Where <feature>, the <system> shall <response>` | Where tracing is enabled, the system shall emit OTel spans |

EARS requirements are written in `requirements.md` (feature-level) or in the requirements section of `spec.md`. Every EARS requirement gets a unique ID (e.g., `REQ-CRAWL-001`) for traceability.

### 3. Three-Document Spec Structure

Each feature specification comprises three documents (extending ADR-018 §3):

| Document | Content | Owner | Format |
| --- | --- | --- | --- |
| `requirements.md` | EARS requirements + acceptance criteria | Human (AI assists) | EARS syntax + Given/When/Then |
| `design.md` | Architecture decisions, component interfaces, data models, Mermaid diagrams | Human reviews, AI generates | Markdown + Mermaid |
| `tasks.md` | Dependency-ordered implementation tasks, each traceable to a requirement ID | AI generates, human reviews | Markdown checklist |

File locations (unchanged from ADR-018):

- Feature-level: `apps/<service>/src/features/<feature>/requirements.md`, `design.md`, `tasks.md`
- Cross-cutting: `docs/specs/<topic>/requirements.md`, `design.md`, `tasks.md`

### 4. Specification Hierarchy

Specifications form a hierarchy from constitutional governance down to runtime enforcement:

```text
┌─────────────────────────────────────────────────────┐
│ Constitutional Layer (AGENTS.md, CLAUDE.md, steering)│ ← Agent operating boundaries
├─────────────────────────────────────────────────────┤
│ ADRs (docs/adr/ADR-*.md)                            │ ← Architectural decisions
├─────────────────────────────────────────────────────┤
│ Feature Specs (requirements.md → design.md → tasks)  │ ← Feature behaviour + design
├─────────────────────────────────────────────────────┤
│ API Contracts (TypeSpec → OpenAPI 3.1)               │ ← External API shape
├─────────────────────────────────────────────────────┤
│ Schemas (Zod/TypeBox)                                │ ← Runtime type enforcement
├─────────────────────────────────────────────────────┤
│ Formal Models (TLA+, selective)                      │ ← Critical algorithm proofs
└─────────────────────────────────────────────────────┘
```

Each tier is authoritative for its scope. Conflicts resolve upward: Zod schemas must conform to TypeSpec contracts; TypeSpec contracts must implement feature requirements; feature requirements must respect ADR decisions; ADRs operate within constitutional boundaries.

### 5. Contract-First API Development

All external APIs follow the contract-first pattern (extending ADR-017 TypeSpec decision):

```text
1. Design   → TypeSpec definition (endpoints, schemas, errors, auth)
2. Generate → TypeSpec → OpenAPI 3.1 + JSON Schema
3. Validate → Spectral lints OpenAPI spec against style rules
4. Parallel → Frontend builds against mock server (from spec); backend implements
5. Verify   → Dredd validates live API against OpenAPI spec in CI
6. Contract → Pact consumer-driven tests prevent backward-compatibility breaks
```

Tooling:

| Tool | Role | Stage |
| --- | --- | --- |
| TypeSpec | API definition language (ADR-017) | Design |
| Spectral | OpenAPI linting + style enforcement | CI |
| Dredd | Live API vs. OpenAPI spec validation | CI |
| Pact | Consumer-driven contract testing (ADR-007) | CI |
| Schemathesis | Property-based API testing from OpenAPI schema | CI |

### 6. Property-Based Test Derivation from EARS

Every EARS requirement has a corresponding fast-check property (extending ADR-007):

```text
EARS: "When <trigger>, the <system> shall <response>"
  ↓
Property: fc.assert(fc.property(triggerArbitrary, (input) => {
  const result = system(input);
  return satisfiesResponse(result);
}))
```

The derivation workflow:

1. Human writes EARS requirement in `requirements.md`
2. AI generates fast-check property test scaffolding from EARS
3. Human reviews property correctness and coverage
4. CI runs properties with deterministic seed for reproducibility

Property coverage — measuring what fraction of possible property violations are tested — is tracked alongside line coverage.

### 7. Evidence-Driven Quality Gates

Quality gates use the five-dimension framework for spec-anchored releases:

| Dimension | Description | Target |
| --- | --- | --- |
| Task success | Did the agent complete the specified task? | Per-task criticality |
| Context preservation | Did output stay within spec boundaries? | Zero spec boundary violations |
| P95 latency | Feedback loop performance | < 30s (ADR-014) |
| Safety pass rate | All outputs comply with safety specs | 100% for critical paths |
| Evidence coverage | All EARS requirements traced to tests | ≥ 85% requirement coverage |

Gate outcomes: **PROMOTE** (release), **HOLD** (fix and re-gate), **ROLLBACK** (revert to previous).

### 8. Spec Drift Detection

Spec drift — divergence between specification and implementation — is detected by:

- **TypeSpec/OpenAPI contract validation** (Dredd): API responses must match spec
- **Pact consumer tests**: Consumer expectations must match provider behavior
- **EARS → test traceability**: Every requirement ID maps to at least one test; orphaned requirements trigger CI warning
- **Ambient enforcement** (future): Hook-based spec validation on file save (Kiro hooks pattern)
- **Spectral style rules**: OpenAPI spec linting catches structural drift from design standards

### 9. Formal Methods Tier (Selective)

For critical algorithms, natural-language specs are insufficient. Formal specifications (TLA+) are required for:

| Domain | Justification | Spec Format |
| --- | --- | --- |
| Rate limiting algorithms | Mathematical invariants (sliding window, token bucket) | TLA+ |
| Circuit breaker state machine | Safety-critical state transitions | TLA+ |
| Distributed locking | Consensus correctness | TLA+ |
| Authentication flows | Security-critical state machine | TLA+ |
| Redis Cluster coordination | Distributed consensus | TLA+ |

TLA+ specs live in `docs/specs/<topic>/model.tla`. LLM-assisted proof generation is acceptable (Claude achieves 52.9% automated TLA+ theorem proving) but all proofs must be human-reviewed.

### 10. Human-AI Collaboration Model

SDD operates on an asymmetric collaboration model:

| Phase | Human Role | AI Role | Spec Use |
| --- | --- | --- | --- |
| Plan | Decides intent, fills gaps | Generates spec draft | AI produces, human validates |
| Implement | Validates at checkpoints | Executes tasks from spec | AI reads full spec; human scans relevant parts |
| Intervene | Provides direction, updates spec | Receives updated guidance | Human updates, AI re-reads |

The asymmetric reading design: specs are structured for **AI-total / human-partial** consumption. Specs may include rejected alternatives, performance reasoning, edge case catalogues, and implicit assumptions — because AI consumes the full spec without cognitive overload while humans reference only the parts relevant to their review.

## Consequences

### Positive

- EARS requirements eliminate the seven most common requirement problems (ambiguity, vagueness, omission, duplication, complexity, wordiness, untestability)
- Contract-first API design prevents 47% backward-compatibility failure rate
- Property-based test derivation from EARS provides stronger correctness guarantees than example-based tests alone
- Evidence-driven quality gates provide measurable, multi-dimensional release confidence
- Formal methods tier catches critical algorithm bugs that testing cannot (state space explosion)
- Spec history in git becomes the organization's primary architectural memory
- Three-document structure provides clear handoff points between human and AI

### Negative

- EARS syntax requires learning curve for developers unfamiliar with structured requirements
- Three-document structure increases upfront documentation compared to ADR-018's single spec.md
- Formal methods (TLA+) have steep learning curve; limited to critical paths only
- Spectral + Dredd + Pact + Schemathesis adds CI complexity and build time
- Spec drift detection requires ongoing CI pipeline maintenance

### Risks

- EARS requirements may be over-applied to trivial features (mitigated: use EARS for features with ≥3 acceptance criteria; simpler features use Given/When/Then only)
- Formal methods may be under-used due to TLA+ learning curve (mitigated: LLM-assisted proof generation lowers barrier; limit to 5 critical algorithm domains)
- Spec drift detection may produce false positives (mitigated: Spectral custom rulesets; Dredd hooks for dynamic data)
- Three-document structure may not be maintainable for very small features (mitigated: single spec.md acceptable for features with <3 requirements; promote to three-document when complexity grows)

## Related

- [ADR-007: Testing Strategy](ADR-007-testing-strategy.md) — fast-check property-based testing, Pact consumer-driven contracts
- [ADR-011: API Framework](ADR-011-api-framework.md) — Fastify + Zod request/response validation
- [ADR-013: Configuration Management](ADR-013-configuration-management.md) — Zod schema-first validation
- [ADR-014: Automation Strategy](ADR-014-automation-strategy.md) — Quality gates, 5-dimension gate framework
- [ADR-016: Coding Standards](ADR-016-coding-standards-principles.md) — Zod as runtime contract enforcement, CUPID quality
- [ADR-017: Service Communication](ADR-017-service-communication.md) — TypeSpec/OpenAPI contract-first, Pact, tRPC contracts
- [ADR-018: Agentic Coding](ADR-018-agentic-coding-conventions.md) — SDD workflow (spec.md → plan.md → tasks.md), Guard Functions, schema-first
- [ADR-019: Ideation & Decision Protocols](ADR-019-ideation-decision-protocols.md) — Structured ideation as specification input

---

> **Provenance**: Created 2026-03-25 from analysis of [docs/research/spec.md](../research/spec.md). Extends ADR-018 §3 with comprehensive SDD methodology: EARS syntax, three-document structure, specification hierarchy, contract-first API, property-based test derivation, evidence-driven quality gates, formal methods tier, and human-AI collaboration model.
