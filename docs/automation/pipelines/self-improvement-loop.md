# Pipeline: Self-Improvement Loop

| Field | Value |
| --- | --- |
| **Status** | Active |
| **Created** | 2026-03-24 |
| **ADR** | [ADR-014](../../adr/ADR-014-automation-strategy.md) |
| **Triggers** | `task.completed`, `task.failed`, `task.blocked`, `memory.written`, `memory.promoted`, `schedule.weekly` |

## Overview

The meta-system that makes all other systems better. Analyzes every task outcome, detects patterns, promotes validated learnings, evolves ADRs, tunes agent behavior, and improves automation pipelines themselves.

## Core Loop

```text
    ┌──────────────────────────────────────────────────┐
    │                                                  │
    │    ┌──────────┐    ┌──────────┐    ┌──────────┐ │
    │    │ OBSERVE  │───▶│ ANALYZE  │───▶│ LEARN    │ │
    │    │          │    │          │    │          │ │
    │    │ Collect  │    │ Pattern  │    │ Validate │ │
    │    │ signals  │    │ detect   │    │ & store  │ │
    │    └──────────┘    └──────────┘    └────┬─────┘ │
    │                                         │       │
    │    ┌──────────┐    ┌──────────┐         │       │
    │    │ VERIFY   │◀───│ APPLY    │◀────────┘       │
    │    │          │    │          │                  │
    │    │ Measure  │    │ Promote  │                  │
    │    │ impact   │    │ & evolve │                  │
    │    └────┬─────┘    └──────────┘                  │
    │         │                                        │
    │         └────────────────────────────────────────┘
    │              (continuous improvement cycle)
    └──────────────────────────────────────────────────┘
```

## Phase 1: OBSERVE — Collect Signals

Every task produces signals. These are automatically collected:

### Task Outcome Signals

| Signal | Source | What It Measures |
| --- | --- | --- |
| Task duration | `task.completed` | Efficiency |
| Quality gate failures | Quality Gates Pipeline | Code quality trends |
| Rework count | Gate loop iterations | Precision of implementation |
| Belief escalations | `agent.belief_low` | Uncertainty patterns |
| Review findings | `pr.review.completed` | Design/code quality |
| Test coverage delta | `tests.completed` | Testing thoroughness |
| Bug root causes | `task.completed` (bug fixes) | Systemic weaknesses |

### Failure Signals

| Signal | Source | What It Measures |
| --- | --- | --- |
| Task failures | `task.failed` | Agent capability gaps |
| Blocked tasks | `task.blocked` | Missing context or skills |
| Gate override requests | Quality Gates Pipeline | Rule friction |
| Reverted changes | Release Pipeline | Quality escape rate |
| Flaky tests | `tests.completed` | Test reliability |

### Process Signals

| Signal | Source | What It Measures |
| --- | --- | --- |
| ADR compliance violations | Quality Gates Pipeline | ADR clarity/relevance |
| Memory promotion rate | `memory.promoted` | Learning velocity |
| Dead link count | Documentation Lifecycle | Doc maintenance health |
| Agent error rate | `agent.error` | Agent reliability |

## Phase 2: ANALYZE — Detect Patterns

Automated pattern detection runs on accumulated signals:

### Pattern Detection Rules

#### Recurring Quality Gate Failures

```text
IF same gate fails > 3 times across different tasks in 7 days
THEN:
  - Classify failure type (same rule? same package? same agent?)
  - Generate insight: "Gate X fails frequently, root cause appears to be Y"
  - Store as session memory with confidence score
  - Suggest: skill update, ADR clarification, or tooling change
```

#### Belief Escalation Patterns

```text
IF agent belief drops < 80% in same domain > 3 times in 7 days
THEN:
  - Classify uncertainty domain (ambiguous ADR? missing skill? new territory?)
  - Generate insight: "Agent X uncertain in domain Y, possibly due to Z"
  - Suggest: skill enhancement, ADR example addition, or training context
```

#### Task Duration Regression

```text
IF task type T takes > 150% of rolling 10-task average
THEN:
  - Analyze factors: larger scope? more rework? more uncertainty?
  - Generate insight: "Task type T is slowing down, factors: ..."
  - Suggest: process optimization, skill update, or scope control
```

#### Test Failure Clustering

```text
IF tests in package P fail > 5 times in 7 days
THEN:
  - Classify: flaky? infrastructure? code quality?
  - If flaky: quarantine and create fix task
  - If infrastructure: alert SRE Agent
  - If code quality: alert Implementation Agent
```

#### Review Finding Trends

```text
IF same review finding category appears in > 3 PRs in 30 days
THEN:
  - Classify: missing guideline? unclear ADR? skill gap?
  - Generate insight: "Review finding type X is recurring"
  - Suggest: new guideline, ADR amendment, or skill enhancement
```

#### Memory Contradiction Detection

```text
IF new session memory contradicts existing short-term/long-term memory
THEN:
  - Flag both memories
  - Generate comparison analysis
  - Store as "conflict to resolve" in session memory
  - Assign to Documentation Agent for resolution
```

## Phase 3: LEARN — Validate and Store

Validated patterns are promoted through the memory tier system:

### Validation Criteria

| Confidence Level | Criteria | Action |
| --- | --- | --- |
| **Strong** (90-100%) | Pattern confirmed by 5+ independent signals | Auto-promote to short-term |
| **Moderate** (70-89%) | Pattern confirmed by 3-4 signals | Promote with review flag |
| **Weak** (50-69%) | Pattern confirmed by 1-2 signals | Keep in session, monitor |
| **Unconfirmed** (< 50%) | Single signal, no pattern yet | Log, do not promote |

### Automated Memory Operations

```text
Session → Short-Term Promotion (automated when confidence ≥ 70%):
  1. Package learning with evidence (signal references)
  2. Tag with domain (agent, skill, ADR, pipeline)
  3. Write to docs/memory/short-term/ with standard format
  4. Update memory index
  5. Fire memory.promoted event

Short-Term → Long-Term Promotion (requires 3+ validations):
  1. Confirm pattern holds across 3+ independent validations
  2. Abstract from specific instances to general principle
  3. Write to docs/memory/long-term/ with full provenance
  4. Cross-reference with related ADRs and skills
  5. Flag if ADR amendment may be warranted

Long-Term → Documentation Integration:
  1. If learning suggests ADR amendment → draft amendment for Architect review
  2. If learning suggests new guideline → draft guideline for user review
  3. If learning suggests skill update → draft update for Gateway review
  4. All drafts require human approval before integration
```

## Phase 4: APPLY — Promote and Evolve

Validated learnings are applied to improve the system:

### ADR Evolution

```text
When long-term memory suggests ADR change:
  1. Generate ADR amendment draft with:
     - Current text
     - Proposed change
     - Evidence (memory references)
     - Impact analysis
  2. Submit to Architect Agent for review
  3. If approved by Architect: submit to user for final approval
  4. If approved by user: apply change + update all downstream
  5. Fire adr.amended event → cascade to compliance checker
```

### Skill Enhancement

```text
When pattern suggests skill improvement:
  1. Identify skill and specific section to update
  2. Generate enhancement draft with evidence
  3. Submit to Gateway for review
  4. Apply if approved
  5. Retrain agents on updated skill (re-read)
```

### Agent Tuning

```text
When pattern suggests agent behavior adjustment:
  1. Identify agent and behavior pattern
  2. Generate tuning recommendation:
     - More/less aggressive belief checking
     - Different skill loading combinations
     - Different context pre-fetch priorities
  3. Apply as skill/instruction adjustment
  4. Monitor for improvement in next cycle
```

### Pipeline Optimization

```text
When metrics suggest pipeline inefficiency:
  1. Identify bottleneck stage
  2. Analyze: timeout too tight? parallelization opportunity? redundant check?
  3. Generate optimization proposal
  4. Apply if low-risk, escalate if architectural
```

## Phase 5: VERIFY — Measure Impact

Every applied change is monitored for impact:

```text
After applying improvement:
  1. Set baseline metrics at time of change
  2. Monitor metrics for 7 days
  3. Compare post-change vs baseline:
     - If improved ≥ 10%: validate learning, strengthen confidence
     - If unchanged: maintain learning, continue monitoring
     - If degraded ≥ 10%: revert change, weaken learning confidence
  4. Record verification result in memory
```

## Weekly Consolidation (schedule.weekly)

```text
Every week:
  1. Review all session memories from past 7 days
  2. Run pattern detection across all signals
  3. Promote validated learnings
  4. Archive stale session memories (> 14 days, not promoted)
  5. Generate weekly improvement report:
     - Patterns detected
     - Learnings promoted
     - ADR amendments proposed
     - Skills enhanced
     - Pipeline optimizations applied
  6. Store report in docs/memory/short-term/weekly-consolidation-YYYY-MM-DD.md
```

## Safety Guardrails

| Guardrail | Purpose |
| --- | --- |
| No auto-merge of ADR changes | Human approval always required for architecture |
| No auto-delete of memories | Only archive, never delete (audit trail) |
| Revert on degradation | If improvement causes harm, auto-revert |
| Confidence thresholds | Only strong patterns trigger automated action |
| Rate limiting | Max 3 ADR amendment proposals per week |
| Human oversight | Weekly consolidation report always sent to user |

## Metrics Collected

| Metric | Target | Description |
| --- | --- | --- |
| `improve.patterns_detected` | Tracked | Patterns found per week |
| `improve.learnings_promoted` | Tracked | Session → short-term promotions |
| `improve.adr_amendments` | < 3/week | ADR changes proposed |
| `improve.skill_updates` | Tracked | Skill enhancements applied |
| `improve.revert_rate` | < 10% | Applied improvements that were reverted |
| `improve.cycle_time` | < 7 days | Signal to applied improvement |
| `improve.impact_positive` | > 80% | Improvements that measurably helped |

## Related

- [Memory Promotion Workflow](../../guidelines/memory-promotion-workflow.md) — Manual promotion process
- [Documentation Lifecycle](documentation-lifecycle.md) — Memory tier management
- [Agent Management](agent-management.md) — Agent performance tuning
- [Metrics & SLOs](../metrics.md) — Measurement framework
- [ADR-018: Agentic Coding](../../adr/ADR-018-agentic-coding-conventions.md) — Validation metrics (file size, guard pass rate, task completion)
- [ADR-019: Ideation & Decision Protocols](../../adr/ADR-019-ideation-decision-protocols.md) — Reasoning framework selection for pattern analysis, anti-sycophancy in learning validation

---

> **Provenance**: Created 2026-03-24 as part of ADR-014 automation strategy. Updated 2026-03-25: added ADR-018 validation metrics reference; added ADR-019 cross-reference.
