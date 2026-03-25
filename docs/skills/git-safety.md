# Skill: Git Safety

**Agents**: All (via instruction) | **Primary**: Implementation, DevOps

Safe parallel git operations without data loss, conflict, or corruption.

## Branch Naming

- `work/<task-slug>` — tracking branch (Gateway manages)
- `work/<task-slug>/<agent-id>/<sub-task>` — agent work branch
- `work/<task-slug>/merge` — integration branch

## Operations

**Free**: Create branches from main/tracking, commit to own branch, read any branch, run tests, diff.
**Gateway approval**: Merge into tracking, delete branches, rebase.
**Forbidden**: Force push, push to main, delete main/release branches, amend shared commits, `reset --hard` on shared branches.

## Parallel Work Flow

1. Gateway creates tracking branch → assigns sub-tasks to agents
2. Each agent creates `work/<task>/<agent>/<sub-task>`, works independently
3. Gateway monitors for file overlap between branches
4. On completion: Gateway creates merge branch → merges in dependency order → resolves conflicts → full test suite → PR to main

## Rules

1. One branch per agent per sub-task — no shared branches
2. Commit early, often — small verifiable increments
3. One task = one logical change = one commit (ADR-018 §7)
4. Max 3 attempts per Guard Function failure before escalating (ADR-018 §2)
5. Never commit generated files, node_modules, or secrets
6. Always verify branch is clean before switching

## Related

- [Git Safety Protocol](../instructions/git-safety-protocol.md)
- [Gateway Agent](../agents/gateway.md), [ADR-018](../adr/ADR-018-agentic-coding-conventions.md)
