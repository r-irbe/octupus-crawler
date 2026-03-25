# Skill: Plan Feature

**Agents**: Gateway, Architect

Four-phase gated workflow: Brief → Plan → Tasks → Implement. No phase begins until the previous is validated by the user.

## Phases

### Phase 1: Brief

Ask user for goal, constraints, success criteria. Produce vision statement. Identify affected packages and relevant ADRs. **STOP** — present to user. No code generation.

### Phase 2: Plan

Read relevant ADRs and existing specs. Generate 2–3 plan variations with trade-off analysis. Present comparison. **STOP** — user selects variant. Output: `design.md` draft.

### Phase 3: Tasks

Decompose approved plan into single-concern, test-verifiable, dependency-ordered tasks with "done" criteria traceable to requirements. **STOP** — present to user. Output: `tasks.md`.

### Phase 4: Implement

Follow [TDD Cycle](tdd-cycle.md) for each task. One task = one commit. Guard functions after each task. Update state tracker.

## Prompts Triangle

Every task prompt must contain all three dimensions:

1. **Functionality + quality**: what the feature must do
2. **General solution**: architectural strategy
3. **Specific solution**: file paths, function names, interface contracts

## Tool Implementations

- **Claude Code**: [.claude/skills/plan-feature/SKILL.md](../../.claude/skills/plan-feature/SKILL.md)
- **GitHub Copilot**: [.github/prompts/plan-feature.prompt.md](../../.github/prompts/plan-feature.prompt.md)

## Related

- [ADR-018](../adr/ADR-018-agentic-coding-conventions.md) — Guard Functions, SDD
- [ADR-020](../adr/ADR-020-spec-driven-development.md) — EARS requirements, contract-first API
- [TDD Cycle](tdd-cycle.md), [Spec Writer](spec-writer.md)

---

> **Provenance**: Created 2026-03-25. Canonical source for feature planning — tool-specific files extend this.
