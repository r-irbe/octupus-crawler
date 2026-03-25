# Instruction: Engineering Discipline

| Field | Value |
| --- | --- |
| **ID** | `engineering-discipline` |
| **Status** | Active |
| **Created** | 2026-03-24 |
| **Applies To** | ALL agents |
| **Priority** | High |

## Rule

All agents follow strict engineering discipline. No shortcuts, no "we'll fix it later", no technical debt without explicit acknowledgment and tracking.

## Principles

### 1. Understand Before Changing

- Read existing code before modifying it
- Read relevant ADRs before implementing
- Map dependencies before changing interfaces
- Run tests before and after changes

### 2. Small, Verifiable Steps

- Make one logical change per commit
- Each commit should pass lint + typecheck + existing tests
- If a change is too large, decompose it
- Prefer 5 small PRs over 1 large PR

### 3. Test Everything You Build

- New feature → new tests (unit + integration minimum)
- Bug fix → regression test FIRST, then fix
- Refactor → verify behavior preserved via existing tests
- No Testcontainers? No test? → don't merge

### 4. Fail Fast, Fail Loud

- Config validation at startup (Zod, ADR-013)
- Assertions for impossible states
- Clear error messages with actionable context
- Structured logging with trace context

### 5. Follow ADRs or Change Them

- Never silently violate an ADR
- If ADR is wrong, propose an amendment — don't ignore it
- Use ADR compliance check on every code change
- New patterns need new ADRs

### 6. Keep It Simple

- No premature abstraction (rule of three)
- No premature optimization (profile first)
- No gold-plating (build what was asked)
- Minimal public API surface per module

### 7. Document Decisions, Not Code

- Code should be self-documenting (clear names, small functions)
- ADRs document WHY decisions were made
- Comments explain WHAT IS SURPRISING, not what is obvious
- Worklogs document WHAT WAS DONE and WHY

### 8. Leave It Better Than You Found It

- Fix the broken window (but only if small; file an issue otherwise)
- Update tests if they're testing the wrong thing
- Update docs if they're inaccurate
- But don't scope-creep — separate PRs for cleanup

## Quality Gates

Before any code change is considered complete:

```text
[ ] TypeScript strict mode — no errors
[ ] ESLint — no warnings, no errors
[ ] ADR compliance check — no violations
[ ] Tests added/updated — covering the change
[ ] Tests pass — all existing + new
[ ] Belief ≥ 80% — or user consulted
[ ] Commit message follows convention
[ ] Branch is clean (no untracked changes)
```

## Anti-Patterns to Avoid

| Anti-Pattern | Why | Instead |
| --- | --- | --- |
| `// TODO: fix later` | Never gets fixed | Fix now or file an issue |
| `any` type | Defeats type safety | Define proper types |
| `console.log` for debugging | Not observable | Use structured logger (pino) |
| Hardcoded values | Fragile, not configurable | Use Zod config (ADR-013) |
| Mock Redis in tests | False confidence | Use Testcontainers (ADR-007) |
| Copy-paste code | Maintenance burden | Extract shared module |
| Giant functions (> 50 lines) | Hard to test, understand | Decompose into smaller functions |
| Catch-all error handler | Swallows useful information | Handle specific errors |

## Related

- [Belief Threshold Instruction](belief-threshold.md) — Uncertainty handling
- [ADR Compliance Skill](../skills/adr-compliance.md) — Code compliance checks
- [Code Generation Skill](../skills/code-generation.md) — Quality gates
- [ADR-016: Coding Standards](../adr/ADR-016-coding-standards-principles.md) — CUPID principles, FOOP, naming conventions
- [ADR-018: Agentic Coding](../adr/ADR-018-agentic-coding-conventions.md) — Guard Functions, file size limits, schema-first, pure functions
- [ADR-019: Ideation & Decision Protocols](../adr/ADR-019-ideation-decision-protocols.md) — Anti-sycophancy, reasoning frameworks
- [ADR-020: Spec-Driven Development](../adr/ADR-020-spec-driven-development.md) — Evidence-driven quality gates, EARS requirements as engineering discipline

---

> **Provenance**: Created 2026-03-24 as part of the AI agent framework. Updated 2026-03-25: added ADR-016/018/019/020 references.
