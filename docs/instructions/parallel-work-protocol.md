# Instruction: Parallel Work Protocol

| Field | Value |
| --- | --- |
| **ID** | `parallel-work-protocol` |
| **Applies To** | ALL agents (orchestrated by Gateway) |
| **Priority** | High |

## Rule

Multiple agents working simultaneously must follow this protocol to prevent conflicts.

## Principles

1. **Isolation**: Each agent on its own branch — no shared branches
2. **Independence**: Minimal file overlap between sub-tasks
3. **Communication**: Through Gateway only — agents never communicate directly
4. **Order**: Merges in dependency order, managed by Gateway
5. **Verification**: Full test suite after each merge

## Flow

Gateway decomposes request → dependency + file overlap analysis → if overlap, serialize or assign to same agent → assign parallel sub-tasks (each agent creates `work/<task>/<agent>/<sub-task>`) → monitor → merge in dependency order → run tests → PR to main.

## Conflict Prevention

- **Pre-assignment**: If estimated file sets overlap, serialize or combine
- **Runtime**: Gateway checks `git diff --name-only` for overlap across active branches; pauses conflicting work
- **Merge**: Topological sort → `git merge --no-ff` in order → auto-resolve or escalate → test after each

## Safety Limits

| Limit | Value |
| --- | --- |
| Max parallel agents | 5 |
| Max file overlap | 0 |
| Max branch age | 1 day |
| Max commits before sync | 10 |

## Related

[Gateway Agent](../agents/gateway.md), [git-safety-protocol](git-safety-protocol.md), [ADR-018](../adr/ADR-018-agentic-coding-conventions.md)

---

> **Provenance**: Created 2026-03-24. Condensed 2026-03-25.
