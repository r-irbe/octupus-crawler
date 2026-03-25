# Memory Promotion Workflow

| Field | Value |
| --- | --- |
| **Status** | Accepted |
| **Created** | 2026-03-24 |
| **Last Updated** | 2026-03-24 |
| **Author(s)** | Architecture Council |

## Overview

The memory promotion workflow ensures that learnings from work sessions are captured, validated, and promoted to increasingly durable storage tiers. This prevents knowledge loss and ensures that validated insights improve project documentation (ADRs, guidelines, conventions) over time.

## Memory Tiers

```text
┌─────────────────────┐
│  Session Memory      │  Ephemeral: current work session only
│  docs/memory/session │  Created during active work
│  TTL: end of session │  Raw observations, notes, hypotheses
└──────────┬──────────┘
           │ Review & Validate
           ▼
┌─────────────────────┐
│  Short-Term Memory   │  Validated session learnings
│  docs/memory/        │  Promoted from session after review
│  short-term/         │  Retained across sessions
│  TTL: until collated │  Specific, contextualized insights
└──────────┬──────────┘
           │ Collate & Generalize
           ▼
┌─────────────────────┐
│  Long-Term Memory    │  Collated, generalized knowledge
│  docs/memory/        │  Patterns across multiple sessions
│  long-term/          │  Feeds ADR/guideline updates
│  TTL: permanent      │  High confidence, validated
└──────────┬──────────┘
           │ Integrate
           ▼
┌─────────────────────┐
│  Project Docs        │  ADRs, guidelines, conventions
│  docs/adr/           │  Updated based on long-term memory
│  docs/guidelines/    │  Source of truth for project
│  docs/conventions/   │  Permanent, version-controlled
└─────────────────────┘
```

## Promotion Process

### Step 1: Session Capture (During Work)

**When**: During any work session (coding, debugging, reviewing, planning)

**What to capture**:

- Observations about system behavior
- Patterns discovered (positive or negative)
- Decisions made and their rationale
- Problems encountered and solutions found
- Hypotheses about system behavior
- Questions that arose during work

**Format**: `docs/memory/session/YYYY-MM-DD-topic.md`

```markdown
# Session: [Topic]

**Date**: YYYY-MM-DD
**Context**: [What was being worked on]

## Observations

- [Raw observation 1]
- [Raw observation 2]

## Decisions Made

- [Decision]: [Rationale]

## Problems & Solutions

- **Problem**: [Description]
  **Solution**: [What worked]
  **Why**: [Root cause understanding]

## Hypotheses

- [Untested hypothesis for future validation]

## Questions

- [Open question needing investigation]
```

### Step 2: Session Review (End of Major Task Set)

**When**: After completing a major set of tasks (feature, debugging session, review cycle)

**Process**:

1. Review all session memory files from the just-completed work
2. For each observation/learning, assess:
   - **Validated?** Was this confirmed through testing, code review, or production evidence?
   - **Generalizable?** Does this apply beyond the specific context?
   - **Actionable?** Does this suggest a change to process, code, or documentation?
3. Validated learnings are promoted to short-term memory
4. Unvalidated hypotheses remain in session or are discarded

**Validation Criteria**:

| Criterion | Evidence Required |
| --- | --- |
| Confirmed by test | Test case that exercises the behavior |
| Confirmed by review | PR council finding or reviewer agreement |
| Confirmed by production | Metrics, logs, or incidents showing the pattern |
| Confirmed by reproduction | Independently reproduced the behavior |

### Step 3: Short-Term Promotion

**When**: Session review determines a learning is validated

**Format**: `docs/memory/short-term/topic.md`

```markdown
# [Topic]

**Promoted From**: session/YYYY-MM-DD-topic.md
**Promoted On**: YYYY-MM-DD
**Confidence**: High | Medium
**Validation**: [How this was validated]

## Learnings

- [Validated learning 1]
  - **Evidence**: [Reference to test, PR, metric]
  - **Applies To**: [Which areas of the system]

- [Validated learning 2]
  - **Evidence**: [Reference]
  - **Applies To**: [Areas]

## Suggested Actions

- [ ] Update [ADR-XXX] to reflect [learning]
- [ ] Add guideline about [pattern]
- [ ] Create issue for [improvement]
```

### Step 4: Long-Term Collation

**When**: Multiple short-term memories form a pattern, or quarterly review

**Process**:

1. Review all short-term memory files
2. Identify patterns across multiple sessions
3. Generalize specific learnings into principles
4. Collate into long-term memory organized by topic
5. Remove outdated or superseded short-term memory

**Format**: `docs/memory/long-term/topic.md`

```markdown
# [Topic Area]

**Last Collated**: YYYY-MM-DD
**Sources**: [List of short-term memory files that fed this]
**Confidence**: High

## Principles

1. **[Principle Name]**: [Description]
   - Source: [Short-term memory references]
   - Validated: [How, across how many sessions]

2. **[Principle Name]**: [Description]
   - Source: [References]
   - Validated: [How]

## Anti-Patterns

1. **[Anti-Pattern]**: [What to avoid and why]
   - Source: [Where this was learned]

## Integration Status

- [x] Integrated into [ADR-XXX]
- [x] Added to [guideline-name]
- [ ] Pending: update [convention-name]
```

### Step 5: Document Integration

**When**: Long-term memory contains validated principles not yet in project docs

**Process**:

1. Review long-term memory for unintegrated learnings
2. For each unintegrated learning, determine target document:
   - Architecture pattern → update relevant ADR or create new one
   - Process improvement → update convention or guideline
   - Technical insight → update or create guideline
3. Update the target document with the learning
4. Mark the learning as integrated in long-term memory
5. Update all affected index.md files

## Deliberative Review

Memory promotion is not mechanical — it is **deliberative and strategic**:

1. **Deliberative**: Each promotion involves asking "Is this really validated? Is it generalizable? Will it improve decision-making?"
2. **Strategic**: Promotions are prioritized by impact. High-impact learnings that affect architecture or reliability are promoted first.
3. **Conservative**: When in doubt, keep a learning in its current tier. False positives in long-term memory erode trust.

## Cleanup

- **Session memory**: Cleared after promotion. Raw files can be deleted once learnings are extracted.
- **Short-term memory**: Cleared after collation into long-term memory.
- **Long-term memory**: Only updated by collation or correction. Never deleted (superseded entries are marked).

## Related

- [Documentation Standards](documentation-standards.md) — Format and provenance requirements
- [PR Review Council](../conventions/pr-review-council.md) — Session learnings from council reviews

---

> **Provenance**: Created 2026-03-24 as part of initial project governance setup. Defines the knowledge management workflow for capturing, validating, and integrating project learnings.
