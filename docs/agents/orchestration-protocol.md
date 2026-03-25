# Orchestration Protocol

| Field | Value |
| --- | --- |
| **Status** | Active |
| **Created** | 2026-03-24 |
| **Last Updated** | 2026-03-24 |
| **Author(s)** | Architecture Council |

## Overview

This document defines how agents discover, communicate with, and coordinate each other. The Gateway Agent is the sole orchestrator; all inter-agent communication flows through it.

## Core Principle: Hub-and-Spoke

```text
                    ┌──────────┐
                    │   User   │
                    └────┬─────┘
                         │
                    ┌────▼─────┐
            ┌───────┤  Gateway ├────────┐
            │       └────┬─────┘        │
            │            │              │
     ┌──────▼──┐   ┌────▼────┐   ┌─────▼─────┐
     │Architect │   │  Impl   │   │   Test    │
     └──────┬──┘   └────┬────┘   └─────┬─────┘
            │            │              │
     ┌──────▼──┐   ┌────▼────┐   ┌─────▼─────┐
     │Research  │   │  Debug  │   │  Review   │
     └─────────┘   └─────────┘   └───────────┘
            │                           │
     ┌──────▼──┐                 ┌──────▼─────┐
     │  DevOps │                 │  Security  │
     └─────────┘                 └────────────┘
            │
     ┌──────▼──┐   ┌─────────┐
     │   SRE   │   │  Docs   │
     └─────────┘   └─────────┘
```

Agents NEVER communicate directly. All requests go through Gateway.

## Message Protocol

### Agent → Gateway: Request Help

```markdown
### Help Request

**From**: [agent-id]
**Task**: [current task reference]
**Need**: [what help is needed]
**Target Agent**: [suggested agent, or "Gateway decides"]
**Blocking**: [yes/no — is the requesting agent blocked?]
**Context**: [relevant information for the helper agent]
```

### Gateway → Agent: Task Assignment

```markdown
### Task Assignment

**To**: [agent-id]
**Task ID**: [unique identifier]
**Description**: [what to do]
**Skills to Load**: [skill-1, skill-2, ...]
**Instructions to Follow**: [instruction-1, instruction-2, ...]
**Context ADRs**: [ADR-001, ADR-009, ...]
**Branch**: [work/<task>/<agent>/<sub-task>]
**Dependencies**: [other task IDs this depends on]
**Priority**: [critical/high/medium/low]
**Belief Threshold**: 80% (default, can be adjusted by Gateway)
```

### Agent → Gateway: Status Report

```markdown
### Status Report

**From**: [agent-id]
**Task ID**: [reference]
**Status**: [in-progress / completed / blocked / failed]
**Belief**: [X%]
**Progress**: [what's been done]
**Files Changed**: [list]
**Remaining**: [what's left]
**Blockers**: [if any]
**Questions for User**: [if any]
```

### Agent → Gateway: Completion Report

```markdown
### Completion Report

**From**: [agent-id]
**Task ID**: [reference]
**Status**: completed
**Branch**: [branch name with commits]
**Files Changed**: [list with brief descriptions]
**Tests**: [added/updated/all passing]
**ADR Compliance**: [compliant/issues found]
**Belief**: [X%]
**Session Learnings**: [observations for memory promotion]
**Recommendations**: [follow-up work suggested]
```

## Agent Discovery

Agents don't "discover" each other. The Gateway maintains the full agent roster and capabilities map:

### Agent Capability Matrix

| Agent | Can Do | Cannot Do |
| --- | --- | --- |
| Architect | Design decisions, ADR management, pattern review | Write production code |
| Implementation | Write code, fix bugs, refactor | Make architecture decisions |
| Test | Write tests, verify behavior, coverage analysis | Write production code |
| Review | Orchestrate PR review, synthesize findings | Write code or tests |
| Research | Investigate, gather evidence, analyze options | Make decisions (only recommends) |
| Debug | Diagnose issues, identify root causes | Apply fixes (hands to Implementation) |
| DevOps | Infrastructure, CI/CD, Docker, K8s | Make architecture choices |
| SRE | Reliability, observability, resilience review | Write business logic |
| Security | Security analysis, vulnerability detection | Fix vulnerabilities (reports them) |
| Documentation | Docs, memory promotion, indexes | Write code |

## Skill Loading Protocol

When Gateway assigns a task, it specifies which skills the agent should load. Skills are documentation files that provide the agent with domain knowledge and methodology.

### Skill Loading Sequence

```text
1. Gateway determines sub-task
2. Gateway selects agent
3. Gateway selects skills based on sub-task domain
4. Gateway includes skill file paths in task assignment
5. Agent reads skill files before starting work
6. Agent follows skill methodology during execution
```

### Skill-Agent Compatibility Matrix

| Skill | Gateway | Architect | Impl | Test | Review | Research | Debug | DevOps | SRE | Security | Docs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| git-safety | ★ | · | ★ | · | · | · | · | ★ | · | · | · |
| codebase-analysis | · | ★ | ★ | ★ | ★ | ★ | ★ | ★ | ★ | ★ | · |
| adr-management | · | ★ | · | · | · | · | · | · | · | · | ★ |
| code-generation | · | · | ★ | · | · | · | · | · | · | · | · |
| adr-compliance | · | ★ | ★ | · | ★ | · | · | ★ | · | · | · |
| evidence-gathering | · | ★ | · | · | ★ | ★ | ★ | · | · | · | · |
| pr-council-review | · | · | · | · | ★ | · | · | · | · | · | · |
| test-generation | · | · | ★ | ★ | · | · | · | · | · | · | · |
| memory-promotion | ★ | · | · | · | · | · | · | · | · | · | ★ |
| doc-maintenance | · | · | · | · | · | · | · | · | · | · | ★ |
| debug-analysis | · | · | · | · | · | · | ★ | · | · | · | · |
| infra-management | · | · | · | · | · | · | · | ★ | · | · | · |
| observability | · | · | · | · | · | · | · | · | ★ | · | · |
| security-analysis | · | · | · | · | · | · | · | · | · | ★ | · |

★ = primary skill, · = not loaded (unless Gateway overrides)

## Conflict Resolution

When agents produce conflicting recommendations:

```text
1. Gateway collects both positions with evidence
2. Gateway presents both to user with pros/cons
3. User decides, OR
4. Gateway asks Architect Agent for advisory opinion
5. Decision documented with reasoning
```

## Post-Task Lifecycle

After every task completion:

```text
1. Agent submits completion report to Gateway
2. Gateway triggers Documentation Agent for:
   a. Session memory capture
   b. Worklog entry
   c. Index updates
3. Gateway triggers memory promotion review:
   a. Validate session learnings
   b. Promote to short-term if validated
   c. Collate to long-term if patterns emerge
   d. Update ADRs/guidelines if long-term memory warrants
4. Gateway reports final results to user
```

## Related

- [Gateway Agent](gateway.md) — Central orchestrator
- [All Agent Definitions](index.md) — Full agent roster
- [All Skills](../skills/index.md) — All available skills
- [All Instructions](../instructions/index.md) — All bound instructions
- [Parallel Work Protocol](../instructions/parallel-work-protocol.md) — Multi-agent git coordination

---

> **Provenance**: Created 2026-03-24 as part of the AI agent framework. Defines inter-agent communication, skill loading, and coordination protocols.
