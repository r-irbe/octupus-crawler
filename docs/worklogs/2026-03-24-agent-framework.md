# Worklog: AI Agent Framework

| Field | Value |
| --- | --- |
| **Date** | 2026-03-24 |
| **Status** | Complete |
| **Author** | AI Assistant |

## Summary

Created the complete AI agent framework for the IPF distributed crawler project: 11 agents, 14 skills, 6 instructions, orchestration protocol, and full CLAUDE.md routing integration.

## Work Completed

### Agent Definitions (11 files in `docs/agents/`)

- **Gateway** — Central orchestrator, entry point for all tasks, routes to specialists, manages parallel coordination
- **Architect** — System design, ADR management, technology decisions
- **Implementation** — Code writing with strict quality gates and ADR compliance
- **Test** — Test writing at all pyramid levels (unit, integration, e2e)
- **Review** — PR review council orchestration (Ralph-Loop protocol)
- **Research** — Evidence gathering and structured analysis
- **Debug** — Systematic debugging (reproduce → isolate → identify → fix → verify)
- **DevOps** — CI/CD, Kubernetes, Docker, Pulumi infrastructure
- **SRE** — Reliability, observability, SLOs
- **Security** — OWASP Top 10, supply chain, secrets audit
- **Documentation** — Doc maintenance, memory promotion steward

### Orchestration Protocol (`docs/agents/orchestration-protocol.md`)

- Hub-and-spoke topology (all communication through Gateway)
- Message protocol: Request Help, Task Assignment, Status Report, Completion Report
- Skill-Agent compatibility matrix
- Conflict resolution procedure
- Post-task lifecycle (memory promotion, worklog, indexes)

### Skill Definitions (14 files in `docs/skills/`)

- git-safety, codebase-analysis, adr-management, code-generation
- adr-compliance, evidence-gathering, pr-council-review, test-generation
- memory-promotion, doc-maintenance, debug-analysis, infrastructure-management
- observability, security-analysis

### Instruction Sets (6 files in `docs/instructions/`)

- **Belief Threshold** — Stop and ask user when confidence < 80%
- **Engineering Discipline** — 8 core quality principles
- **Decision Transparency** — Show work, present alternatives
- **User Collaboration** — 10-point collaboration contract
- **Git Safety Protocol** — Branch safety, forbidden actions
- **Parallel Work Protocol** — Multi-agent coordination, max 5 parallel agents

### Index and Routing Updates

- Created `docs/agents/index.md`, `docs/skills/index.md`, `docs/instructions/index.md`
- Updated `docs/index.md` with new directories
- Updated `CLAUDE.md` with agent selection table, instruction binding table, orchestration patterns

## Decisions Made

1. Hub-and-spoke topology (no direct agent-to-agent communication) for simplicity and auditability
2. Skills are selectively loaded per task; instructions are always active
3. Belief threshold set at 80% — below that, agents MUST ask the user
4. Maximum 5 parallel agents with 0 file overlap for git safety
5. Priority order for instruction conflicts: Belief → Git Safety → Engineering → Collaboration → Transparency → Parallel Work

## File Count

- 11 agent files + 1 orchestration protocol + 1 index = 13 files in `docs/agents/`
- 14 skill files + 1 index = 15 files in `docs/skills/`
- 6 instruction files + 1 index = 7 files in `docs/instructions/`
- 2 files updated (CLAUDE.md, docs/index.md)
- **Total: 35 new files + 2 updated**

---

> **Provenance**: Created 2026-03-24, documenting the AI agent framework creation session.
