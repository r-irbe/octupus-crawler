# Skill: Memory Promotion

| Field | Value |
| --- | --- |
| **ID** | `memory-promotion` |
| **Status** | Active |
| **Created** | 2026-03-24 |
| **Used By** | Documentation, Gateway |

## Purpose

Execute the memory promotion workflow: capture session learnings, validate and promote to short-term, collate into long-term, and integrate into project documentation.

## Process Reference

Full specification: [Memory Promotion Workflow](../guidelines/memory-promotion-workflow.md)

## Quick Reference

```text
Session → validate → Short-Term → collate → Long-Term → integrate → ADRs/Guidelines
```

### Trigger Points

| Trigger | Action |
| --- | --- |
| Major task set completed | Gateway triggers Documentation Agent |
| PR review completed | Review Agent captures session learnings |
| Debug session completed | Debug Agent captures findings |
| Architecture decision made | Architect Agent captures reasoning |

### Validation Criteria

- Confirmed by test: test case exists
- Confirmed by review: PR council sustained the finding
- Confirmed by production: metrics/logs show the pattern
- Confirmed by reproduction: independently verified

## Rules

1. Don't promote unvalidated hypotheses
2. Don't skip tiers (session must go through short-term before long-term)
3. Always check for existing entries before creating new memory files
4. Clearly mark confidence level on all promoted memories
5. Update indexes after any memory file change

## Related

- [Memory Promotion Workflow](../guidelines/memory-promotion-workflow.md)
- [Documentation Agent](../agents/documentation.md)
- [Memory Index](../memory/index.md)

---

> **Provenance**: Created 2026-03-24 as part of the AI agent framework.
