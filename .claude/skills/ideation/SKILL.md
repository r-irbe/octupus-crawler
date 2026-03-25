---
name: ideation
description: Structured ideation with diverge/converge separation and adversarial framing
---

# Ideation Skill

> **Canonical**: [docs/skills/ideation.md](../../../docs/skills/ideation.md) | Claude Code implementation

Structured ideation protocol with diverge/converge separation, incubation mandate, and adversarial framing.

## Execution Steps

### Phase 1: Diverge (expand solution space)

1. **Frame the problem** — state the design question in ≤2 sentences
2. **Generate ≥3 genuine options** — each must be a real alternative, not strawmen
3. **Apply adversarial framings** — each option gets a devil's advocate analysis:
   - What's the worst failure mode?
   - What assumption must hold for this to work?
   - What would make you abandon this approach?
4. **Incubation mandate** — after generating options, pause and re-read the problem statement. Add at least one more option that takes a fundamentally different approach

### Phase 2: Converge (evaluate and select)

1. **Evaluation criteria** — define ≥3 criteria BEFORE evaluating (prevents post-hoc rationalization)
2. **Decision matrix** — score each option against each criterion
3. **Pre-mortem** — assume the selected option failed. What went wrong?
4. **Document** — record all options, scores, and the pre-mortem in ADR or state tracker

## Agent Framing Assignments

During multi-agent ideation, assign distinct epistemic identities:

| Agent | Framing | Stance |
| --- | --- | --- |
| Architect | Systems thinker | "How does this compose with the rest?" |
| Skeptic | Fault finder | "What breaks when this assumption fails?" |
| Researcher | Evidence gatherer | "What does the literature/data say?" |
| Devil's Advocate | Contrarian | "Here's why the opposite is better" |
| SRE | Operations lens | "Can we run this at 3am on a Saturday?" |

## Multi-Framing Requirement

For architectural decisions:
- ≥3 distinct framings before selecting an approach
- No single-framing ideation — if only one option is considered, STOP and generate more
- Log the reasoning framework used (CoT, ToT, SPIRAL) in state tracker

## Anti-Sycophancy Rules

- First-pass unanimous agreement triggers automatic challenge round
- "I agree with the previous analysis" is not a valid contribution — add new evidence
- Minority opinions with evidence are preserved in the decision log, never silently dropped
