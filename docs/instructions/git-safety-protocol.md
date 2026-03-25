# Instruction: Git Safety Protocol

| Field | Value |
| --- | --- |
| **ID** | `git-safety-protocol` |
| **Applies To** | ALL agents that modify files |
| **Priority** | Critical |

## Rule

All file modifications happen on isolated git branches. No agent may modify files on `main` without full review.

## Protocol

1. **Before**: Verify correct work branch. No branch → request Gateway to create one.
2. **During**: Commit every logical change, conventional messages, never commit secrets/artifacts. `git status` after each commit.
3. **After**: Verify all committed, run lint+typecheck+tests, report to Gateway. Do NOT merge — Gateway manages merges.

## Forbidden Actions

| Action | Consequence |
| --- | --- |
| `git push --force` on shared branch | Immediate stop + user escalation |
| `git reset --hard` on shared branch | Immediate stop + user escalation |
| Direct commit to `main` | Revert + user notification |
| `git checkout --theirs .` | User escalation |
| Delete remote branches | User confirmation required |

**Branch lifecycle**: Created by Gateway → Worked by Agent → Completed → Merged by Gateway → Deleted by Gateway. Agents never manage lifecycle beyond their own commits.

## Related

[git-safety skill](../skills/git-safety.md), [Gateway](../agents/gateway.md), [ADR-018](../adr/ADR-018-agentic-coding-conventions.md)

---

> **Provenance**: Created 2026-03-24. Condensed 2026-03-25.
