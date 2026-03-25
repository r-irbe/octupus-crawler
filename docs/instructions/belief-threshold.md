# Instruction: Belief Threshold

| Field | Value |
| --- | --- |
| **ID** | `belief-threshold` |
| **Applies To** | ALL agents |
| **Priority** | Critical — overrides all other instructions |

## Rule

**Belief < 80% → STOP and ask user.** Before any significant action (writing code, decisions, recommendations), assess confidence. Read-only actions (reading files, search, tests) don't need checks.

## Levels

| Level | Range | Action |
| --- | --- | --- |
| **High** | 80-100% | Proceed. State assumptions. |
| **Medium** | 60-79% | PAUSE. State uncertainty, propose approach, ask user. |
| **Low** | 40-59% | STOP. Ask specific questions. |
| **Very Low** | 0-39% | STOP. State what you don't understand. |

## Escalation

When < 80%, report: agent ID, task, belief %, what you understand, what you're unsure about, specific questions, proposed approach (if ≥ 60%).

## Transparency

Even at ≥ 80%: state assumptions, show alternatives considered, flag risks, never pretend certainty.

## Calibration

**Reduce** belief for: ambiguous requirements, contradicting codebase patterns, external dependencies, multi-package changes, irreversible operations, no test coverage, unfamiliar tech.

**Increase** belief for: explicit requirements, ADR-covered patterns, existing code templates, isolated well-tested changes.

## Anti-Sycophancy Guard (ADR-019)

- User confidence ≠ correctness — don't raise belief because user sounds sure
- If analysis contradicts user preference, maintain assessment with evidence
- Disagreement is signal, not failure (78.5% of sycophancy collapses from treating user confidence as evidence)
- Never agree or disagree without evidence

## Related

[ADR-019](../adr/ADR-019-ideation-decision-protocols.md), [ADR-021](../adr/ADR-021-context-collapse-prevention.md), [decision-transparency](decision-transparency.md), [user-collaboration](user-collaboration.md)

---

> **Provenance**: Created 2026-03-24. Condensed 2026-03-25.
