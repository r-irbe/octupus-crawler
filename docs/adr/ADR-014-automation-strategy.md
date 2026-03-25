# ADR-014: Automation Strategy

| Field | Value |
| --- | --- |
| **Status** | Accepted |
| **Date** | 2026-03-24 |
| **Decision Makers** | Architecture Council |
| **Consulted** | All specialist agents |
| **Informed** | All team members |

## Context

The IPF distributed crawler project has a comprehensive governance framework: 13 ADRs, 11 AI agents, 14 skills, 6 instructions, PR review council, memory promotion workflow, and documentation standards. However, nearly all processes are triggered manually. Analysis identified **134 automation opportunities** across 13 domains.

Manual processes create:

- **Latency**: Human triggers delay feedback loops
- **Inconsistency**: Steps get skipped under time pressure
- **Knowledge loss**: Session learnings not captured systematically
- **Quality drift**: Gates enforced by convention, not machinery
- **Stale docs**: Indexes and cross-references decay between updates
- **Blind spots**: No metrics on process health or agent performance

## Decision Drivers

1. **Zero manual steps** for routine quality enforcement
2. **Event-driven** — every significant action fires triggers
3. **Pipeline-based** — automated sequences replace manual checklists
4. **Self-improving** — the system learns from every cycle
5. **Observable** — metrics on every process, SLOs on every pipeline
6. **Fail-safe** — automation failures escalate to humans, never silently pass
7. **Incremental** — each automation is independently deployable

## Decision

Adopt an **event-driven automation architecture** with 7 automated pipelines, a unified trigger catalog, metrics/SLOs, and 4 new automation skills.

### Architecture

```text
┌─────────────────────────────────────────────────────────┐
│                    EVENT BUS                             │
│  (triggers fire on: file change, task complete,         │
│   PR open, test run, deploy, memory write, schedule)    │
└──────────┬──────────┬──────────┬──────────┬─────────────┘
           │          │          │          │
    ┌──────▼───┐ ┌────▼────┐ ┌──▼──────┐ ┌▼──────────┐
    │Dev       │ │Quality  │ │Doc      │ │Self-      │
    │Lifecycle │ │Gates    │ │Lifecycle│ │Improvement│
    │Pipeline  │ │Pipeline │ │Pipeline │ │Loop       │
    └──────┬───┘ └────┬────┘ └──┬──────┘ └┬──────────┘
           │          │          │          │
    ┌──────▼───┐ ┌────▼────┐ ┌──▼──────┐ ┌▼──────────┐
    │Release   │ │Security │ │Agent    │ │Metrics    │
    │Pipeline  │ │Pipeline │ │Mgmt     │ │Collector  │
    └──────────┘ └─────────┘ └─────────┘ └───────────┘
```

### Pipelines

| Pipeline | Trigger | What It Automates |
| --- | --- | --- |
| **Development Lifecycle** | Task assignment | Requirement → design → implement → test → review → merge |
| **Quality Gates** | Code change, pre-merge | Lint, typecheck, ADR compliance, test coverage, security scan |
| **Documentation Lifecycle** | File change, task complete | Index rebuild, cross-ref check, provenance update, gap analysis |
| **Self-Improvement Loop** | Session end, memory write | Pattern detection, memory promotion, ADR evolution, agent tuning |
| **Agent Management** | Agent action, metrics threshold | Health monitoring, performance tracking, capability evolution |
| **Release Pipeline** | Merge to main | Build, test, push, deploy, verify, rollback-if-failed |
| **Security Pipeline** | Dependency change, schedule | CVE scan, secrets scan, OWASP check, supply chain audit |

### Trigger Catalog

Every automation starts from an event:

| Event | Fires |
| --- | --- |
| `task.assigned` | Dev Lifecycle: context pre-fetch, ADR loading, branch creation |
| `file.changed` | Quality Gates: lint, typecheck; Doc Lifecycle: index check |
| `code.committed` | Quality Gates: full suite; Security: secrets scan |
| `tests.completed` | Quality Gates: coverage check; Metrics: test trending |
| `pr.opened` | Quality Gates: full pipeline; Review: council activation |
| `pr.approved` | Release Pipeline: merge preparation |
| `branch.merged` | Release Pipeline: build and deploy; Doc Lifecycle: index rebuild |
| `deploy.completed` | Release Pipeline: health check; Agent Mgmt: deploy metrics |
| `task.completed` | Doc Lifecycle: worklog + memory capture; Self-Improvement: analyze |
| `memory.written` | Self-Improvement: pattern scan; Doc Lifecycle: index update |
| `memory.promoted` | Self-Improvement: ADR evolution check; Metrics: tier analytics |
| `agent.action` | Agent Mgmt: performance tracking; Metrics: agent SLOs |
| `agent.error` | Agent Mgmt: health alert; Self-Improvement: error pattern |
| `agent.belief_low` | Agent Mgmt: context enrichment; escalation tracking |
| `schedule.daily` | Security: CVE scan; Doc Lifecycle: dead link check; Metrics: report |
| `schedule.weekly` | Self-Improvement: memory consolidation; Agent Mgmt: trend analysis |

### New Skills

| Skill | Purpose | Used By |
| --- | --- | --- |
| automation-orchestration | Pipeline execution, trigger routing, retry/circuit-break | Gateway |
| quality-gate-enforcement | Automated gate checking, violation reporting, blocking | Gateway, Implementation, Test |
| self-improvement | Pattern detection, memory analytics, ADR evolution | Gateway, Documentation |
| automated-review | Pre-review checks, finding generation, evidence scoring | Review, Security |

## Considered Options

### Option A: Manual Checklists (Status Quo)

- Pros: Simple, no machinery to maintain
- Cons: Inconsistent execution, knowledge loss, quality drift, no metrics

### Option B: CI-Only Automation

- Pros: Familiar, well-tooled (GitHub Actions)
- Cons: Misses doc lifecycle, memory, agent management, self-improvement

### Option C: Event-Driven Automation (Selected)

- Pros: Comprehensive, observable, self-improving, incrementally deployable
- Cons: More complex initial setup, requires trigger infrastructure

## Consequences

### Positive

- Zero manual quality enforcement — gates are automated and blocking
- Continuous documentation health — indexes, links, and cross-refs maintained automatically
- Self-improving system — learns from every cycle, promotes patterns, evolves ADRs
- Full observability — metrics on every process, SLOs on every pipeline
- Agent performance management — track, tune, and evolve agent capabilities
- Knowledge preservation — no session learnings lost

### Negative

- Increased documentation complexity (automation layer on top of existing framework)
- Pipeline failures need human escalation paths (already covered by belief threshold)
- Metrics collection adds cognitive overhead to process reviews

### Risks

| Risk | Mitigation |
| --- | --- |
| Automation hides failures | All gates fail-open with escalation, never silently pass |
| Over-automation creates rigidity | Each automation independently disableable |
| Metric overload | SLO dashboards with alerts only on threshold violations |
| Self-improvement loop instability | Memory promotion requires validation; ADR changes require human approval |

## Validation

| Metric | Target | Measurement |
| --- | --- | --- |
| Manual steps per task | 0 for routine tasks | Process audit |
| Quality gate pass rate | > 95% first attempt | Pipeline metrics |
| Doc index freshness | < 1 hour stale | Automated checks |
| Memory promotion accuracy | > 90% validated | Promotion audit |
| Agent error rate | < 5% per session | Agent metrics |
| Mean time to feedback | < 30 seconds for quality gates | Pipeline timing |
| Self-improvement cycle time | Weekly consolidation | Schedule adherence |
| Security scan coverage | 100% of dependencies | Scan reports |

## Related

- [ADR-006: Observability Stack](ADR-006-observability-stack.md) — Metrics infrastructure
- [ADR-007: Testing Strategy](ADR-007-testing-strategy.md) — Test quality gates
- [ADR-009: Resilience Patterns](ADR-009-resilience-patterns.md) — Pipeline resilience
- [ADR-012: CI/CD Pipeline](ADR-012-ci-cd-pipeline.md) — Release automation foundation
- [ADR-015: Application Architecture](ADR-015-application-architecture-patterns.md) — Architecture compliance enforced by quality gates
- [ADR-016: Coding Standards](ADR-016-coding-standards-principles.md) — Standards enforced by quality gates
- [ADR-018: Agentic Coding](ADR-018-agentic-coding-conventions.md) — Guard Functions, retry semantics, file size SLOs
- [ADR-019: Ideation & Decision Protocols](ADR-019-ideation-decision-protocols.md) — Reasoning frameworks for automation decisions
- [ADR-020: Spec-Driven Development](ADR-020-spec-driven-development.md) — Evidence-driven 5-dimension quality gates, spec drift detection, EARS traceability
- [Automation Pipelines](../automation/index.md) — Pipeline definitions
- [Automation Triggers](../automation/triggers.md) — Event trigger catalog
- [Automation Metrics](../automation/metrics.md) — SLOs and dashboards

---

> **Provenance**: Created 2026-03-24. Defines the event-driven automation strategy covering 7 pipelines, 134 automation opportunities across 13 domains, and 4 new skills. Updated 2026-03-25: added cross-references to ADR-015, ADR-016, ADR-018, ADR-019, ADR-020.
