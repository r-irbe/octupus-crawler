# Automation Index

Event-driven automation framework for the IPF distributed crawler. Implements [ADR-014: Automation Strategy](../adr/ADR-014-automation-strategy.md) with 7 pipelines, a unified trigger catalog, and comprehensive metrics/SLOs.

## Architecture

```text
Events → Trigger Catalog → Pipeline Router → Pipelines → Agents → Results → Metrics
```

## Documents

### Core

| Document | Description |
| --- | --- |
| [Trigger Catalog](triggers.md) | All event definitions, payloads, and pipeline subscriptions |
| [Metrics & SLOs](metrics.md) | SLO definitions, dashboards, alerting, and reporting cadence |

### Pipelines

| Pipeline | Triggers | Description |
| --- | --- | --- |
| [Development Lifecycle](pipelines/development-lifecycle.md) | `task.assigned`, `task.completed` | Full SDLC: context → design → implement → test → review → merge → post-task |
| [Quality Gates](pipelines/quality-gates.md) | `file.changed`, `code.committed`, `pr.opened` | Automated blocking quality enforcement: 4 tiers, ADR compliance, forbidden patterns |
| [Documentation Lifecycle](pipelines/documentation-lifecycle.md) | `file.changed`, `task.completed`, `memory.written` | Index rebuild, cross-ref validation, provenance, gap analysis, memory management |
| [Self-Improvement Loop](pipelines/self-improvement-loop.md) | `task.completed`, `task.failed`, `memory.promoted` | Observe → Analyze → Learn → Apply → Verify continuous improvement cycle |
| [Agent Management](pipelines/agent-management.md) | `agent.action`, `agent.error`, `agent.belief_low` | Health monitoring, performance SLOs, capability tracking, self-assessment |
| [Release Pipeline](pipelines/release-pipeline.md) | `branch.merged`, `deploy.completed` | Build → test → push → deploy → verify → rollback-if-failed |
| [Security Pipeline](pipelines/security-pipeline.md) | `dependency.changed`, `code.committed`, `schedule.daily` | 5-layer scanning: code, dependencies, containers, config, runtime |

## Key SLOs

| SLO | Target |
| --- | --- |
| Manual steps per routine task | 0 |
| Quality gate first-pass rate | > 95% |
| End-to-end cycle time | < 30 min |
| Deploy success rate | > 99% |
| Security scan coverage | 100% |
| Self-improvement cycle | Weekly |
| Agent health (all) | ≥ 80% |

## Index

- [Trigger Catalog](triggers.md) — Event definitions and routing
- [Metrics & SLOs](metrics.md) — Observability and targets
- [Development Lifecycle Pipeline](pipelines/development-lifecycle.md) — Full SDLC automation
- [Quality Gates Pipeline](pipelines/quality-gates.md) — Automated quality enforcement
- [Documentation Lifecycle Pipeline](pipelines/documentation-lifecycle.md) — Doc maintenance
- [Self-Improvement Loop Pipeline](pipelines/self-improvement-loop.md) — Continuous learning
- [Agent Management Pipeline](pipelines/agent-management.md) — Agent health and evolution
- [Release Pipeline](pipelines/release-pipeline.md) — Automated deployment
- [Security Pipeline](pipelines/security-pipeline.md) — Continuous security scanning

---

> **Provenance**: Created 2026-03-24 as the automation directory index for the IPF distributed crawler project.
