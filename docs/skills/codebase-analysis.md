# Skill: Codebase Analysis

| Field | Value |
| --- | --- |
| **ID** | `codebase-analysis` |
| **Status** | Active |
| **Created** | 2026-03-24 |
| **Used By** | All Agents |

## Purpose

Enables agents to understand existing code structure, find relevant files, trace dependencies, and build mental models of the system before making changes. Applies context rot mitigation strategies (ADR-018) to minimize token consumption during analysis.

## Context Rot Awareness (ADR-018)

LLM performance degrades non-linearly with context length. Codebase analysis must be **focused and progressive**:

- **Load minimum context**: Start with file names, directory structure, and type signatures before reading full implementations
- **Progressive disclosure**: Domain → package → feature folder → specific file → specific function
- **Token budget**: A 500-line file costs ~9,000–10,000 tokens. A 50-line file costs ~900–1,000. Prefer reading small, focused files
- **Explicit imports over barrel tracing**: Follow direct import paths, not barrel re-exports. Barrels hide structure and waste tokens
- **Dependency topology**: Navigate import chains structurally (follow typed imports) rather than lexically (grep for strings)

## Capabilities

### Navigation

- Search for files by name pattern (`file_search`)
- Search for code by content (`grep_search`, `semantic_search`)
- Read file contents with line ranges (`read_file`)
- List directory contents (`list_dir`)
- Find usages of symbols (`vscode_listCodeUsages`)

### Analysis Patterns

#### 1. Top-Down Exploration

```text
1. List root directory → understand project layout
2. Read package.json / turbo.json → understand build structure
3. Read relevant package's src/index.ts → understand entry point
4. Trace imports → map dependency graph
```

#### 2. Targeted Search

```text
1. Search for keyword: function name, type name, error message
2. Read surrounding context (±50 lines)
3. Trace callers/callees
4. Build call chain understanding
```

#### 3. Change Impact Analysis

```text
1. Identify file(s) to change
2. Find all importers of changed module
3. Find all tests that cover changed code
4. Determine blast radius: [low | medium | high]
```

### Output Format

When an agent uses this skill, they produce:

```markdown
#### Codebase Context

**Files Analyzed**: [list]
**Dependencies Mapped**: [module → module]
**Blast Radius**: [low/medium/high]
**Key Findings**: [what was learned]
```

## Rules

1. Always understand existing code BEFORE proposing changes
2. Read at least the entry point + relevant module + tests
3. Map imports before modifying exports
4. Check for existing implementations before creating new ones
5. Respect package boundaries defined in ADR-001

## Related

- [ADR-001: Monorepo Tooling](../adr/ADR-001-monorepo-tooling.md) — Package structure
- [ADR-015: Architecture Patterns](../adr/ADR-015-application-architecture-patterns.md) — Hexagonal+VSA structure, bounded context identification
- Used by all agents as a prerequisite skill

---

> **Provenance**: Created 2026-03-24 as part of the AI agent framework. Updated 2026-03-25: added ADR-015 cross-reference.
