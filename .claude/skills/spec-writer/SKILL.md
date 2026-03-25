---
name: spec-writer
description: Create three-document feature spec (requirements.md, design.md, tasks.md)
---

# Spec Writer Skill

> **Canonical**: [docs/skills/spec-writer.md](../../../docs/skills/spec-writer.md) | Claude Code implementation

Create the three-document feature specification. AI drafts, human validates at each gate.

## Phase 1: Brief (Human-led)

1. Ask user for: goal, constraints, success criteria, affected packages
2. Confirm understanding — do NOT proceed until user validates
3. Read relevant ADRs from the routing table in AGENTS.md

**No code or spec generation until brief is confirmed.**

## Phase 2: Requirements (Architect drafts, human validates)

1. Draft EARS requirements in `docs/specs/<feature>/requirements.md`
2. Each requirement uses EARS pattern: Ubiquitous / Event-driven / State-driven
3. Requirement IDs: `REQ-<FEATURE>-NNN` format
4. Include acceptance criteria in Gherkin format (Given/When/Then)
5. Include requirement count summary and traceability table
6. **STOP** — present to user for validation. Do NOT proceed without approval.

## Phase 3: Design (Architect drafts, human validates)

1. Draft architecture in `docs/specs/<feature>/design.md`
2. Include Mermaid diagrams for data flow and component interaction
3. Reference relevant ADRs and existing packages
4. Define interfaces and data models with TypeScript type signatures
5. **STOP** — present to user for validation. Do NOT proceed without approval.

## Phase 4: Tasks (Architect drafts, human validates)

1. Draft implementation tasks in `docs/specs/<feature>/tasks.md`
2. Each task: single-concern, test-verifiable, traceable to requirements
3. Include dependency graph and phase ordering
4. Identify MVP critical path
5. **STOP** — present to user for validation. Do NOT proceed without approval.

## Phase 5: Index Update

1. Update `docs/specs/index.md` with new spec entry
2. Update requirement count totals
3. Add cross-references to related specs

## Authorship Model

- Humans own the "what" (requirements, constraints, acceptance criteria)
- AI assists with EARS syntax, design architecture, task decomposition
- Human frames the problem BEFORE AI generation begins
- AI-generated spec content is reviewed and rewritten by human
