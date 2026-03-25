# Skill: Git Safety

| Field | Value |
| --- | --- |
| **ID** | `git-safety` |
| **Status** | Active |
| **Created** | 2026-03-24 |
| **Used By** | Implementation, DevOps, All Agents (via instruction) |

## Purpose

Enables agents to work safely on git repositories in parallel without data loss, conflict, or corruption. This is the foundational skill for massively parallel agent work.

## Capabilities

### Branch Management

```text
Naming Convention:
  work/<task-slug>                          # Tracking branch (Gateway manages)
  work/<task-slug>/<agent-id>/<sub-task>    # Agent work branch
  work/<task-slug>/merge                    # Integration branch

Examples:
  work/add-circuit-breaker
  work/add-circuit-breaker/implementation/worker-resilience
  work/add-circuit-breaker/test/worker-resilience-tests
  work/add-circuit-breaker/merge
```

### Safe Operations (agents can do freely)

- Create branches from `main` or from a tracking branch
- Commit to their own agent work branch
- Read any branch
- Run tests on any branch
- Diff between branches

### Restricted Operations (require Gateway approval)

- Merge into tracking branch (`work/<task>/merge`)
- Delete branches
- Rebase

### Forbidden Operations (never, under any circumstances)

- Force push to any branch
- Push directly to `main`
- Delete `main` or release branches
- Amend commits that have been shared
- Reset --hard on shared branches

### Parallel Work Protocol

```text
1. Gateway creates tracking branch: work/<task>
2. Gateway assigns sub-tasks to agents
3. Each agent creates: work/<task>/<agent>/<sub-task>
4. Agents work independently on their branches
5. Gateway monitors for potential conflicts (overlapping files)
6. When all agents complete:
   a. Gateway creates: work/<task>/merge
   b. Merges agent branches in dependency order
   c. If conflict: pause, ask user or assign Implementation Agent
   d. Run full test suite on merge branch
   e. If tests pass: PR from merge branch → main
```

### Conflict Detection (proactive)

Before merging, Gateway checks:

```text
For each pair of agent branches:
  - List changed files in branch A
  - List changed files in branch B
  - If intersection is non-empty → potential conflict
  - If conflict detected → Gateway decides merge order or asks user
```

### Commit Message Convention

```text
<type>(<scope>): <description>

agent: <agent-id>
task: <task-slug>
belief: <X%>
```

## Rules

1. One branch per agent per sub-task — no shared branches between agents
2. Commit early, commit often — small, verifiable increments
3. Never commit generated files, node_modules, or secrets
4. Always verify branch is clean before switching
5. Always pull latest from parent branch before starting work
6. **One task = one logical change = one commit** (ADR-018 §7) — atomic tasks with commit-as-save-point
7. **Max 3 total attempts** per Guard Function failure before escalating to user (ADR-018 §2)

## Related

- [Git Safety Protocol Instruction](../instructions/git-safety-protocol.md)
- [Gateway Agent](../agents/gateway.md) — Manages branch lifecycle
- [Implementation Agent](../agents/implementation.md) — Primary user of this skill
- [ADR-018: Agentic Coding](../adr/ADR-018-agentic-coding-conventions.md) — Atomic tasks, commit discipline, retry limits

---

> **Provenance**: Created 2026-03-24 as part of the AI agent framework. Updated 2026-03-25: added ADR-018 atomic task and retry limit rules.
