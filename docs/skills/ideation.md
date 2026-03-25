# Skill: Ideation

**Agents**: Gateway, Architect

Structured ideation with diverge/converge separation, incubation mandate, and adversarial framing. Per [ADR-019](../adr/ADR-019-ideation-decision-protocols.md).

## Phase 1: Diverge

1. **Frame** the problem in ≤2 sentences
2. **Generate ≥3 genuine options** — each a real alternative, not strawmen
3. **Adversarial framing** — for each option: worst failure mode? key assumption? abandonment trigger?
4. **Incubation mandate** — pause, re-read problem, add ≥1 fundamentally different approach

## Phase 2: Converge

1. **Define ≥3 criteria** BEFORE evaluating (prevents post-hoc rationalization)
2. **Decision matrix** — score each option against each criterion
3. **Pre-mortem** — assume selected option failed; what went wrong?
4. **Document** — all options, scores, pre-mortem in ADR or state tracker

## Agent Framing Assignments

| Framing | Stance |
| --- | --- |
| Systems thinker | "How does this compose with the rest?" |
| Fault finder | "What breaks when this assumption fails?" |
| Evidence gatherer | "What does the data say?" |
| Contrarian | "Here's why the opposite is better" |
| Operations lens | "Can we run this at 3am on a Saturday?" |

≥3 framings required for architectural decisions. No single-framing ideation.

## Anti-Sycophancy Rules

- First-pass unanimous agreement triggers automatic challenge round
- "I agree" is not a valid contribution — add new evidence
- Minority opinions with evidence are preserved, never silently dropped

## Tool Implementations

- **Claude Code**: [.claude/skills/ideation/SKILL.md](../../.claude/skills/ideation/SKILL.md)
- **GitHub Copilot**: Use structured prompting with ADR-019 references

## Related

- [ADR-019](../adr/ADR-019-ideation-decision-protocols.md), [ADR-018](../adr/ADR-018-agentic-coding-conventions.md)
- [Evidence Gathering](evidence-gathering.md), [ADR Management](adr-management.md)

---

> **Provenance**: Created 2026-03-25. Canonical source for structured ideation — tool-specific files extend this.
