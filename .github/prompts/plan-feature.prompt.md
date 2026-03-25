---
name: Plan Feature
description: Create a structured plan for a new feature with ADR references
---

> **Canonical**: [docs/skills/plan-feature.md](../../docs/skills/plan-feature.md) | Copilot feature planning prompt

## Feature: {{feature_name}}

### Brief

**Goal**: {{goal}}
**Constraints**: {{constraints}}
**Success Criteria**: {{success_criteria}}
**Affected Packages**: {{packages}}

### Relevant ADRs

Check the ADR routing table in AGENTS.md and list applicable ADRs:

- ADR-NNN: reason it applies

### Plan

1. Read existing specs in `docs/specs/` for related features
2. Generate 2–3 plan variations with trade-offs
3. Present comparison for user selection
4. Draft `docs/specs/{{feature_name}}/requirements.md` (EARS format)
5. Draft `docs/specs/{{feature_name}}/design.md` (architecture + Mermaid)
6. Draft `docs/specs/{{feature_name}}/tasks.md` (dependency-ordered)

### Questions

Before proceeding, clarify:

1. Which autonomy tier? (1=suggestion, 2=constrained, 3=supervised)
2. Are there existing patterns to follow from other features?
3. Any hard deadlines or ordering constraints?
