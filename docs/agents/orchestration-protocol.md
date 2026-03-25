# Orchestration Protocol

| Field | Value |
| --- | --- |
| **Status** | Active |

## Core Principle

All inter-agent communication flows through Gateway. Agents NEVER communicate directly.

## Message Types

All messages use markdown format with these required fields:

| Message | Direction | Required Fields |
| --- | --- | --- |
| Help Request | Agent → Gateway | from, task, need, target-agent, blocking (y/n), context |
| Task Assignment | Gateway → Agent | to, task-id, description, skills, instructions, ADRs, branch, priority |
| Status Report | Agent → Gateway | from, task-id, status, belief%, progress, files-changed, blockers |
| Completion Report | Agent → Gateway | from, task-id, branch, files-changed, tests, ADR-compliance, learnings |

## Agent Capabilities

| Agent | Can Do | Cannot Do |
| --- | --- | --- |
| Architect | Design, ADR management, pattern review, spec creation (requirements.md, design.md, tasks.md) | Write production code |
| Implementation | Write code, fix bugs, refactor, signal Architect for spec updates | Make architecture decisions, update specs directly |
| Test | Write tests, coverage analysis | Write production code |
| Review | PR review, synthesize findings | Write code or tests |
| Research | Investigate, gather evidence | Make decisions (only recommends) |
| Debug | Diagnose, root cause analysis | Apply fixes (hands to Implementation) |
| DevOps | Infra, CI/CD, Docker, K8s | Architecture choices |
| SRE | Reliability, observability | Business logic |
| Security | Vulnerability detection, threat modeling | Fix vulnerabilities (reports them) |
| Documentation | Docs, memory promotion, indexes | Write code |

## Skill Loading

Gateway determines sub-task → selects agent → selects skills → includes skill paths in assignment → agent reads skills before work.

Primary skill assignments (★):

| Skill | Gateway | Arch | Impl | Test | Review | Research | Debug | DevOps | SRE | Security | Docs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| git-safety | ★ | | ★ | | | | | ★ | | | |
| codebase-analysis | | ★ | ★ | ★ | ★ | ★ | ★ | ★ | ★ | ★ | |
| adr-management | | ★ | | | | | | | | | ★ |
| code-generation | | | ★ | | | | | | | | |
| adr-compliance | | ★ | ★ | | ★ | | | ★ | | | |
| evidence-gathering | | ★ | | | ★ | ★ | ★ | | | | |
| pr-council-review | | | | | ★ | | | | | | |
| test-generation | | | ★ | ★ | | | | | | | |
| memory-promotion | ★ | | | | | | | | | | ★ |
| debug-analysis | | | | | | | ★ | | | | |

## Conflict Resolution

1. Gateway collects both positions with evidence
2. Presents both to user with pros/cons
3. User decides, or Gateway asks Architect for advisory opinion
4. Decision documented with reasoning

## Ideation Framing Assignments

During brainstorming or architectural decisions, Gateway assigns distinct epistemic identities:

| Agent | Framing | Contribution |
| --- | --- | --- |
| Architect | Systems thinker | Composability and cross-cutting concerns |
| Research | Evidence gatherer | Literature, benchmarks, prior art |
| Security | Threat modeler | Attack surfaces and failure modes |
| SRE | Operations lens | Runbook complexity, observability gaps |
| Review (Skeptic) | Fault finder | Edge cases, unstated assumptions |

Gateway MUST assign ≥3 framings for architectural decisions. No single-framing ideation.

## Cascade Safeguards (MASFT)

- **Max depth**: 3 delegation hops — halt and escalate at limit
- **Budget gates**: Pause at 80% token utilization; compaction or user approval to continue
- **Schema validation**: Every agent output validated before routing to next agent
- **Idempotent operations**: All agent operations safe to retry
- **Plan/execute separation**: Gateway validates plan before authorizing execution
- **Minimal context**: Agents receive only the context needed for their sub-task

## Post-Task Lifecycle

Agent completion → Gateway triggers: session memory capture → worklog → index updates → memory promotion review → report to user.

## Related

- [Gateway Agent](gateway.md) — Central orchestrator
- [All Agent Definitions](index.md) — Full roster
- [Skills](../skills/index.md) — All skills
- [Instructions](../instructions/index.md) — All instructions
- [Parallel Work Protocol](../instructions/parallel-work-protocol.md)

---

> **Provenance**: Created 2026-03-24. Condensed 2026-03-25: replaced verbose message templates with field table, simplified skill matrix.
