# Skill: Self-Improvement

| Field | Value |
| --- | --- |
| **Status** | Active |
| **Created** | 2026-03-24 |
| **Primary Agents** | Gateway, Documentation |
| **ADR** | [ADR-014](../adr/ADR-014-automation-strategy.md) |

## Purpose

Detect patterns in task outcomes, validate and promote learnings through memory tiers, propose ADR and skill evolutions, and measure the impact of applied improvements.

## Pattern Detection Algorithms

### Recurring Failure Pattern

```text
Input: Last 7 days of task.failed and gate failure events
Algorithm:
  1. Group failures by: gate type, file/package, agent, error category
  2. For each group with count ≥ 3:
     a. Extract common factors (same ADR? same pattern? same domain?)
     b. Cross-reference with recent changes (code, ADR, skill)
     c. Generate hypothesis: "Failures in group G likely caused by X"
     d. Assign confidence: (count / total_failures) * recurrence_weight
  3. Output: Ranked list of failure patterns with confidence scores
```

### Belief Degradation Pattern

```text
Input: Last 7 days of agent.belief_low events
Algorithm:
  1. Group by agent + domain (extracted from task context)
  2. For each group with count ≥ 3:
     a. Analyze questions asked (topic clustering)
     b. Identify missing context or unclear ADR sections
     c. Generate hypothesis: "Agent X lacks confidence in Y because Z"
     d. Suggest: skill addition, ADR clarification, context source
  3. Output: Ranked uncertainty domains with remediation suggestions
```

### Duration Regression Detection

```text
Input: All task.completed events with durations
Algorithm:
  1. Bucket tasks by type (feature, bugfix, test, refactor, docs)
  2. Compute 10-task rolling average per type
  3. Flag tasks > 150% of rolling average
  4. For flagged tasks:
     a. Analyze: scope, rework count, gate failures, belief events
     b. Classify: scope creep, quality issue, complexity increase, external block
  5. Output: Duration anomalies with root cause classification
```

### Review Trend Detection

```text
Input: Last 30 days of pr.review.completed events
Algorithm:
  1. Extract all findings with categories
  2. Group by finding category
  3. Identify categories appearing in > 3 different PRs
  4. For recurring categories:
     a. Check: Is there a guideline covering this?
     b. Check: Is there an ADR decision on this?
     c. Check: Is there a quality gate for this?
     d. If no: recommend new guideline/gate
     e. If yes: recommend clarification or gate enhancement
  5. Output: Recurring review findings with recommendations
```

### Memory Contradiction Detection

```text
Input: All memory tiers (session, short-term, long-term)
Algorithm:
  1. Extract key claims from each memory entry
  2. For each new claim:
     a. Search existing claims for semantic overlap
     b. Check if overlapping claims agree or contradict
     c. If contradiction found:
        - Flag both entries
        - Generate comparison with evidence links
        - Assign to Documentation Agent for resolution
  3. Output: Contradiction pairs with resolution suggestions
```

## Validation Framework

### Confidence Scoring

```text
Score = base_score * evidence_weight * recency_weight * diversity_weight

base_score:
  - Pattern from 1 signal   = 30%
  - Pattern from 2 signals  = 50%
  - Pattern from 3-4 signals = 70%
  - Pattern from 5+ signals  = 90%

evidence_weight:
  - Contradicted by other evidence = 0.5x
  - No contradicting evidence      = 1.0x
  - Confirmed by independent test  = 1.5x

recency_weight:
  - Within last 24 hours = 1.0x
  - Within last 7 days   = 0.9x
  - Older than 7 days    = 0.7x

diversity_weight:
  - All signals from same source = 0.7x
  - Signals from 2+ sources      = 1.0x
  - Signals from 3+ independent sources = 1.2x
```

### Promotion Decision Matrix

| Confidence | Validated By | Promotion Action |
| --- | --- | --- |
| ≥ 90% | 5+ signals, multi-source | Auto-promote to short-term |
| 70-89% | 3-4 signals | Promote with review flag |
| 50-69% | 1-2 signals | Keep in session, monitor |
| < 50% | Single signal | Log only, do not promote |

## ADR Evolution Protocol

```text
When long-term memory suggests ADR needs update:

1. PROPOSAL GENERATION
   - Extract current ADR text
   - Identify specific section(s) to change
   - Draft amendment with:
     * Current text
     * Proposed new text
     * Evidence (memory references, signal data)
     * Impact analysis (what code/docs/agents affected?)

2. REVIEW CHAIN
   - Submit to Architect Agent for technical review
   - Architect reviews against design principles
   - If technically sound → submit to user for approval
   - If unsound → reject with reason, store as "rejected proposal" in memory

3. APPLICATION (after human approval)
   - Update ADR document
   - Update adr/index.md
   - Fire adr.amended event → triggers:
     * Quality gate ADR compliance rules update
     * Affected agents reload ADR context
     * Doc lifecycle updates cross-references
   - Record in worklog

4. VERIFICATION (7 days post-change)
   - Monitor metrics affected by ADR change
   - Compare post-change vs baseline
   - If positive: strengthen learning confidence
   - If negative: propose revert
```

## Improvement Impact Tracking

```text
For each applied improvement:

Before applying:
  1. Record baseline metrics (relevant to improvement)
  2. Document expected impact and timeline

After applying:
  1. Monitor metrics for 7 days
  2. Calculate delta vs baseline
  3. Classify impact:
     - POSITIVE: ≥ 10% improvement in target metric
     - NEUTRAL:  < 10% change
     - NEGATIVE: ≥ 10% degradation

  4. Actions based on impact:
     - POSITIVE: strengthen learning confidence, record success
     - NEUTRAL: maintain learning, extend monitoring to 14 days
     - NEGATIVE: revert improvement, weaken learning confidence, analyze why
```

## Related

- [Self-Improvement Loop Pipeline](../automation/pipelines/self-improvement-loop.md) — Pipeline definition
- [ADR-018: Agentic Coding](../adr/ADR-018-agentic-coding-conventions.md) — Guard pass rate, file size metrics
- [ADR-019: Ideation & Decision Protocols](../adr/ADR-019-ideation-decision-protocols.md) — Reasoning framework selection for pattern analysis
- [Memory Promotion Workflow](../guidelines/memory-promotion-workflow.md) — Manual promotion
- [Memory Promotion Skill](memory-promotion.md) — Tier promotion mechanics

---

> **Provenance**: Created 2026-03-24 as part of ADR-014. Skill for automated pattern detection, learning validation, and system evolution. Updated 2026-03-25: added ADR-018/019 cross-references.
