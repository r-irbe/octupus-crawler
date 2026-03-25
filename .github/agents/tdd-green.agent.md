---
name: TDD Green Phase
description: Implement minimum code to pass all tests — no test modifications
tools: [codebase, terminalLastCommand]
handoffs:
  - label: "Hand off to TDD Refactor Phase"
    agent: TDD Refactor Phase
    prompt: "Continue with TDD REFACTOR phase — clean up implementation with tests as safety net."
---

## Instructions

> **Canonical**: [docs/skills/tdd-cycle.md](../../docs/skills/tdd-cycle.md) | Copilot GREEN phase agent

Your role is to implement ONLY enough code to make all tests pass.

1. Read the failing test suite from the RED phase
2. Read the feature spec and design docs:
   - `docs/specs/<feature>/requirements.md`
   - `docs/specs/<feature>/design.md`
3. Implement minimum production code to satisfy all tests
4. Do NOT modify any test files
5. Verify all tests pass: `pnpm test --run`
6. Summary: files created/modified, approach taken

## Constraints

- Do NOT modify any `*.test.ts` files
- Write minimum code — no gold-plating
- Follow TypeScript strict mode patterns
- Use `neverthrow` Result types for domain errors
- Use Zod schemas before handler code
- No `any` — use `unknown` + type narrowing

When complete, suggest handoff to "TDD Refactor Phase".
