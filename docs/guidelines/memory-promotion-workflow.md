# Memory Promotion Workflow

Learnings flow through 4 tiers: **Session** (ephemeral) → **Short-term** (validated) → **Long-term** (generalized) → **Project Docs** (ADRs, guidelines, conventions).

## Tiers

| Tier | Location | TTL | Content |
| --- | --- | --- | --- |
| Session | `docs/memory/session/` | End of session | Raw observations, hypotheses, decisions |
| Short-term | `docs/memory/short-term/` | Until collated | Validated learnings with evidence |
| Long-term | `docs/memory/long-term/` | Permanent | Generalized principles, anti-patterns |
| Project Docs | `docs/adr/`, `docs/guidelines/` | Permanent | Integrated into ADRs/guidelines |

## Promotion Steps

1. **Session capture**: During work, record observations, decisions, problems/solutions, hypotheses in `session/YYYY-MM-DD-topic.md`
2. **Session review**: After major task set → assess each learning: validated? generalizable? actionable? Promote validated learnings to short-term.
3. **SSGM Gate Check**: Before any promotion, the learning must pass all three gates:
   - **Relevance**: Is this directly useful for future tasks in this project?
   - **Evidence**: Is there concrete evidence (test, metric, incident, reproduction)?
   - **Coherence**: Does this align with existing ADRs and long-term memory? No contradictions?
   - If any gate fails → reject with logged reason. Do not promote.
4. **Short-term promotion**: Record learning with evidence, confidence, validation method, suggested actions.
5. **Long-term collation**: When patterns emerge across sessions → generalize into principles. Remove superseded short-term entries.
6. **Document integration**: Unintegrated long-term learnings → update ADR/guideline/convention. Mark as integrated.

### SSGM Rejection Log

When a learning fails an SSGM gate, record:

| Field | Description |
| --- | --- |
| Learning | One-line summary of the rejected learning |
| Failed gate | Relevance / Evidence / Coherence |
| Reason | Why it failed the gate |
| Date | When rejected |
| Source | Which session file it came from |

## Validation Criteria

| Criterion | Evidence |
| --- | --- |
| Confirmed by test | Test case exercising the behavior |
| Confirmed by review | PR council finding or reviewer agreement |
| Confirmed by production | Metrics, logs, incidents |
| Confirmed by reproduction | Independently reproduced |

## Principles

- **Deliberative**: "Is this validated? Generalizable? Will it improve decisions?"
- **Strategic**: High-impact learnings (architecture, reliability) promoted first
- **Conservative**: When in doubt, keep in current tier. False positives erode trust.

## Integration Targets

Promoted learnings MUST be integrated back into the system — not left as passive notes:

| Learning Type | Integration Target | Action |
| --- | --- | --- |
| Anti-pattern | `.claude/rules/` | Add rule to prevent recurrence |
| Workflow improvement | `.claude/skills/` | Update skill execution steps |
| Convention | `.github/instructions/` | Add path-scoped instruction |
| Architecture insight | `docs/adr/` | Update ADR consequences or create new ADR |
| Tooling discovery | Worklog + short-term memory | Document for future sessions |

## Cleanup

Session → cleared after promotion. Short-term → cleared after collation. Long-term → only updated, never deleted.

## Related

[ADR-022](../adr/ADR-022-memory-governance.md), [ADR-021](../adr/ADR-021-context-collapse-prevention.md), [Documentation Standards](documentation-standards.md), [Doc Maintenance Skill](../skills/doc-maintenance.md)

---

> **Provenance**: Created 2026-03-24. Condensed 2026-03-25. Updated 2026-03-25: added SSGM gates, rejection log, integration targets.
