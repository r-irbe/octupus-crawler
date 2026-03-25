# Documentation Standards

| Field | Value |
| --- | --- |
| **Status** | Accepted |
| **Created** | 2026-03-24 |
| **Last Updated** | 2026-03-24 |
| **Author(s)** | Architecture Council |

## Overview

All project documentation follows consistent standards for structure, provenance, indexing, and lifecycle management. Every document must be traceable, discoverable, and maintainable.

## Directory Structure

```text
docs/
├── index.md                    # Root index: links to all subdirectories
├── adr/                        # Architecture Decision Records
│   ├── index.md                # ADR index with descriptions
│   ├── TEMPLATE.md             # ADR template
│   └── ADR-NNN-slug.md         # Individual ADRs
├── conventions/                # Process and convention documents
│   ├── index.md
│   └── *.md
├── guidelines/                 # Technical guidelines and standards
│   ├── index.md
│   └── *.md
├── plans/                      # Project plans, roadmaps, proposals
│   ├── index.md
│   └── *.md
├── worklogs/                   # Chronological work session logs
│   ├── index.md
│   └── YYYY-MM-DD-*.md
├── analysis/                   # Technical analysis documents
│   ├── index.md
│   └── *.md
└── memory/                     # Knowledge management
    ├── index.md
    ├── session/                # Current session learnings (ephemeral)
    ├── short-term/             # Validated session learnings (promoted)
    └── long-term/              # Collated, validated persistent knowledge
```

## Provenance Requirements

Every document MUST contain provenance information. This ensures traceability and trust.

### Minimum Provenance Fields

```markdown
---
> **Provenance**: Created YYYY-MM-DD [context]. [Review info].
```

### Full Provenance Block (for significant documents)

```markdown
---

## Document Provenance

| Field | Value |
| --- | --- |
| **Created** | YYYY-MM-DD |
| **Created By** | [Author or process] |
| **Last Updated** | YYYY-MM-DD |
| **Updated By** | [Author or process] |
| **Review Status** | Draft / Reviewed / Approved |
| **Reviewed By** | [Council or individuals] |
| **Source** | [What triggered this document's creation] |
| **Confidence** | High / Medium / Low |
| **Supersedes** | [Previous document if applicable] |
```

## Index File Standard

Every documentation directory MUST have an `index.md` file with the following structure:

```markdown
# [Directory Name]

[One-paragraph description of what this directory contains]

## Documents

| Document | Description | Status | Last Updated |
| --- | --- | --- | --- |
| [Doc Title](filename.md) | Short description | Status | YYYY-MM-DD |

## Index

- [Doc Title](#doc-title) — short description
- [Doc Title 2](#doc-title-2) — short description
```

### Index Rules

1. Every document in the directory MUST be listed in the index
2. Each entry must have a short description (one sentence)
3. The index at the bottom provides quick navigation
4. Index files must be updated whenever documents are added, removed, or renamed
5. Status field uses: Draft, Active, Deprecated, Superseded

## Document Naming Conventions

| Directory | Pattern | Example |
| --- | --- | --- |
| ADR | `ADR-NNN-slug.md` | `ADR-001-monorepo-tooling.md` |
| Worklogs | `YYYY-MM-DD-topic.md` | `2026-03-24-initial-setup.md` |
| Analysis | `analysis-topic.md` | `analysis-queue-comparison.md` |
| Plans | `plan-topic.md` | `plan-v1-roadmap.md` |
| Guidelines | `descriptive-name.md` | `documentation-standards.md` |
| Conventions | `descriptive-name.md` | `pr-review-council.md` |
| Memory | `topic.md` | `crawl-patterns.md` |

## Linking Conventions

- Always use relative links between documents: `[ADR-001](../adr/ADR-001-monorepo-tooling.md)`
- Never use absolute filesystem paths in document links
- Cross-reference related documents in a "Related" section at the end
- Broken links must be fixed as part of any PR that moves/renames documents

## Document Lifecycle

### States

```text
Draft → Active → Deprecated/Superseded
                      │
                      └→ Archived (removed from active index, kept in git history)
```

### Review Triggers

Documents should be reviewed when:

1. A PR reveals a gap in documentation
2. A council review identifies outdated guidance
3. Memory promotion surfaces new validated learnings
4. Quarterly documentation audit (scheduled)

## Writing Style

- Use active voice
- Keep sentences concise
- Prefer bullet points over prose for lists
- Include code examples where applicable
- Use tables for structured comparisons
- Avoid jargon without definition on first use
- Target audience: new team member who has read prior ADRs

## Related

- [PR Review Council](../conventions/pr-review-council.md) — Findings follow documentation format
- [Memory Promotion Workflow](memory-promotion-workflow.md) — Learnings feed document updates

---

> **Provenance**: Created 2026-03-24 as part of initial project governance setup. Defines documentation structure, provenance, and maintenance standards.
