# Automation Index

Event-driven automation per [ADR-014](../adr/ADR-014-automation-strategy.md). Flow: Events → Trigger Catalog → Pipeline Router → Pipelines → Agents → Results → Metrics.

## Documents

| Document | Description |
| --- | --- |
| [Trigger Catalog](triggers.md) | All event definitions, payloads, pipeline subscriptions |
| [Metrics & SLOs](metrics.md) | SLO definitions, alerting, reporting cadence |

## Pipelines

| Pipeline | Key Triggers | Description |
| --- | --- | --- |
| [Development Lifecycle](pipelines/development-lifecycle.md) | `task.assigned/completed` | Context → design → implement → test → review → merge → post-task |
| [Quality Gates](pipelines/quality-gates.md) | `file.changed`, `code.committed`, `pr.opened` | 4-tier blocking enforcement, ADR compliance, forbidden patterns |
| [Documentation Lifecycle](pipelines/documentation-lifecycle.md) | `file.changed`, `task.completed`, `memory.written` | Index rebuild, cross-refs, provenance, gap analysis, memory mgmt |
| [Self-Improvement Loop](pipelines/self-improvement-loop.md) | `task.completed/failed`, `memory.promoted` | Observe → Analyze → Learn → Apply → Verify |
| [Agent Management](pipelines/agent-management.md) | `agent.action/error/belief_low` | Health monitoring, SLOs, capability tracking |
| [Release Pipeline](pipelines/release-pipeline.md) | `branch.merged`, `deploy.completed` | Build → test → push → deploy → verify → rollback |
| [Security Pipeline](pipelines/security-pipeline.md) | `dependency.changed`, `code.committed`, `schedule.daily` | 5-layer: code, deps, containers, config, runtime |
