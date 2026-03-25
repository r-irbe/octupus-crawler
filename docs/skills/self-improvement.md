# Skill: Self-Improvement

**Agents**: Gateway, Documentation | **ADR**: [ADR-014](../adr/ADR-014-automation-strategy.md)

Detect patterns in task outcomes, validate and promote learnings through memory tiers, propose ADR/skill evolutions, measure improvement impact.

## Pattern Detection

Five algorithms, all operating on 7–30 day event windows:

1. **Recurring failures**: Group `task.failed` + gate failures by type/package/agent. Count ≥ 3 → generate hypothesis with confidence score
2. **Belief degradation**: Group `agent.belief_low` by agent + domain. Count ≥ 3 → identify missing context or unclear ADR sections
3. **Duration regression**: Rolling 10-task average per type. Flag tasks > 150% average → classify root cause (scope creep, quality issue, complexity, external block)
4. **Review trends**: Findings appearing in > 3 different PRs → recommend new guideline/gate or clarify existing
5. **Memory contradictions**: Semantic overlap detection across tiers → flag contradicting claims for Documentation Agent resolution

## Confidence Scoring

`Score = base × evidence × recency × diversity`

- **Base**: 1 signal = 30%, 2 = 50%, 3-4 = 70%, 5+ = 90%
- **Evidence**: contradicted = 0.5×, neutral = 1.0×, confirmed = 1.5×
- **Recency**: 24h = 1.0×, 7d = 0.9×, >7d = 0.7×
- **Diversity**: single source = 0.7×, 2+ = 1.0×, 3+ independent = 1.2×

| Confidence | Action |
| --- | --- |
| ≥ 90% | Auto-promote to short-term |
| 70-89% | Promote with review flag |
| 50-69% | Keep in session, monitor |
| < 50% | Log only |

## ADR Evolution Protocol

1. **Propose**: Draft amendment with current text, proposed text, evidence, impact analysis
2. **Review**: Architect Agent technical review → user approval
3. **Apply**: Update ADR → fire `adr.amended` event → cascade updates (gates, agents, docs)
4. **Verify**: Monitor metrics 7 days post-change. Positive (≥10% improvement) → strengthen. Negative (≥10% degradation) → propose revert

## Related

- [Self-Improvement Loop Pipeline](../automation/pipelines/self-improvement-loop.md)
- [ADR-018](../adr/ADR-018-agentic-coding-conventions.md), [ADR-019](../adr/ADR-019-ideation-decision-protocols.md), [ADR-022](../adr/ADR-022-memory-governance.md)
- [Memory Promotion Skill](memory-promotion.md)
