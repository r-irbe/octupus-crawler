# Pipeline: Agent Management

| Field | Value |
| --- | --- |
| **Status** | Active |
| **Created** | 2026-03-24 |
| **ADR** | [ADR-014](../../adr/ADR-014-automation-strategy.md) |
| **Triggers** | `agent.action`, `agent.error`, `agent.belief_low`, `task.completed`, `schedule.weekly` |

## Overview

Monitors, tracks, and improves AI agent performance. Every agent action is observed, agents have SLOs, recurring problems trigger automated diagnostics, and capability gaps drive skill evolution.

## Agent Health Model

Each agent has a health score derived from 5 dimensions:

```text
Agent Health Score = weighted average of:
  ├── Reliability   (30%) — Task success rate, error frequency
  ├── Efficiency    (25%) — Task duration vs baseline, rework rate
  ├── Quality       (20%) — Gate pass rate, review findings
  ├── Confidence    (15%) — Belief scores, escalation frequency
  └── Coverage      (10%) — Skill utilization, ADR compliance
```

### Health States

| State | Score | Response |
| --- | --- | --- |
| **Healthy** | ≥ 80% | Normal operations |
| **Degraded** | 60-79% | Increased monitoring, diagnostic check |
| **Unhealthy** | 40-59% | Restrict to low-risk tasks, trigger investigation |
| **Critical** | < 40% | Suspend, escalate to Gateway + user |

## Automated Monitoring

### Per-Action Tracking

Every `agent.action` event is recorded:

```yaml
record:
  agent: string
  action: string
  taskId: string
  timestamp: ISO8601
  duration_ms: number
  success: boolean
  error: string | null
  belief: number
  files_affected: string[]
```

### Aggregate Metrics (Rolling 7-Day Window)

| Metric | Formula | Agent SLO |
| --- | --- | --- |
| Success Rate | successful_tasks / total_tasks | ≥ 95% |
| Error Rate | error_actions / total_actions | < 5% |
| Avg Task Duration | sum(durations) / task_count | < 2x baseline |
| Rework Rate | rework_count / task_count | < 20% |
| Belief Escalation Rate | escalations / significant_actions | < 15% |
| Gate Pass Rate (1st attempt) | first_pass / total_submissions | > 95% |

## Automated Diagnostics

### Error Pattern Detection

```text
IF agent.error count > 3 in 24 hours:
  1. Classify errors: same type? same domain? same files?
  2. Cross-reference with:
     - Recent skill changes
     - Recent ADR changes
     - Recent codebase changes
  3. Generate diagnostic report:
     - Error pattern classification
     - Likely root cause
     - Suggested remediation
  4. Route to:
     - Self-Improvement Loop (for learning)
     - Gateway (for task reassignment)
     - User (if root cause unclear)
```

### Belief Degradation Detection

```text
IF average belief drops > 10% over 7 days for an agent:
  1. Analyze belief-low events:
     - What domains trigger low belief?
     - What questions does agent ask?
     - What context is agent missing?
  2. Generate remediation:
     - Skill enhancement suggestions
     - ADR clarification needs
     - Additional context sources
  3. Route to Gateway for skill/context adjustment
```

### Performance Regression Detection

```text
IF task duration > 150% of 10-task rolling average:
  1. Analyze task complexity vs baseline:
     - Scope increase?
     - New domain?
     - External dependency issue?
  2. If complexity-adjusted duration is still > 130% baseline:
     - Flag as performance regression
     - Generate investigation report
     - Route to Self-Improvement Loop
```

## Capability Management

### Skill Utilization Tracking

Track which skills each agent loads and how effectively they're used:

```text
For each agent-skill pair:
  - Load frequency: How often is this skill loaded?
  - Impact: Does loading this skill improve task outcomes?
  - Coverage: Is the full skill methodology followed?
  - Gaps: Are there tasks where this skill should be loaded but isn't?
```

### Capability Gap Detection

```text
When an agent fails or shows low belief:
  1. Check: Does agent have appropriate skills loaded?
  2. Check: Do loaded skills cover the task domain?
  3. Check: Are there skills that could help but aren't assigned?
  4. If gap found:
     - Suggest skill-agent assignment change
     - Route to Gateway for approval
     - If no existing skill covers the gap: flag for new skill creation
```

### Agent Capacity Planning

```text
Track parallel utilization:
  - How many agents are active simultaneously?
  - Are agents frequently blocked waiting for others?
  - Are certain agents bottlenecks?
  - Should agent capabilities be expanded?
```

## Weekly Agent Review (schedule.weekly)

```text
Every week, the Agent Management pipeline generates:

1. AGENT HEALTH DASHBOARD
   ┌─────────────────┬───────────┬───────────┬─────────┐
   │ Agent           │ Health    │ Change    │ Status  │
   ├─────────────────┼───────────┼───────────┼─────────┤
   │ Gateway         │ 95%       │ +2%       │ Healthy │
   │ Architect       │ 88%       │ —         │ Healthy │
   │ Implementation  │ 82%       │ -3%       │ Healthy │
   │ Test            │ 91%       │ +5%       │ Healthy │
   │ ...             │           │           │         │
   └─────────────────┴───────────┴───────────┴─────────┘

2. TOP ISSUES
   - 3 most common error types
   - Agents with declining health
   - Skill gaps identified

3. IMPROVEMENTS APPLIED
   - Skills updated this week
   - Agent routing changes
   - Performance improvements measured

4. RECOMMENDATIONS
   - Skill enhancements needed
   - ADR clarifications needed
   - New automation suggestions
```

## Agent Self-Assessment Protocol

Each agent periodically reports its own assessment:

```text
Self-Assessment (generated after every 10 tasks):
  - Domain confidence: Which areas am I strong/weak in?
  - Skill effectiveness: Which skills help most/least?
  - Common blockers: What slows me down most?
  - Improvement ideas: What would make me more effective?
  - ADR clarity: Which ADRs are clear vs confusing?
```

## Metrics Collected

| Metric | Description |
| --- | --- |
| `agent.health_score` | Per-agent composite health score |
| `agent.success_rate` | Task completion success rate |
| `agent.error_rate` | Error frequency per agent |
| `agent.avg_duration` | Average task duration |
| `agent.rework_rate` | Frequency of rework loops |
| `agent.belief_avg` | Average belief score |
| `agent.skill_utilization` | Skill load frequency and effectiveness |
| `agent.capability_gaps` | Number of unresolved capability gaps |
| `agent.parallel_utilization` | Concurrent agent activity |

## Related

- [Gateway Agent](../../agents/gateway.md) — Orchestrator and routing
- [Orchestration Protocol](../../agents/orchestration-protocol.md) — Agent communication
- [Self-Improvement Loop](self-improvement-loop.md) — Learning from agent patterns
- [Belief Threshold](../../instructions/belief-threshold.md) — Confidence management
- [ADR-018: Agentic Coding](../../adr/ADR-018-agentic-coding-conventions.md) — Guard Function pass rate, max 3 attempts, agent task metrics

---

> **Provenance**: Created 2026-03-24 as part of ADR-014 automation strategy. Updated 2026-03-25: added ADR-018 agentic coding metrics reference.
