# Instruction: Git Safety Protocol

| Field | Value |
| --- | --- |
| **ID** | `git-safety-protocol` |
| **Status** | Active |
| **Created** | 2026-03-24 |
| **Applies To** | ALL agents that modify files |
| **Priority** | Critical |

## Rule

All file modifications by agents MUST happen on isolated git branches. No agent may modify files on `main` or shared branches without going through the full review process.

## Protocol

### Before Modifying Any File

1. Verify you're on the correct work branch
2. If no branch exists, request Gateway to create one
3. Pull latest from parent branch

### During Work

1. Commit frequently (every logical change)
2. Use conventional commit messages
3. Never commit secrets, credentials, or tokens
4. Never commit generated files or build artifacts
5. Run `git status` after each commit to verify clean state

### After Completing Work

1. Verify all changes are committed
2. Run lint + typecheck + tests on the branch
3. Report completion to Gateway
4. Do NOT merge — Gateway manages merges

### Forbidden Actions

| Action | Why | Penalty |
| --- | --- | --- |
| `git push --force` | Rewrites shared history | Immediate stop, user escalation |
| `git reset --hard` on shared branch | Loses others' work | Immediate stop, user escalation |
| Direct commit to `main` | Bypasses review | Revert, user notification |
| `git checkout --theirs .` | Silently discards changes | User escalation |
| Delete remote branches | May lose work | User confirmation required |

### Branch Lifecycle

```text
Created by Gateway → Worked on by Agent → Completed → Merged by Gateway → Deleted by Gateway
```

Agents NEVER manage branch lifecycle beyond commits to their own branch.

## Related

- [Git Safety Skill](../skills/git-safety.md) — Detailed branch management
- [Gateway Agent](../agents/gateway.md) — Manages branch lifecycle
- [Engineering Discipline](engineering-discipline.md) — Quality standards
- [ADR-018: Agentic Coding](../adr/ADR-018-agentic-coding-conventions.md) — Atomic Action Pairs (commit = atomic unit), Guard Functions before commit

---

> **Provenance**: Created 2026-03-24 as part of the AI agent framework. Ensures safe parallel git operations. Updated 2026-03-25: added ADR-018 cross-reference.
