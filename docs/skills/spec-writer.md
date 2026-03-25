# Skill: Spec Writer

**Agents**: Architect, Gateway

Create the three-document feature specification (requirements.md, design.md, tasks.md). AI drafts, human validates at each gate. Per [ADR-020](../adr/ADR-020-spec-driven-development.md).

## Authorship Model

- Humans own the "what" (requirements, constraints, acceptance criteria)
- AI assists with EARS syntax, design architecture, task decomposition
- Human frames the problem BEFORE AI generation begins
- AI-generated spec content is reviewed and rewritten by human

## Phases

### Phase 1: Brief (Human-led)

Gather goal, constraints, success criteria, affected packages. Read relevant ADRs. **STOP** until confirmed.

### Phase 2: Requirements

Draft EARS requirements in `docs/specs/<feature>/requirements.md`. IDs: `REQ-<FEATURE>-NNN`. Include Gherkin acceptance criteria (Given/When/Then). **STOP** for validation.

### Phase 3: Design

Draft architecture in `docs/specs/<feature>/design.md`. Include Mermaid diagrams, ADR references, TypeScript interfaces. **STOP** for validation.

### Phase 4: Tasks

Draft `docs/specs/<feature>/tasks.md`. Each task: single-concern, test-verifiable, traceable to requirements. Include dependency graph and MVP critical path. **STOP** for validation.

### Phase 5: Index Update

Update `docs/specs/index.md` with new entry, counts, cross-references.

## Tool Implementations

- **Claude Code**: [.claude/skills/spec-writer/SKILL.md](../../.claude/skills/spec-writer/SKILL.md)
- **GitHub Copilot**: [.github/agents/spec-writer.agent.md](../../.github/agents/spec-writer.agent.md)

## Related

- [ADR-020](../adr/ADR-020-spec-driven-development.md) — EARS requirements, contract-first
- [ADR-019](../adr/ADR-019-ideation-decision-protocols.md) — structured ideation for design options
- [Plan Feature](plan-feature.md), [Ideation](ideation.md)

---

> **Provenance**: Created 2026-03-25. Canonical source for spec writing — tool-specific files extend this.
