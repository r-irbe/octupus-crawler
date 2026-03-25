---
name: plan-feature
description: Four-phase gated workflow for feature planning (Brief→Plan→Tasks→Implement)
---

# Plan Feature Skill

> **Canonical**: [docs/skills/plan-feature.md](../../../docs/skills/plan-feature.md) | Claude Code implementation

Four-phase gated structure. No phase begins until the previous is validated by the user.

## Phase 1: Brief

1. Ask user for: goal, constraints, success criteria
2. Produce a 1–2 paragraph vision statement
3. Identify affected packages and relevant ADRs
4. **STOP** — present brief to user. Do NOT proceed until user validates.

**No code generation in this phase.**

## Phase 2: Plan

1. Read relevant ADRs from the routing table in AGENTS.md
2. Read existing specs in `docs/specs/` for related features
3. Generate 2–3 plan variations with trade-off analysis
4. Present comparison to user
5. **STOP** — user selects plan variant. Do NOT proceed until user validates.

Output: `docs/specs/<feature>/design.md` draft

## Phase 3: Tasks

1. Decompose the approved plan into self-contained work packages
2. Each task must be:
   - Single-concern
   - Test-verifiable
   - File-scoped (or explicitly multi-file with defined interfaces)
   - Complete with "done" criteria traceable to requirements
3. Order tasks by dependency
4. **STOP** — present tasks to user. Do NOT proceed until user validates.

Output: `docs/specs/<feature>/tasks.md`

## Phase 4: Implement

1. Follow the TDD cycle skill for each task
2. One task = one commit
3. Run guard functions after each task
4. Update state tracker after each task

## Prompts Triangle

Every task prompt must contain all three dimensions:
1. **Functionality + quality**: what the feature must do
2. **General solution**: architectural strategy
3. **Specific solution**: file paths, function names, interface contracts
