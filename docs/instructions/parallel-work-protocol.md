# Instruction: Parallel Work Protocol

| Field | Value |
| --- | --- |
| **ID** | `parallel-work-protocol` |
| **Status** | Active |
| **Created** | 2026-03-24 |
| **Applies To** | ALL agents (orchestrated by Gateway) |
| **Priority** | High |

## Rule

When multiple agents work simultaneously on a repository, they MUST follow this protocol to prevent conflicts, ensure consistency, and maintain the ability to merge safely.

## Principles

1. **Isolation**: Each agent works on its own branch — no shared branches
2. **Independence**: Sub-tasks should have minimal file overlap
3. **Communication**: Agents report progress and potential conflicts to Gateway
4. **Order**: Merges happen in dependency order, managed by Gateway
5. **Verification**: Full test suite runs after each merge

## Parallel Execution Flow

```text
User Request
    │
    ▼
Gateway: Decompose into sub-tasks
    │
    ├─→ Dependency analysis: which sub-tasks are independent?
    │
    ├─→ File overlap analysis: which sub-tasks touch the same files?
    │   If overlap detected → serialize those tasks OR assign to same agent
    │
    ├─→ Create tracking branch: work/<task>
    │
    ├─→ Assign sub-tasks to agents in parallel
    │   Each agent creates: work/<task>/<agent>/<sub-task>
    │
    ├─→ Monitor progress (agents report back)
    │
    ├─→ All agents complete? → Begin merge sequence
    │   a. Create merge branch: work/<task>/merge
    │   b. Merge in dependency order
    │   c. If conflict → resolve or escalate to user
    │   d. Run full test suite
    │   e. If tests pass → PR to main
    │
    └─→ Report results to user
```

## Conflict Prevention

### Pre-Assignment Analysis

Before assigning parallel tasks, Gateway checks:

```text
For each pair of sub-tasks (A, B):
  files_A = estimated files touched by A
  files_B = estimated files touched by B
  if files_A ∩ files_B ≠ ∅:
    → Serialize A and B, or assign both to the same agent
```

### Runtime Conflict Detection

During parallel execution, Gateway periodically:

```text
For each active agent branch:
  changed_files = git diff --name-only <parent>..<agent-branch>
  Check for overlap with other active agent branches
  If new overlap detected → warn agents, consider pausing one
```

### Merge Strategy

```text
1. Topological sort of agent branches by dependency
2. For each branch in order:
   a. git merge --no-ff <agent-branch> into merge branch
   b. If conflict: attempt auto-resolution
   c. If auto-resolution fails: escalate to user
   d. Run affected tests
3. After all merges: run full test suite
4. If all tests pass: PR from merge branch → main
```

## Agent Communication

During parallel work, agents communicate ONLY through Gateway:

```text
Agent A → Gateway: "I need to modify shared/types.ts, is anyone else touching it?"
Gateway → Agent A: "Agent B is also using types.ts. Coordinate: you add your types first, Agent B will pull your changes."
```

Agents NEVER directly communicate or modify each other's branches.

## Safety Limits

| Limit | Value | Reason |
| --- | --- | --- |
| Max parallel agents | 5 | Context management overhead |
| Max file overlap | 0 files | Prevent merge conflicts |
| Max branch age | 1 day | Keep close to main |
| Max commits before sync | 10 | Reduce merge complexity |

## Related

- [Gateway Agent](../agents/gateway.md) — Orchestrates parallel work
- [Git Safety Protocol](git-safety-protocol.md) — Branch safety rules
- [Git Safety Skill](../skills/git-safety.md) — Branch management
- [ADR-018: Agentic Coding](../adr/ADR-018-agentic-coding-conventions.md) — Atomic Action Pairs, Guard Function chain coordination

---

> **Provenance**: Created 2026-03-24 as part of the AI agent framework. Enables safe massively-parallel agent work on git repositories. Updated 2026-03-25: added ADR-018 cross-reference.
