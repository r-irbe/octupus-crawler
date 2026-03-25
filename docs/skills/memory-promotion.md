# Skill: Memory Promotion

**Agents**: Documentation, Gateway

Execute memory promotion workflow: capture session learnings → validate → promote through tiers → integrate into docs. This is the mechanism by which the agent system improves over time.

## Flow

`Session` → validate → `Short-Term` → collate → `Long-Term` → integrate → ADRs/Guidelines/Rules/Skills

Full spec: [Memory Promotion Workflow](../guidelines/memory-promotion-workflow.md)

## Triggers

| Trigger | Action |
| --- | --- |
| Major task set completed | Gateway triggers Documentation Agent |
| PR review completed | Review Agent captures learnings |
| Debug session completed | Debug Agent captures findings |
| Architecture decision | Architect Agent captures reasoning |
| Worklog written (Gate G9) | Documentation Agent reviews for promotable learnings |

## SSGM Gates

Before promoting ANY learning, it must pass all three gates:

- **Relevance**: Directly useful for future tasks in this project?
- **Evidence**: Concrete evidence (test, metric, incident, reproduction)?
- **Coherence**: Aligns with existing ADRs and long-term memory? No contradictions?

If any gate fails → reject with logged reason in SSGM Rejection Log.

## Integration Targets

Validated learnings don't just sit in memory — they improve the system:

| Learning Type | Integration Target | Example |
| --- | --- | --- |
| Anti-pattern discovered | `.claude/rules/` | "Never use X because Y" |
| Workflow improvement | `.claude/skills/` | Better TDD cycle step |
| Convention solidified | `.github/instructions/` | New naming pattern |
| Architecture insight | `docs/adr/` | ADR consequence update |
| Tool discovery | Worklog + short-term | Copilot format change |

## Validation

- Confirmed by test, review, production metrics, or independent reproduction
- Don't promote unvalidated hypotheses
- Don't skip tiers (session → short-term → long-term)
- Check for existing entries before creating new files
- Mark confidence level on all promoted memories

## Related

- [Memory Promotion Workflow](../guidelines/memory-promotion-workflow.md)
- [Doc Maintenance](doc-maintenance.md) — indexes, cross-references, provenance
- [ADR-022](../adr/ADR-022-memory-governance.md) — SSGM gates, temporal decay, poisoning prevention
