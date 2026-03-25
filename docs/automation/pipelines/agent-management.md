# Pipeline: Agent Management

**ADR**: [ADR-014](../../adr/ADR-014-automation-strategy.md) | **Triggers**: `agent.action`, `agent.error`, `agent.belief_low`, `task.completed`, `schedule.weekly`

Monitor, track, and improve AI agent performance. Every action is observed, agents have SLOs, recurring problems trigger diagnostics.

## Health Model

`Health = Reliability(30%) + Efficiency(25%) + Quality(20%) + Confidence(15%) + Coverage(10%)`

| State | Score | Response |
| --- | --- | --- |
| Healthy | ≥ 80% | Normal operations |
| Degraded | 60-79% | Increased monitoring, diagnostic |
| Unhealthy | 40-59% | Restrict to low-risk tasks, investigate |
| Critical | < 40% | Suspend, escalate to Gateway + user |

## Agent SLOs (Rolling 7-Day)

| Metric | Target |
| --- | --- |
| Success rate | ≥ 95% |
| Error rate | < 5% |
| Avg task duration | < 2× baseline |
| Rework rate | < 20% |
| Belief escalation rate | < 15% |
| Gate pass rate (1st attempt) | > 95% |

## Automated Diagnostics

- **Error patterns**: >3 errors in 24h → classify, cross-reference with recent changes, generate report, route to Self-Improvement/Gateway/user
- **Belief degradation**: Average belief drops >10% over 7d → analyze low-belief domains, suggest skill/ADR enhancements
- **Performance regression**: Duration >150% of rolling average → analyze complexity factors, flag if still >130% complexity-adjusted

## Capability Management

- **Skill utilization**: Track load frequency, impact on outcomes, coverage of methodology, gaps
- **Gap detection**: On failure/low belief → check skill coverage → suggest assignment changes or new skill creation
- **Capacity**: Track parallel utilization, bottlenecks, blocked agents

## Weekly Review

Agent health dashboard, top 3 error types, declining health trends, improvements applied, skill enhancement recommendations.

## Metrics

| Metric | Description |
| --- | --- |
| `agent.health_score` | Composite per-agent score |
| `agent.success_rate` | Task completion rate |
| `agent.belief_avg` | Average belief score |
| `agent.capability_gaps` | Unresolved gaps |

## Related

- [Gateway Agent](../../agents/gateway.md), [Orchestration Protocol](../../agents/orchestration-protocol.md)
- [Self-Improvement Loop](self-improvement-loop.md), [Belief Threshold](../../instructions/belief-threshold.md)
- [ADR-018](../../adr/ADR-018-agentic-coding-conventions.md), [ADR-021](../../adr/ADR-021-context-collapse-prevention.md)
