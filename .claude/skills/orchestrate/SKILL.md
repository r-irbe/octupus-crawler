---
name: orchestrate
description: Decompose multi-package tasks and delegate to specialist subagents
---

# Orchestration Skill

> **Canonical**: [docs/skills/automation-orchestration.md](../../../docs/skills/automation-orchestration.md) | Claude Code implementation

Decompose multi-package tasks and delegate to specialist subagents. The orchestrator never generates code directly.

## Execution Steps

1. Read the task specification and identify affected packages
2. Decompose into single-package subtasks with clear interfaces
3. Define interface contracts between packages before implementation
4. For each subtask, delegate to specialist:
   - **Test Writer**: write failing tests for the subtask
   - **Implementer**: make tests pass
   - **Reviewer**: review the implementation (blind — no rationale)
5. Synthesize results and verify cross-package integration
6. Never generate code directly — only coordinate

## Topology Selection

| Task Scope | Topology | Approach |
| --- | --- | --- |
| Single file | Direct | No orchestration needed |
| Single package | Chain (TDD) | Subagents in-session |
| 2–3 packages | Star | Subagents + worktrees |
| >3 packages | Tree (hierarchical) | Agent teams with worktrees |

## Subagent Verification

After each subagent completes:
1. Verify all claimed file paths exist
2. Verify all claimed commit hashes exist
3. Run guard functions on the combined work
4. Reject subagent report if artifacts are missing

## Cascade Prevention

- Maximum 3 levels of subagent delegation
- Each level has independent guard function gates
- Subagent failure at depth N does NOT silently propagate to N-1
- Classify error and escalate explicitly

## Parallel Work Protocol

- Each subagent operates in its own git worktree
- File changes from one subagent are NOT visible to another until merge
- Merge in dependency order
- Run cross-package integration tests after merge

## Reasoning Framework Selection

Select before beginning ideation:

| Framework | When | Example |
| --- | --- | --- |
| **Chain-of-Thought (CoT)** | Sequential logic, debugging, single-path | "Why does this test fail?" |
| **Tree-of-Thought (ToT)** | Multi-path architectural exploration | "Which queue system fits best?" |
| **SPIRAL/MCTS** | Optimization with large solution spaces | "Tune rate limiter parameters" |
| **GoT (Graph-of-Thought)** | Cross-cutting concerns, dependency analysis | "How does config change affect all services?" |

Log selection in state tracker. For architectural decisions, must use ≥3 framings (no single-framing).
