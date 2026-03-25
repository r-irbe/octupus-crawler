# Skills Index

Skill definitions for AI agents working on the IPF distributed crawler project. Skills provide domain knowledge and methodology that agents load when assigned relevant tasks.

## Agentic Coding Foundation (ADR-018)

All skills operate within the [ADR-018](../adr/ADR-018-agentic-coding-conventions.md) framework:

- **Guard Functions**: tsc → eslint → vitest verification chain (max 3 total attempts before escalation)
- **Atomic Action Pairs**: stochastic generation + deterministic verification as an inseparable transaction
- **Token budget awareness**: files ≤200 lines (hard limit 300), minimize context loaded per task
- **Context engineering**: minimal, human-written context files (AGENTS.md, CLAUDE.md, copilot-instructions.md)
- **Schema-first**: Zod validation at stochastic–deterministic boundaries
- **Spec-Driven Development**: spec.md → plan.md → tasks.md before implementation

## Spec-Driven Development Foundation (ADR-020)

Skills that involve specification, testing, or quality gate enforcement follow [ADR-020](../adr/ADR-020-spec-driven-development.md):

- **EARS requirements**: `When <trigger>, the <system> shall <response>` — five structured patterns
- **Three-document specs**: `requirements.md` (EARS) → `design.md` (architecture) → `tasks.md` (implementation)
- **Contract-first API**: TypeSpec → OpenAPI 3.1 → Spectral lint → Dredd validation → Pact consumer tests
- **Property tests from EARS**: fast-check properties derived directly from EARS requirements
- **Evidence-driven quality gates**: 5-dimension framework (task success, context preservation, latency, safety, evidence coverage)
- **Formal methods (selective)**: TLA+ for rate limiting, circuit breaker, distributed locking

## Ideation & Decision Foundation (ADR-019)

Skills that involve evaluation, research, or decision-making follow [ADR-019](../adr/ADR-019-ideation-decision-protocols.md):

- **Anti-sycophancy**: actively seek disconfirming evidence; never agree without evidence, never disagree without evidence
- **Reasoning framework selection**: CoT for linear analysis, ToT for branching decisions, GoT for cross-cutting synthesis, SPIRAL for iterative refinement
- **Structured ideation**: Six Thinking Hats, SCAMPER, pre-mortem for option generation
- **Mandatory incubation**: do not generate and evaluate options in the same agent turn
- **Minority protection**: record dissenting positions even when overruled

## Skills by Category

### Git & Workflow

| Skill | Description | Primary Agents |
| --- | --- | --- |
| [Git Safety](git-safety.md) | Parallel branch management, naming, conflict detection | Gateway, Implementation, DevOps |
| [Memory Promotion](memory-promotion.md) | Session → short-term → long-term memory tier promotion | Gateway, Documentation |
| [Doc Maintenance](doc-maintenance.md) | Index updates, provenance, cross-references | Documentation |

### Architecture & Design

| Skill | Description | Primary Agents |
| --- | --- | --- |
| [ADR Management](adr-management.md) | Create, update, query, deprecate ADRs | Architect, Documentation |
| [ADR Compliance](adr-compliance.md) | Verify changes against ADR decisions | Architect, Implementation, Review, DevOps |
| [Codebase Analysis](codebase-analysis.md) | Navigation, dependency mapping, change impact analysis | Architect, Implementation, Test, Review, Research, Debug, DevOps, SRE, Security |

### Development

| Skill | Description | Primary Agents |
| --- | --- | --- |
| [Code Generation](code-generation.md) | TypeScript code writing with quality gates | Implementation |
| [Test Generation](test-generation.md) | Unit/integration/e2e test patterns per ADR-007 | Test, Implementation |
| [Debug Analysis](debug-analysis.md) | Systematic debugging methodology | Debug |

### Review & Research

| Skill | Description | Primary Agents |
| --- | --- | --- |
| [PR Council Review](pr-council-review.md) | Ralph-Loop council review protocol | Review |
| [Evidence Gathering](evidence-gathering.md) | Structured research with confidence levels | Architect, Review, Research, Debug |

### Infrastructure & Operations

| Skill | Description | Primary Agents |
| --- | --- | --- |
| [Infrastructure Management](infrastructure-management.md) | K8s, Docker, Pulumi, CI/CD management | DevOps |
| [Observability](observability.md) | OTel metrics, dashboards, alerts | SRE |
| [Security Analysis](security-analysis.md) | OWASP Top 10, crawler-specific security | Security |

### Automation (ADR-014)

| Skill | Description | Primary Agents |
| --- | --- | --- |
| [Automation Orchestration](automation-orchestration.md) | Pipeline execution, event routing, circuit breaking | Gateway |
| [Quality Gate Enforcement](quality-gate-enforcement.md) | Automated gate checking, violation reporting, blocking | Gateway, Implementation, Test |
| [Self-Improvement](self-improvement.md) | Pattern detection, memory analytics, ADR evolution | Gateway, Documentation |
| [Automated Review](automated-review.md) | Pre-review analysis, finding generation, evidence scoring | Review, Security |

## Index

- [ADR Compliance](adr-compliance.md) — Verify changes against ADR decisions
- [ADR Management](adr-management.md) — Create, update, query, deprecate ADRs
- [Automated Review](automated-review.md) — Pre-review analysis and finding generation
- [Automation Orchestration](automation-orchestration.md) — Pipeline execution and event routing
- [Codebase Analysis](codebase-analysis.md) — Navigation and analysis patterns
- [Code Generation](code-generation.md) — TypeScript code writing with quality gates
- [Debug Analysis](debug-analysis.md) — Systematic debugging methodology
- [Doc Maintenance](doc-maintenance.md) — Documentation upkeep and cross-references
- [Evidence Gathering](evidence-gathering.md) — Structured research with confidence levels
- [Git Safety](git-safety.md) — Parallel branch management and conflict prevention
- [Infrastructure Management](infrastructure-management.md) — K8s, Docker, Pulumi, CI/CD
- [Memory Promotion](memory-promotion.md) — Knowledge tier promotion process
- [Observability](observability.md) — Metrics, dashboards, alerts (OTel)
- [PR Council Review](pr-council-review.md) — Ralph-Loop council review protocol
- [Quality Gate Enforcement](quality-gate-enforcement.md) — Automated quality checks and blocking
- [Security Analysis](security-analysis.md) — OWASP and crawler security checks
- [Self-Improvement](self-improvement.md) — Pattern detection and system evolution
- [Test Generation](test-generation.md) — Test writing patterns per ADR-007

---

> **Provenance**: Created 2026-03-24. Updated 2026-03-25: added ADR-018 agentic coding foundation section. Added ADR-019 ideation & decision foundation section. Added ADR-020 SDD foundation section.
