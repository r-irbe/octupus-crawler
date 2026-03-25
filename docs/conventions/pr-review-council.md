# PR Review Council Convention

| Field | Value |
| --- | --- |
| **Status** | Accepted |
| **Style** | Google-style PR + AI Ralph-Loop council reviews |

## Overview

All PRs undergo AI Council review: **6 voting members** (>75% consensus) + **20 non-voting specialist advisors** providing evidence.

## PR Convention

**Title**: `<type>(<scope>): <short summary>` — types: feat, fix, refactor, perf, test, docs, chore, ci, build.

**Description**: Summary, Motivation (link ADR/issue), Changes (bullets), Testing checklist, ADR Alignment, Rollback Plan.

## Council Composition

### Voting Members (6) — >75% (5/6) to sustain a finding

| Role | Focus |
| --- | --- |
| Architect | Design, patterns, ADR alignment |
| Skeptic | Challenge assumptions, edge cases |
| Socratic Advisor | Surface implicit assumptions |
| Devil's Advocate | Argue opposing position, find failure modes |
| Product Manager | User impact, business value, scope |
| SRE | Reliability, observability, operational burden |

### Non-Voting Specialist Advisors (20)

DevOps, DevEx, SecOps, SecEng, SRE (Advisor), Network Engineer, UI Designer, UX Researcher, API Designer, Enterprise Architect, Sales, Executive, Research Engineer, Data Engineer, AI Engineer, Data Scientist, Prompt Engineer, AI Architect, Distributed Systems Specialist, QA Engineer.

## Review Process: Ralph-Loop (3 Rounds)

**Round 1 — Analysis**: Specialists review through their lens, produce structured findings (ID, severity, category, evidence, recommendation, counter-evidence, related ADR).

**Round 2 — Deliberation**: Voting members debate findings. Socratic Advisor surfaces assumptions. Devil's Advocate stress-tests. Skeptic challenges confidence. Any member can escalate severity or request more evidence.

**Round 3 — Vote**: Each finding voted Accept/Reject individually. Sustained (>75%) Critical/Major → block PR. Minor → recommendation. Informational → noted.

### Verdicts

| Verdict | Condition |
| --- | --- |
| APPROVED | No sustained Critical/Major |
| CHANGES REQUESTED | ≥1 sustained Major |
| REJECTED | ≥1 sustained Critical (redesign needed) |
| DEFERRED | Insufficient evidence |

## Anti-Sycophancy Safeguards (ADR-019)

1. **No unanimous first-pass**: Each voting member MUST state ≥1 concern before approving. Zero-concern findings get automatic Devil's Advocate challenge.
2. **Disagreement collapse detection**: <2 dissenting arguments across all findings → Gateway injects challenge round.
3. **Minority opinion preservation**: Evidence-backed dissent MUST be recorded, never silently discarded.
4. **Citation rebuttal**: "I disagree" insufficient — must provide counter-evidence.
5. **Role separation**: Skeptic, Devil's Advocate, Socratic Advisor are distinct cognitive stances — never collapse into one.

## Review-by-Explanation Gate

Each voting member must verify they can **explain the implementation** before APPROVE (86% comprehension via Generation-then-Comprehension vs 50% for copy-paste).

## Escalation

No consensus after 3 rounds → human reviewer. Member recusal → 4/5 (80%). All specialists agree but voters disagree → mandatory additional round.

## CI/CD Integration

PR opened → council review → structured comment → Critical/Major → status check fails → author fixes → re-review deltas only → APPROVED → merge allowed.

## Related

[ADR-012](../adr/ADR-012-ci-cd-pipeline.md), [ADR-018](../adr/ADR-018-agentic-coding-conventions.md), [ADR-019](../adr/ADR-019-ideation-decision-protocols.md), [ADR-020](../adr/ADR-020-spec-driven-development.md)

---

> **Provenance**: Created 2026-03-24. Condensed 2026-03-25.
