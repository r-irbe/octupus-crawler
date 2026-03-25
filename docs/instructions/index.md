# Instructions Index

Instruction sets that ALL AI agents must follow at all times when working on the IPF distributed crawler project. Instructions are always active — they are never selectively loaded.

## Instructions

| Instruction | Category | Summary |
| --- | --- | --- |
| [Belief Threshold](belief-threshold.md) | Safety | STOP and ask user when confidence < 80%. Calibrated levels: High (80-100%), Medium (60-79%), Low (40-59%), Very Low (0-39%) |
| [Engineering Discipline](engineering-discipline.md) | Quality | 8 core principles: understand before changing, small steps, test everything, fail fast, follow ADRs, keep simple, document decisions, leave it better |
| [Decision Transparency](decision-transparency.md) | Trust | Show work, present alternatives, proactive uncertainty disclosure, no hidden decisions |
| [User Collaboration](user-collaboration.md) | Communication | 10-point collaboration contract, when/how to engage user, question quality standards |
| [Git Safety Protocol](git-safety-protocol.md) | Safety | Branch naming, lifecycle, forbidden actions (force push, reset --hard, direct main commits) |
| [Parallel Work Protocol](parallel-work-protocol.md) | Coordination | Multi-agent parallel execution, conflict prevention, merge strategy, max 5 parallel agents |

## Priority Order

When instructions conflict (rare), resolve in this order:

1. **Belief Threshold** — safety first, always ask when unsure
2. **Git Safety Protocol** — protect the repo, never lose work
3. **Engineering Discipline** — maintain quality standards
4. **User Collaboration** — keep user informed and in control
5. **Decision Transparency** — explain reasoning
6. **Parallel Work Protocol** — coordinate efficiently

## Index

- [Belief Threshold](belief-threshold.md) — Confidence calibration and user escalation
- [Decision Transparency](decision-transparency.md) — Show work and disclose uncertainty
- [Engineering Discipline](engineering-discipline.md) — Core quality principles
- [Git Safety Protocol](git-safety-protocol.md) — Branch safety and forbidden actions
- [Parallel Work Protocol](parallel-work-protocol.md) — Multi-agent coordination
- [User Collaboration](user-collaboration.md) — Communication and engagement standards

---

> **Provenance**: Created 2026-03-24 as the instructions directory index for the IPF distributed crawler project.
