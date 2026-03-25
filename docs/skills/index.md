# Skills Index

Domain knowledge and methodology that agents load per-task. All skills operate within [ADR-018](../adr/ADR-018-agentic-coding-conventions.md) (Guard Functions, Atomic Action Pairs, token budgets), [ADR-019](../adr/ADR-019-ideation-decision-protocols.md) (anti-sycophancy, reasoning frameworks), and [ADR-020](../adr/ADR-020-spec-driven-development.md) (EARS requirements, contract-first API).

## Skills

| Skill | Description | Primary Agents |
| --- | --- | --- |
| **Git & Workflow** | | |
| [Git Safety](git-safety.md) | Branch management, conflict detection | Gateway, Implementation, DevOps |
| [Memory Promotion](memory-promotion.md) | Session → short-term → long-term tier promotion | Gateway, Documentation |
| [Doc Maintenance](doc-maintenance.md) | Index updates, provenance, cross-references | Documentation |
| **Architecture** | | |
| [ADR Management](adr-management.md) | Create, update, query, deprecate ADRs | Architect, Documentation |
| [ADR Compliance](adr-compliance.md) | Verify changes against ADR decisions | Architect, Implementation, Review |
| [Codebase Analysis](codebase-analysis.md) | Navigation, dependency mapping, change impact | All Agents |
| [Ideation](ideation.md) | Structured diverge/converge ideation with adversarial framing | Gateway, Architect |
| **Development** | | |
| [Code Generation](code-generation.md) | TypeScript code with quality gates | Implementation |
| [Test Generation](test-generation.md) | Unit/integration/e2e per ADR-007 | Test, Implementation |
| [Debug Analysis](debug-analysis.md) | Reproduce → isolate → root cause → fix → verify | Debug |
| [TDD Cycle](tdd-cycle.md) | RED → GREEN → REFACTOR with context isolation | Implementation, Test |
| [Plan Feature](plan-feature.md) | Four-phase gated planning (Brief→Plan→Tasks→Implement) | Gateway, Architect |
| [Spec Writer](spec-writer.md) | Three-document spec (requirements, design, tasks) in EARS format | Architect, Gateway |
| **Review & Research** | | |
| [PR Council Review](pr-council-review.md) | Ralph-Loop council protocol | Review |
| [Evidence Gathering](evidence-gathering.md) | Structured research with confidence levels | Research, Review, Architect, Debug |
| [Automated Review](automated-review.md) | Pre-review finding generation + scoring | Review, Security |
| **Infrastructure** | | |
| [Infrastructure Management](infrastructure-management.md) | K8s, Docker, Pulumi, CI/CD | DevOps |
| [Observability](observability.md) | OTel metrics, dashboards, alerts | SRE |
| [Security Analysis](security-analysis.md) | OWASP Top 10, crawler-specific security | Security |
| **Automation** | | |
| [Automation Orchestration](automation-orchestration.md) | Pipeline execution, event routing | Gateway |
| [Quality Gate Enforcement](quality-gate-enforcement.md) | Automated gate checks, violation reporting | Gateway, Implementation, Test |
| [Self-Improvement](self-improvement.md) | Pattern detection, ADR evolution | Gateway, Documentation |
