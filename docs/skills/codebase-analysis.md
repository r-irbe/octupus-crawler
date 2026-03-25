# Skill: Codebase Analysis

**Agents**: All

Understand existing code structure, find files, trace dependencies, build mental models before making changes. Apply context rot mitigation (ADR-018) to minimize token consumption.

## Context Rot Awareness (ADR-018)

- **Load minimum context**: file names and type signatures before full implementations
- **Progressive disclosure**: domain → package → feature folder → file → function
- **Token budget**: 500 lines ≈ 10K tokens, 50 lines ≈ 1K — prefer small focused files
- **Follow direct imports**, not barrel re-exports

## Analysis Patterns

1. **Top-down**: root dir → package.json/turbo.json → entry point → trace imports → dependency graph
2. **Targeted search**: keyword search → read ±50 lines context → trace callers/callees → call chain
3. **Change impact**: identify files to change → find all importers → find covering tests → assess blast radius (low/medium/high)

## Output

```markdown
**Files Analyzed**: [list]
**Dependencies Mapped**: [module → module]
**Blast Radius**: [low/medium/high]
**Key Findings**: [what was learned]
```

## Rules

1. Understand existing code BEFORE proposing changes
2. Read entry point + relevant module + tests minimum
3. Map imports before modifying exports
4. Check for existing implementations before creating new
5. Respect package boundaries (ADR-001)

## Related

- [ADR-001](../adr/ADR-001-monorepo-tooling.md), [ADR-015](../adr/ADR-015-application-architecture-patterns.md)
