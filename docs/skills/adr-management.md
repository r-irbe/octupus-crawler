# Skill: ADR Management

**Agents**: Architect, Documentation, Review

Create, update, query, and deprecate Architecture Decision Records.

## Operations

- **Query**: Find ADRs by topic, check alignment, identify update needs
- **Create**: Use [ADR Template](../adr/TEMPLATE.md), assign sequential number, status `Proposed` (user approval → `Accepted`). Must include: Context, Drivers, ≥2 Options with pros/cons, Decision, Consequences, Validation
- **Update**: Status transitions, amend Consequences/Validation, cross-link related ADRs, update date
- **Deprecate**: Set status to Deprecated/Superseded, fill `Superseded By`. Never delete — historical record

## Rules

1. Always show ≥3 genuine alternatives (not strawmen) per ADR-019 §4
2. Always include validation criteria
3. Cross-reference related ADRs; update `docs/adr/index.md`
4. Require user approval for new ADRs and status changes
5. Apply structured ideation (ADR-019): Six Hats, pre-mortem, SCAMPER
6. Mandatory incubation (ADR-019 §6): never generate AND evaluate options in same agent turn

## Related

- [ADR Template](../adr/TEMPLATE.md), [ADR Index](../adr/index.md)
- [ADR-019](../adr/ADR-019-ideation-decision-protocols.md), [Architect Agent](../agents/architect.md)
