# Documentation Standards

## Core Rules

1. **Provenance**: Every document ends with `> **Provenance**: Created YYYY-MM-DD. [context].`
2. **Index**: Every directory has `index.md` listing all documents with status and description.
3. **Relative links**: Always `[ADR-001](../adr/ADR-001-monorepo-tooling.md)`, never absolute paths.
4. **Lifecycle**: Draft → Active → Deprecated/Superseded. Review when PRs reveal gaps, council identifies outdated docs, or quarterly audit.

## Naming

| Directory | Pattern | Example |
| --- | --- | --- |
| ADR | `ADR-NNN-slug.md` | `ADR-001-monorepo-tooling.md` |
| Worklogs | `YYYY-MM-DD-topic.md` | `2026-03-24-initial-setup.md` |
| Others | `descriptive-name.md` | `documentation-standards.md` |

## Writing Style

Active voice. Concise sentences. Bullets over prose. Code examples where applicable. Tables for comparisons. Target audience: new team member familiar with ADRs.

## Context File Quality (ETH Zürich 2026)

LLM-generated context files reduce task success in 5/8 settings, increase cost 20–23%.

- **Human-written**: Don't auto-generate from codebase analysis
- **Concrete over abstract**: Specific commands and patterns, not philosophy
- **Minimal**: Only what the agent can't infer from code/types/tests
- **Size targets**: AGENTS.md ~200 lines, CLAUDE.md <200, copilot-instructions.md <100
- **Prune regularly**: Outdated instructions about removed code → ghost conventions

## Related

[PR Review Council](../conventions/pr-review-council.md), [Memory Promotion](memory-promotion-workflow.md)

---

> **Provenance**: Created 2026-03-24. Condensed 2026-03-25.
