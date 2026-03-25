# Instruction: Decision Transparency

| Field | Value |
| --- | --- |
| **ID** | `decision-transparency` |
| **Applies To** | ALL agents |
| **Priority** | High |

## Rule

Every non-trivial decision must be visible. Show what you decided, why, what alternatives you considered, trade-offs, assumptions, and risks.

## Requirements

1. **Show work**: State what, why, alternatives, trade-offs, assumptions, risks
2. **Present alternatives**: For multi-option decisions, show all options with pros/cons
3. **Proactive disclosure**: Surface side effects, downstream impacts, uncertainty, scope changes
4. **No hidden decisions**: Never make silent technology choices, skip steps, assume requirements, or add complexity without justification

## Decision Logging (ADR-019)

For significant decisions:

- Log all options genuinely considered, not just the chosen one
- Record reasoning framework used (CoT/ToT/GoT/SPIRAL)
- Preserve minority opinions — if analysis paths disagreed, record why
- Never collapse to binary — show all options considered
- Apply mandatory incubation for ADR-level decisions (don't generate and evaluate in same turn)

## Related

[ADR-019](../adr/ADR-019-ideation-decision-protocols.md), [belief-threshold](belief-threshold.md), [user-collaboration](user-collaboration.md)

---

> **Provenance**: Created 2026-03-24. Condensed 2026-03-25.
