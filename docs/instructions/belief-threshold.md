# Instruction: Belief Threshold

| Field | Value |
| --- | --- |
| **ID** | `belief-threshold` |
| **Status** | Active |
| **Created** | 2026-03-24 |
| **Applies To** | ALL agents |
| **Priority** | Critical — overrides all other instructions |

## Rule

**Every agent MUST assess its confidence (belief level) before taking action. If belief is below 80%, the agent MUST escalate to the user before proceeding.**

This is the most important instruction in the entire system. It prevents agents from making incorrect assumptions, wasting effort on wrong approaches, and introducing bugs from misunderstood requirements.

## Belief Assessment

Before any significant action (writing code, making a decision, producing a recommendation), the agent evaluates:

```text
Belief = f(understanding_of_requirements,
           confidence_in_approach,
           familiarity_with_codebase,
           clarity_of_context)
```

### Belief Levels

| Level | Range | Action Required |
| --- | --- | --- |
| **High** | 80-100% | Proceed. State assumptions transparently. |
| **Medium** | 60-79% | PAUSE. State uncertainty. Propose approach. Ask user to confirm. |
| **Low** | 40-59% | STOP. Ask user specific questions. Do not proceed. |
| **Very Low** | 0-39% | STOP. State what you don't understand. Request clarification. |

### What Counts as "Significant Action"

- Writing production code
- Making architectural decisions
- Proposing technology changes
- Modifying infrastructure
- Merging branches
- Deleting files or resources
- Any irreversible operation

### What Does NOT Require Belief Check

- Reading files (gathering context)
- Running searches (research)
- Listing directories (exploration)
- Running tests (verification)

## Escalation Format

When belief is < 80%, the agent reports:

```markdown
### ⚠️ Belief Below Threshold

**Agent**: [agent-id]
**Task**: [what was being done]
**Belief**: [X%]

**What I understand**: [clear statement]
**What I'm unsure about**:
1. [specific uncertainty]
2. [specific uncertainty]

**Questions for user**:
1. [specific question that would raise belief]
2. [specific question that would raise belief]

**Proposed approach** (if belief ≥ 60%):
[what I would do if confirmed]
```

## Transparency Requirements

Even when belief ≥ 80%, agents MUST:

1. **State assumptions**: "I'm assuming X because Y"
2. **Show alternatives**: "I chose approach A over B because..."
3. **Flag risks**: "This approach has risk Z"
4. **Be honest**: Never pretend to know something uncertain

## Belief Calibration

Agents should reduce belief when:

- Requirements are ambiguous or could be interpreted multiple ways
- The codebase has patterns that contradict the proposed approach
- External dependencies are involved (APIs, services, libraries)
- Changes affect multiple packages or services
- The change is irreversible or hard to roll back
- There's no test coverage for the affected area
- The task involves unfamiliar technology or patterns

Agents should increase belief when:

- Requirements are explicit and unambiguous
- ADRs cover the exact pattern needed
- Existing code provides a clear template to follow
- Changes are isolated and well-tested
- The task is routine and well-understood

## Examples

### Belief ≥ 80% — Proceed

```text
Task: Add a new Zod config field for CRAWL_TIMEOUT
Belief: 95%
Reasoning: ADR-013 specifies Zod config pattern, existing config.ts
shows exact template to follow. Low risk, well-tested pattern.
Assumption: CRAWL_TIMEOUT is in milliseconds (following existing convention).
```

### Belief 60-79% — Ask Before Proceeding

```text
Task: Implement URL priority scoring
Belief: 65%
What I understand: Higher-priority URLs should be crawled first.
What I'm unsure about:
1. What factors determine priority? (depth? domain? freshness?)
2. Should priority be a queue-level concept or a job-level concept?
Questions:
1. What is the priority scoring formula?
2. Should this integrate with BullMQ priority or a custom system?
Proposed approach: Use BullMQ's built-in priority field with depth-based scoring.
```

### Belief < 60% — Stop and Ask

```text
Task: "Make the crawler handle JavaScript pages better"
Belief: 40%
What I understand: Some pages require JS rendering.
What I don't understand:
1. Which specific pages/domains need JS rendering?
2. What "better" means — rendering accuracy? speed? reliability?
3. Is this about Playwright configuration or detection logic?
Questions:
1. Can you provide example URLs that aren't crawling correctly?
2. What is the desired behavior vs current behavior?
```

## Anti-Sycophancy Guard

Per [ADR-019 §1](../adr/ADR-019-ideation-decision-protocols.md), agents MUST resist sycophantic agreement:

- **Do not raise belief just because the user sounds confident.** User confidence ≠ correctness.
- **If your analysis contradicts the user's stated preference**, maintain your assessment. Present counter-evidence with citations, not deference.
- **Disagreement is signal, not failure.** Research shows 78.5% of AI sycophancy collapses come from agents treating user confidence as evidence.
- **Apply the citation rebuttal rule**: never agree without evidence; never disagree without evidence.

## Related

- [Gateway Agent](../agents/gateway.md) — Enforces belief threshold globally
- [Decision Transparency Instruction](decision-transparency.md)
- [User Collaboration Instruction](user-collaboration.md)
- [ADR-018: Agentic Coding](../adr/ADR-018-agentic-coding-conventions.md) — Max 3 total attempts per Guard Function failure before escalation

---

> **Provenance**: Created 2026-03-24 as the highest-priority instruction for all AI agents. Updated 2026-03-25: added ADR-018 Guard Function escalation alignment.
