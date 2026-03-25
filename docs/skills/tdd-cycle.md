# Skill: TDD Cycle

**Agents**: Implementation, Test

Execute RED → GREEN → REFACTOR cycle with strict context isolation and machine-verifiable phase transitions.

## Phases

### RED (Test Writer)

1. Read spec: `requirements.md` + `design.md` + interface contracts
2. Write comprehensive failing tests (co-located `*.test.ts`)
3. Each test references requirement: `// Validates REQ-XXX-NNN`
4. Verify: `pnpm test --run` fails with expected failures only
5. Do NOT read or write production implementation files

### GREEN (Implementer)

1. Read failing test suite and feature spec
2. Write minimum production code to pass all tests
3. Do NOT modify test files
4. Verify: `pnpm test --run` passes

### REFACTOR (Quality)

1. Review for naming, duplication, CUPID qualities, file sizes (≤200/300)
2. Refactor incrementally — run tests after each change
3. Verify: `pnpm test --run` passes AND `pnpm lint` passes

## Context Isolation

- **RED**: no access to production implementation files
- **GREEN**: no modification of test files
- **REFACTOR**: full codebase access

## Verification

After each phase: `pnpm turbo typecheck && pnpm turbo lint && pnpm turbo test`

## Tool Implementations

- **Claude Code**: [.claude/skills/tdd-cycle/SKILL.md](../../.claude/skills/tdd-cycle/SKILL.md) — uses subagent sessions for phase isolation
- **GitHub Copilot**: [.github/agents/tdd-red.agent.md](../../.github/agents/tdd-red.agent.md), [tdd-green.agent.md](../../.github/agents/tdd-green.agent.md), [tdd-refactor.agent.md](../../.github/agents/tdd-refactor.agent.md) — uses agent handoffs

## Related

- [ADR-007](../adr/ADR-007-testing-strategy.md), [ADR-018](../adr/ADR-018-agentic-coding-conventions.md), [ADR-020](../adr/ADR-020-spec-driven-development.md)
- [Test Generation](test-generation.md), [Code Generation](code-generation.md)

---

> **Provenance**: Created 2026-03-25. Canonical source for TDD cycle — tool-specific files extend this.
