---
name: tdd-cycle
description: Execute RED→GREEN→REFACTOR TDD cycle with context isolation
---

# TDD Cycle Skill

> **Canonical**: [docs/skills/tdd-cycle.md](../../../docs/skills/tdd-cycle.md) | Claude Code implementation

Execute the RED → GREEN → REFACTOR cycle for a feature implementation. Each phase has strict context isolation and machine-verifiable success criteria.

## Phase 1: RED (Test Writer)

1. Read the feature spec: `docs/specs/<feature>/requirements.md` + `design.md`
2. Read interface contracts from `packages/core/src/`
3. Write comprehensive failing tests in `<feature>/*.test.ts`
4. Verify: `pnpm test --run` exits non-zero with all new tests failing
5. Do NOT read or write any production implementation files
6. Report: test file paths, test count, failure reason for each

**Success criterion**: `pnpm test --run` exits non-zero with expected failures only.

## Phase 2: GREEN (Implementer)

1. Read the failing test suite (output from RED phase)
2. Read the feature spec and design docs
3. Write minimum production code to make all tests pass
4. Do NOT modify any test files
5. Verify: `pnpm test --run` exits zero
6. Report: implementation file paths, approach taken

**Success criterion**: `pnpm test --run` exits zero. No test files modified.

## Phase 3: REFACTOR (Quality)

1. Read full codebase context for the feature
2. Review implementation for: naming, duplication, type safety, CUPID qualities
3. Check file sizes (≤200 target, 300 hard limit)
4. Refactor incrementally, running tests after each change
5. Verify: `pnpm test --run` exits zero AND `pnpm lint` passes
6. Report: changes made, quality improvements

**Success criterion**: `pnpm test --run` exits zero AND `pnpm lint` passes. No new failures.

## Context Isolation

- RED phase agent has NO access to production implementation files
- GREEN phase agent does NOT modify test files
- REFACTOR phase sees the full codebase
- For Claude Code: use separate subagent sessions or git worktrees
- For Copilot: use custom chat mode handoffs

## Verification Checkpoints

After each phase, run the guard function chain:
```bash
pnpm turbo typecheck && pnpm turbo lint && pnpm turbo test
```

## Dual-State Code Loop

```
spec → plan → task → RED → GREEN → REFACTOR → guard chain → commit/retry
```

Each state transition is logged in the state tracker. Never skip from spec to generate.
