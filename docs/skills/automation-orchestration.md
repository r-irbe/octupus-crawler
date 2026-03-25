# Skill: Automation Orchestration

| Field | Value |
| --- | --- |
| **Status** | Active |
| **Created** | 2026-03-24 |
| **Primary Agent** | Gateway |
| **ADR** | [ADR-014](../adr/ADR-014-automation-strategy.md) |

## Purpose

Execute automated pipelines, route events to subscribed pipelines, handle pipeline failures with retry and circuit-breaking, and manage the overall automation lifecycle.

## Capabilities

### Event Processing

```text
On event received:
  1. Validate event schema (type, payload, source)
  2. Look up subscribed pipelines in trigger catalog
  3. For each subscribed pipeline:
     a. Check pipeline health (circuit breaker state)
     b. If healthy: dispatch event to pipeline
     c. If open: queue event for retry after cooldown
     d. If half-open: dispatch with monitoring
  4. Record event processing in metrics
  5. Return aggregate results
```

### Pipeline Execution

```text
Execute pipeline stage:
  1. Load stage configuration
  2. Assign stage to appropriate agent (or run automated)
  3. Set timeout for stage execution
  4. Monitor stage progress
  5. On completion: advance to next stage
  6. On failure: execute failure handler
  7. On timeout: escalate to Gateway
```

### Circuit Breaker for Pipelines

```text
Per-pipeline circuit breaker (per ADR-009 patterns):
  - CLOSED (normal): Execute pipeline normally
  - OPEN (failed 3x): Skip pipeline, queue events, alert
  - HALF-OPEN (after cooldown): Try one event, if success → CLOSED

Settings:
  - Failure threshold: 3 consecutive failures
  - Cooldown: 5 minutes
  - Half-open test: 1 event
```

### Retry Strategy

```text
For transient failures:
  - Attempt 1: Immediate
  - Attempt 2: After 10 seconds
  - Attempt 3: After 60 seconds
  - After 3 failures: Circuit breaker opens

For permanent failures:
  - No retry
  - Alert immediately
  - Log for Self-Improvement analysis
```

### Pipeline Dependency Management

```text
Some pipelines depend on others:
  - Release Pipeline depends on Quality Gates (all pass)
  - Self-Improvement depends on Documentation Lifecycle (memory captured)
  - Agent Management depends on task completion data

Dependency resolution:
  1. Build dependency graph
  2. Execute in topological order
  3. Parallel execution where no dependencies
  4. Block dependent pipelines if dependency fails
```

## Methodology

1. **Receive event** from event bus
2. **Validate** event schema and source
3. **Route** to subscribed pipelines
4. **Execute** pipeline stages sequentially or in parallel
5. **Monitor** stage health and timing
6. **Handle failures** with retry, circuit break, escalation
7. **Record metrics** for every operation
8. **Report** aggregate results to Gateway

## Related

- [ADR-014: Automation Strategy](../adr/ADR-014-automation-strategy.md) — Architecture
- [Trigger Catalog](../automation/triggers.md) — Event definitions
- [Metrics & SLOs](../automation/metrics.md) — Pipeline SLOs
- [ADR-018: Agentic Coding](../adr/ADR-018-agentic-coding-conventions.md) — Max 3 total attempts per Guard Function failure (§2, §7)

---

> **Provenance**: Created 2026-03-24 as part of ADR-014. Updated 2026-03-25: added ADR-018 retry limit reference.
