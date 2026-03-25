# Skill: Doc Maintenance

| Field | Value |
| --- | --- |
| **ID** | `doc-maintenance` |
| **Status** | Active |
| **Created** | 2026-03-24 |
| **Used By** | Documentation |

## Purpose

Keep all project documentation current: indexes, provenance, cross-references, and lifecycle states.

## Capabilities

- Update index.md files when documents are added/removed/changed
- Verify and fix cross-references between documents
- Update provenance (Last Updated date, reviewer info)
- Maintain document lifecycle states (Draft → Active → Deprecated)
- Verify documentation standards compliance

## Checklist

After any documentation change:

- [ ] Index.md in the same directory updated
- [ ] Parent index.md updated if new directory entry
- [ ] Provenance block updated with new date
- [ ] Cross-references still valid (no broken links)
- [ ] Table formatting correct (no pipe alignment issues)

## Related

- [Documentation Standards](../guidelines/documentation-standards.md)
- [Documentation Agent](../agents/documentation.md)
- [ADR-018: Agentic Coding](../adr/ADR-018-agentic-coding-conventions.md) — Context engineering, context file size limits, ghost convention pruning

---

> **Provenance**: Created 2026-03-24 as part of the AI agent framework. Updated 2026-03-25: added ADR-018 context engineering reference.
