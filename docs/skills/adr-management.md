# Skill: ADR Management

| Field | Value |
| --- | --- |
| **ID** | `adr-management` |
| **Status** | Active |
| **Created** | 2026-03-24 |
| **Used By** | Architect, Documentation, Review |

## Purpose

Enables agents to create, update, query, and deprecate Architecture Decision Records following the project's ADR template and conventions.

## Capabilities

### Query ADRs

- Find ADRs relevant to a topic via index or content search
- Check if a proposed change aligns with existing ADRs
- Identify ADRs that may need updating based on new information

### Create ADRs

1. Use the [ADR Template](../adr/TEMPLATE.md)
2. Assign next sequential number (ADR-NNN)
3. File name: `ADR-NNN-slug.md`
4. Status: `Proposed` (requires user approval to move to `Accepted`)
5. Must include: Context, Decision Drivers, ≥2 Options with pros/cons, Decision, Consequences, Validation criteria

### Update ADRs

- Update status: Proposed → Accepted → Deprecated/Superseded
- Add new information to Consequences or Validation sections
- Link related ADRs when new decisions affect existing ones
- Update `Last Updated` date

### Deprecate/Supersede ADRs

- Set status to `Deprecated` or `Superseded`
- Fill in `Superseded By` field with the new ADR reference
- Keep the old ADR in place (never delete — historical record)

## Rules

1. **Never** skip the Considered Options section — always show ≥3 genuine alternatives (not strawmen) per ADR-019 §4
2. **Always** include Validation criteria — how will we know this was right?
3. **Always** cross-reference Related ADRs
4. **Require user approval** for new ADRs and status changes
5. Update `docs/adr/index.md` after any ADR change
6. **Apply structured ideation** (ADR-019 §4) when generating options:
   - Use Six Thinking Hats: Green Hat for creative alternatives, Black Hat for risk analysis
   - Apply pre-mortem: “Assume this decision failed in 6 months — why?”
   - Consider SCAMPER prompts for variation: Substitute, Combine, Adapt, Modify, Put to other uses, Eliminate, Reverse
7. **Respect mandatory incubation** (ADR-019 §6): never generate options and evaluate them in the same agent turn for new ADRs — generate first, return to user, then evaluate in a separate pass

## Related

- [ADR-019: Ideation & Decision Protocols](../adr/ADR-019-ideation-decision-protocols.md) — Structured ideation, incubation mandate
- [ADR Template](../adr/TEMPLATE.md)
- [ADR Index](../adr/index.md)
- [Architect Agent](../agents/architect.md) — Primary user
- [Documentation Standards](../guidelines/documentation-standards.md)

---

> **Provenance**: Created 2026-03-24 as part of the AI agent framework. Updated 2026-03-25: added ADR-019 structured ideation methods, pre-mortem, SCAMPER, and mandatory incubation for ADR creation.
