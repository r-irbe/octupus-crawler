# Automation — Event Trigger Catalog

**ADR**: [ADR-014](../adr/ADR-014-automation-strategy.md)

Events are immutable facts, carry enough context for pipelines to act, are ordered within a task, never silently fail, and are idempotent.

## Event Summary

| Event | Source | Key Payload | Triggers |
| --- | --- | --- | --- |
| **Task Events** | | | |
| `task.assigned` | Gateway | taskId, agent, skills, adrs, branch, priority, belief | dev-lifecycle, agent-mgmt, metrics |
| `task.completed` | Any Agent → Gateway | taskId, agent, filesChanged, testsAdded, belief, duration, sessionLearnings | doc-lifecycle, self-improvement, agent-mgmt, metrics |
| `task.blocked` | Any Agent → Gateway | taskId, agent, reason, questionsForUser | agent-mgmt, self-improvement, metrics |
| `task.failed` | Any Agent → Gateway | taskId, agent, error, rollbackNeeded | agent-mgmt, self-improvement, metrics |
| **Code Events** | | | |
| `file.changed` | Implementation, DevOps | files, changeType | quality-gates (.ts), doc-lifecycle (.md), security (all) |
| `code.committed` | Any Agent (git) | branch, commitHash, filesChanged | quality-gates, security, metrics |
| `dependency.changed` | Implementation, DevOps | package, added, removed, updated | security, quality-gates, metrics |
| **Test Events** | | | |
| `tests.started` | Test Agent, CI | taskId, testTypes, packages | metrics |
| `tests.completed` | Test Agent, CI | results (pass/fail/skip), coverage, flakyTests | quality-gates, metrics, self-improvement |
| **PR Events** | | | |
| `pr.opened` | GitHub | prNumber, branch, filesChanged | quality-gates, review, security, metrics |
| `pr.review.completed` | Review Agent | prNumber, verdict, findings, consensusScore | quality-gates, self-improvement, metrics |
| `pr.approved` | Review Agent / GitHub | prNumber, branch | release, metrics |
| **Deploy Events** | | | |
| `branch.merged` | GitHub | branch, commitHash | release, doc-lifecycle, metrics |
| `deploy.started` | Release Pipeline | version, environment, services | metrics |
| `deploy.completed` | Release Pipeline | version, success, healthChecksPassed | release (verify/rollback), agent-mgmt, metrics |
| **Memory Events** | | | |
| `memory.written` | Any Agent → Doc Agent | tier, path, content, source | self-improvement, doc-lifecycle, metrics |
| `memory.promoted` | Documentation Agent | fromTier, toTier, path, validationScore | self-improvement, metrics |
| **Agent Events** | | | |
| `agent.action` | Any Agent | agent, action, duration, success | agent-mgmt, metrics |
| `agent.error` | Any Agent | agent, error, recoverable | agent-mgmt, self-improvement, metrics |
| `agent.belief_low` | Any Agent | agent, belief, context, questionsForUser | agent-mgmt, metrics |
| **Schedule Events** | | | |
| `schedule.daily` | Cron | — | security, doc-lifecycle, agent-mgmt, metrics |
| `schedule.weekly` | Cron | — | self-improvement, agent-mgmt, doc-lifecycle, metrics |

## Routing

`Event` → Event Bus → Pipeline Router (check circuit breaker) → fan-out to subscribed pipelines → independent execution → results → Metrics Collector.

## Related

- [Pipelines](pipelines/), [Metrics & SLOs](metrics.md)
- [ADR-014](../adr/ADR-014-automation-strategy.md)
