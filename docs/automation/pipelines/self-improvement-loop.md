# Pipeline: Self-Improvement Loop

**ADR**: [ADR-014](../../adr/ADR-014-automation-strategy.md) | **Triggers**: `task.completed`, `task.failed`, `task.blocked`, `memory.written`, `memory.promoted`, `schedule.weekly`

Meta-system that analyzes task outcomes, detects patterns, promotes learnings, evolves ADRs, and tunes agent behavior.

## Core Loop

OBSERVE (collect signals) → ANALYZE (detect patterns) → LEARN (validate & store) → APPLY (promote & evolve) → VERIFY (measure impact) → repeat.

## Phase 1: OBSERVE

Signals collected from every task:

- **Outcomes**: duration, gate failures, rework count, belief escalations, review findings, coverage delta, bug root causes
- **Failures**: task failures, blocked tasks, gate overrides, reverted changes, flaky tests
- **Process**: ADR compliance violations, memory promotion rate, dead links, agent error rate

## Phase 2: ANALYZE

Pattern detection rules (all on 7-day windows):

1. Same gate fails >3× across tasks → classify, generate hypothesis, store with confidence
2. Agent belief <80% in same domain >3× → identify missing context/unclear ADR
3. Task duration >150% of rolling average → classify root cause
4. Review finding category in >3 PRs (30d) → recommend new guideline/gate
5. New memory contradicts existing → flag for Documentation Agent resolution

## Phase 3: LEARN

| Confidence | Criteria | Action |
| --- | --- | --- |
| ≥ 90% | 5+ independent signals | Auto-promote to short-term |
| 70-89% | 3-4 signals | Promote with review flag |
| 50-69% | 1-2 signals | Keep in session, monitor |
| < 50% | Single signal | Log only |

Promotion flow: Session → Short-Term (confidence ≥70%) → Long-Term (3+ validations) → ADR/Guideline integration (human approval).

## Phase 4: APPLY

- **ADR evolution**: Draft amendment with evidence → Architect review → user approval → apply → cascade to compliance checker
- **Skill enhancement**: Identify section + evidence → Gateway review → apply → agents re-read
- **Agent tuning**: Adjust belief checking, skill loading, context priorities
- **Pipeline optimization**: Identify bottleneck → optimize if low-risk, escalate if architectural

## Phase 5: VERIFY

Monitor 7 days post-change: ≥10% improvement → strengthen learning; unchanged → continue monitoring; ≥10% degradation → revert, weaken confidence.

## Weekly Consolidation

Review session memories → run pattern detection → promote validated learnings → archive stale entries (>14d) → generate weekly report.

## Safety Guardrails

- Human approval required for ADR changes and guideline changes
- No auto-delete of memories (archive only)
- Auto-revert on degradation
- Max 3 ADR amendment proposals per week
- Weekly report always sent to user

## Metrics

| Metric | Description |
| --- | --- |
| `improve.patterns_detected` | Patterns found per week |
| `improve.learnings_promoted` | Tier promotions |
| `improve.adr_amendments` | Proposed vs applied |
| `improve.revert_rate` | Reverted improvements (<10% target) |
| `improve.impact_positive` | Improvements that helped (>80% target) |

## Related

- [Memory Promotion Workflow](../../guidelines/memory-promotion-workflow.md)
- [ADR-018](../../adr/ADR-018-agentic-coding-conventions.md), [ADR-019](../../adr/ADR-019-ideation-decision-protocols.md), [ADR-022](../../adr/ADR-022-memory-governance.md)
