# Skill: Automation Orchestration

**Agent**: Gateway | **ADR**: [ADR-014](../adr/ADR-014-automation-strategy.md)

Execute automated pipelines, route events to subscribers, handle failures with retry and circuit-breaking.

## Event Processing

On event: validate schema → look up subscribed pipelines → check circuit breaker state → dispatch (healthy) or queue (open) → record metrics.

## Pipeline Execution

Load stage config → assign to agent → set timeout → monitor → on completion advance / on failure handle / on timeout escalate to Gateway.

## Circuit Breaker (per ADR-009)

- **CLOSED**: Normal execution
- **OPEN** (3 consecutive failures): Skip pipeline, queue events, alert. Cooldown: 5 min
- **HALF-OPEN**: Try one event — success → CLOSED, failure → OPEN

## Retry Strategy

- Transient: immediate → 10s → 60s → circuit breaker opens
- Permanent: no retry, alert immediately, log for Self-Improvement

## Pipeline Dependencies

Build dependency graph → execute in topological order → parallelize independent pipelines → block dependents on failure.

## Related

- [Trigger Catalog](../automation/triggers.md), [Metrics & SLOs](../automation/metrics.md)
- [ADR-014](../adr/ADR-014-automation-strategy.md), [ADR-018](../adr/ADR-018-agentic-coding-conventions.md)
