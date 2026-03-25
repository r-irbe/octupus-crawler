# Instruction: Engineering Discipline

| Field | Value |
| --- | --- |
| **ID** | `engineering-discipline` |
| **Applies To** | ALL agents |
| **Priority** | High |

## Rule

No shortcuts. No "fix later." No untracked tech debt.

## Principles

1. **Understand before changing** — Read code + ADRs first. Map dependencies. Run tests before and after.
2. **Small steps** — One logical change per commit. Each commit passes lint + typecheck + tests.
3. **Test everything** — New feature → new tests. Bug fix → regression test first. No Testcontainers → don't merge.
4. **Fail fast** — Zod config validation at startup. Assertions for impossible states. Structured logging.
5. **Follow ADRs or change them** — Never silently violate. Wrong ADR → propose amendment.
6. **Keep simple** — No premature abstraction/optimization/gold-plating. Rule of three.
7. **Document decisions, not code** — Self-documenting code. ADRs = WHY. Comments = WHAT IS SURPRISING.
8. **Leave better** — Fix broken windows (small ones). Don't scope-creep — separate PRs.
9. **Hallucination guard** — Verify all referenced APIs/files exist. 4 types: mapping, naming, resource, logic (most dangerous: step-skip).
10. **Separate generation from evaluation** — Don't evaluate and generate in same turn for multi-option decisions.

## Anti-Patterns

| Anti-Pattern | Instead |
| --- | --- |
| `// TODO: fix later` | Fix now or file issue |
| `any` type | Proper types + Zod |
| `console.log` | Structured logger (pino) |
| Hardcoded values | Zod config (ADR-013) |
| Mock Redis in tests | Testcontainers (ADR-007) |
| Copy-paste code | Extract shared module |
| Giant functions (>50 lines) | Decompose |
| Catch-all error handler | Handle specific errors |
| Vibe coding (no specs) | Start from specs (ADR-020) |

## Related

[ADR-016](../adr/ADR-016-coding-standards-principles.md), [ADR-018](../adr/ADR-018-agentic-coding-conventions.md), [ADR-019](../adr/ADR-019-ideation-decision-protocols.md), [ADR-020](../adr/ADR-020-spec-driven-development.md)

---

> **Provenance**: Created 2026-03-24. Condensed 2026-03-25.
