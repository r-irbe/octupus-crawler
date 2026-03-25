# Skill: PR Council Review

| Field | Value |
| --- | --- |
| **ID** | `pr-council-review` |
| **Status** | Active |
| **Created** | 2026-03-24 |
| **Used By** | Review |

## Purpose

Enables the Review Agent to orchestrate the full Ralph-Loop PR Review Council process with voting members and specialist advisors.

## Capabilities

- Simulate all 6 voting member perspectives
- Simulate relevant specialist advisor perspectives
- Generate structured findings with evidence
- Conduct multi-round deliberation
- Apply >75% consensus voting threshold
- Produce formatted review output

## Process Reference

Full process specification: [PR Review Council Convention](../conventions/pr-review-council.md)

### Quick Reference

```text
Round 1: Specialists analyze → generate findings
Round 2: Voters deliberate → debate with specialist input
Round 3: Vote per finding → >75% threshold → verdict
```

### Severity Classification

| Severity | Threshold | PR Impact |
| --- | --- | --- |
| Critical | Sustained (>75%) | Blocks PR, requires redesign |
| Major | Sustained (>75%) | Blocks PR until addressed |
| Minor | Sustained (>75%) | Non-blocking recommendation |
| Informational | Sustained (>75%) | Noted for future reference |

## Rules

1. Every finding must have evidence — no unsupported opinions
2. Counter-arguments must be presented for every finding
3. Voting is explicit and recorded
4. Rejected findings are documented with rejection reasoning
5. Session learnings are captured for memory promotion
6. **Verify Guard Function compliance** (ADR-018 §2) — check that PRs pass the tsc → eslint → vitest chain
7. **Verify atomic commit discipline** (ADR-018 §7) — one logical change per commit
8. **Verify file size** (ADR-018 §1) — flag files exceeding 300 lines
9. **Anti-sycophancy checks** (ADR-019 §1, §3):
   - No unanimous first-pass approval — each voting member MUST state ≥1 concern before voting APPROVE
   - Detect disagreement collapse: if Round 2 debate produces zero dissent, inject a Devil’s Advocate challenge
   - Confidence-weighted voting: members with domain expertise weigh more on domain-specific findings
   - Minority protection: record dissenting opinions in the review output even if overruled

## Related

- [PR Review Council Convention](../conventions/pr-review-council.md)
- [Review Agent](../agents/review.md)
- [Evidence Gathering Skill](evidence-gathering.md)
- [ADR-018: Agentic Coding](../adr/ADR-018-agentic-coding-conventions.md) — Guard Functions, atomic commits, file size limits
- [ADR-019: Ideation & Decision Protocols](../adr/ADR-019-ideation-decision-protocols.md) — Anti-sycophancy, MAD safeguards, disagreement collapse prevention

---

> **Provenance**: Created 2026-03-24 as part of the AI agent framework. Updated 2026-03-25: added ADR-018 Guard Function, atomic commit, and file size verification rules. Added ADR-019 anti-sycophancy checks, disagreement collapse detection, and minority protection.
