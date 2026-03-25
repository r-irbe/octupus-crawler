# Automation — Event Trigger Catalog

| Field | Value |
| --- | --- |
| **Status** | Active |
| **Created** | 2026-03-24 |
| **ADR** | [ADR-014](../adr/ADR-014-automation-strategy.md) |

## Overview

Every automation in the IPF framework is event-driven. This catalog defines all events, their sources, what pipelines they trigger, and what data they carry.

## Trigger Design Principles

1. **Events are immutable facts** — something happened, not a request to do something
2. **Events carry context** — enough data for pipelines to act without re-querying
3. **Events are ordered** — within a task, events have a causal sequence
4. **Events never silently fail** — unhandled events are logged and alerted
5. **Events are idempotent** — reprocessing the same event produces the same result

## Event Definitions

### Task Events

#### `task.assigned`

```yaml
source: Gateway Agent
payload:
  taskId: string
  description: string
  agent: string
  skills: string[]
  adrs: string[]
  branch: string
  priority: critical | high | medium | low
  belief: number
triggers:
  - development-lifecycle: context-prefetch
  - agent-management: task-tracking
  - metrics: task-start
```

#### `task.completed`

```yaml
source: Any Agent → Gateway
payload:
  taskId: string
  agent: string
  branch: string
  filesChanged: string[]
  testsAdded: number
  testsPassing: boolean
  belief: number
  sessionLearnings: string[]
  duration: number
triggers:
  - documentation-lifecycle: worklog-capture, memory-capture, index-rebuild
  - self-improvement: session-analyze
  - agent-management: performance-record
  - metrics: task-complete
```

#### `task.blocked`

```yaml
source: Any Agent → Gateway
payload:
  taskId: string
  agent: string
  reason: string
  belief: number
  questionsForUser: string[]
triggers:
  - agent-management: blocked-pattern-check
  - self-improvement: blocker-analyze
  - metrics: blocked-count
```

#### `task.failed`

```yaml
source: Any Agent → Gateway
payload:
  taskId: string
  agent: string
  error: string
  filesChanged: string[]
  rollbackNeeded: boolean
triggers:
  - agent-management: error-record, health-check
  - self-improvement: failure-analyze
  - metrics: failure-count
```

### Code Events

#### `file.changed`

```yaml
source: Implementation Agent, DevOps Agent
payload:
  files: string[]
  agent: string
  taskId: string
  changeType: create | modify | delete
triggers:
  - quality-gates: lint-typecheck (if .ts/.tsx)
  - documentation-lifecycle: index-check (if .md)
  - security-pipeline: secrets-scan (all files)
```

#### `code.committed`

```yaml
source: Any Agent (via git)
payload:
  branch: string
  commitHash: string
  message: string
  filesChanged: string[]
  agent: string
triggers:
  - quality-gates: full-suite
  - security-pipeline: secrets-scan
  - metrics: commit-count
```

#### `dependency.changed`

```yaml
source: Implementation Agent, DevOps Agent
payload:
  package: string
  added: string[]
  removed: string[]
  updated: Array<{ name: string, from: string, to: string }>
triggers:
  - security-pipeline: cve-scan, supply-chain-audit
  - quality-gates: dependency-validation
  - metrics: dependency-health
```

### Test Events

#### `tests.started`

```yaml
source: Test Agent, CI Pipeline
payload:
  taskId: string
  testTypes: string[]  # unit, integration, e2e, load, chaos
  packages: string[]
triggers:
  - metrics: test-run-start
```

#### `tests.completed`

```yaml
source: Test Agent, CI Pipeline
payload:
  taskId: string
  results:
    passed: number
    failed: number
    skipped: number
    duration: number
  coverage:
    business: number
    overall: number
  flakyTests: string[]
triggers:
  - quality-gates: coverage-check, flaky-detection
  - metrics: test-trending
  - self-improvement: test-pattern-analyze (if failures)
```

### PR Events

#### `pr.opened`

```yaml
source: Git Platform (GitHub)
payload:
  prNumber: number
  branch: string
  targetBranch: string
  title: string
  description: string
  filesChanged: string[]
  author: string
triggers:
  - quality-gates: full-pipeline
  - review: council-activation
  - security-pipeline: full-scan
  - metrics: pr-opened
```

#### `pr.review.completed`

```yaml
source: Review Agent
payload:
  prNumber: number
  verdict: APPROVED | CHANGES_REQUESTED | REJECTED | DEFERRED
  findings: Array<{ severity: string, category: string, vote: string }>
  consensusScore: number
triggers:
  - quality-gates: review-gate-check
  - self-improvement: review-pattern-analyze
  - metrics: review-metrics
```

#### `pr.approved`

```yaml
source: Review Agent / GitHub
payload:
  prNumber: number
  branch: string
triggers:
  - release-pipeline: merge-preparation
  - metrics: pr-approved
```

### Deploy Events

#### `branch.merged`

```yaml
source: Git Platform
payload:
  branch: string
  targetBranch: string
  commitHash: string
triggers:
  - release-pipeline: build-and-deploy
  - documentation-lifecycle: index-rebuild
  - metrics: merge-count
```

#### `deploy.started`

```yaml
source: Release Pipeline
payload:
  version: string
  environment: string
  services: string[]
triggers:
  - metrics: deploy-start
```

#### `deploy.completed`

```yaml
source: Release Pipeline
payload:
  version: string
  environment: string
  success: boolean
  healthChecksPassed: boolean
triggers:
  - release-pipeline: health-verification (if success)
  - release-pipeline: rollback (if !success)
  - agent-management: deploy-metrics
  - metrics: deploy-complete
```

### Memory Events

#### `memory.written`

```yaml
source: Any Agent → Documentation Agent
payload:
  tier: session | short-term | long-term
  path: string
  content: string
  source: string  # which agent/task produced this
triggers:
  - self-improvement: pattern-scan
  - documentation-lifecycle: index-update
  - metrics: memory-write
```

#### `memory.promoted`

```yaml
source: Documentation Agent
payload:
  fromTier: session | short-term
  toTier: short-term | long-term
  path: string
  validationScore: number
triggers:
  - self-improvement: adr-evolution-check
  - metrics: promotion-count
```

### Agent Events

#### `agent.action`

```yaml
source: Any Agent
payload:
  agent: string
  action: string  # read-file, write-file, run-test, etc.
  taskId: string
  duration: number
  success: boolean
triggers:
  - agent-management: performance-tracking
  - metrics: agent-action
```

#### `agent.error`

```yaml
source: Any Agent
payload:
  agent: string
  error: string
  taskId: string
  recoverable: boolean
triggers:
  - agent-management: health-alert
  - self-improvement: error-pattern
  - metrics: agent-error
```

#### `agent.belief_low`

```yaml
source: Any Agent
payload:
  agent: string
  belief: number
  taskId: string
  context: string
  questionsForUser: string[]
triggers:
  - agent-management: context-enrichment
  - metrics: belief-tracking
```

### Schedule Events

#### `schedule.daily`

```yaml
source: Cron / Scheduler
triggers:
  - security-pipeline: cve-scan
  - documentation-lifecycle: dead-link-check
  - agent-management: daily-report
  - metrics: daily-aggregate
```

#### `schedule.weekly`

```yaml
source: Cron / Scheduler
triggers:
  - self-improvement: memory-consolidation
  - agent-management: trend-analysis
  - documentation-lifecycle: gap-analysis
  - metrics: weekly-report
```

## Trigger Routing

```text
Event → Event Bus → Pipeline Router → Pipeline(s) → Agent(s) → Result → Metrics

Pipeline Router rules:
1. Match event type to pipeline subscriptions
2. Check pipeline health (circuit breaker)
3. Fan-out to all subscribed pipelines
4. Each pipeline runs independently
5. Failures in one pipeline don't block others
6. All results collected by Metrics Collector
```

## Related

- [ADR-014: Automation Strategy](../adr/ADR-014-automation-strategy.md) — Architecture decision
- [Development Lifecycle](pipelines/development-lifecycle.md) — SDLC automation
- [Quality Gates](pipelines/quality-gates.md) — Quality enforcement
- [Documentation Lifecycle](pipelines/documentation-lifecycle.md) — Doc maintenance
- [Self-Improvement Loop](pipelines/self-improvement-loop.md) — Continuous learning
- [Agent Management](pipelines/agent-management.md) — Agent health
- [Release Pipeline](pipelines/release-pipeline.md) — Automated deployment
- [Security Pipeline](pipelines/security-pipeline.md) — Security scanning
- [Metrics & SLOs](metrics.md) — Observability

---

> **Provenance**: Created 2026-03-24 as part of ADR-014 automation strategy. Defines all event triggers for the automation framework. Updated 2026-03-25: expanded Related section to reference all 7 pipelines.
