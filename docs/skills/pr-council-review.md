# Skill: PR Council Review

**Agent**: Review

Orchestrate the Ralph-Loop PR Review Council: 6 voting members, specialist advisors, >75% consensus.

## Process

Full spec: [PR Review Council Convention](../conventions/pr-review-council.md)

1. **Round 1**: Specialists analyze → generate findings with evidence
2. **Round 2**: Voters deliberate → debate with specialist input
3. **Round 3**: Vote per finding → >75% threshold → verdict

## Severity

| Severity | Impact |
| --- | --- |
| Critical | Blocks PR, requires redesign |
| Major | Blocks PR until addressed |
| Minor | Non-blocking recommendation |
| Info | Noted for future reference |

## Rules

1. Every finding needs evidence — no unsupported opinions
2. Counter-arguments for every finding
3. Explicit recorded voting; rejected findings documented with reasoning
4. Verify Guard Function compliance (ADR-018 §2), atomic commits (§7), file size (§1)
5. Anti-sycophancy (ADR-019): each voter states ≥1 concern before APPROVE; inject Devil's Advocate if Round 2 yields zero dissent; record minority opinions even when overruled

## Related

- [PR Review Council Convention](../conventions/pr-review-council.md), [Evidence Gathering](evidence-gathering.md)
- [ADR-018](../adr/ADR-018-agentic-coding-conventions.md), [ADR-019](../adr/ADR-019-ideation-decision-protocols.md)
