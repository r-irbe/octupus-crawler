# IPF Crawler — Documentation Index

Project documentation for the IPF distributed web crawler. All documentation follows the [Documentation Standards](guidelines/documentation-standards.md) with provenance tracking and structured indexes.

## Directories

| Directory | Description | Documents |
| --- | --- | --- |
| [Architecture Decision Records](adr/index.md) | Architectural decisions with context, alternatives, and rationale | 19 ADRs + template |
| [Automation](automation/index.md) | Event-driven automation: 7 pipelines, triggers, metrics, SLOs | 10 |
| [Agents](agents/index.md) | AI agent definitions with orchestration protocols | 11 agents + orchestration protocol |
| [Skills](skills/index.md) | Skill definitions that provide domain knowledge to agents | 18 skills |
| [Instructions](instructions/index.md) | Always-active rules all agents must follow | 6 instructions |
| [Conventions](conventions/index.md) | Process conventions (PR reviews, code style, workflows) | 1 |
| [Guidelines](guidelines/index.md) | Technical guidelines and standards | 2 |
| [Research](research/) | Architecture, coding, agentic coding, and ideation/decision research documents | 4 |
| [Plans](plans/index.md) | Project plans, roadmaps, and proposals | — |
| [Worklogs](worklogs/index.md) | Chronological work session logs | 5 |
| [Analysis](analysis/index.md) | Technical analysis and research documents | — |
| [Memory](memory/index.md) | Knowledge management (session → short-term → long-term) | — |

## Quick Reference

- **AGENTS.md**: [../AGENTS.md](../AGENTS.md) — Canonical AI coding instructions (tool-agnostic, all AI tools)
- **CLAUDE.md**: [../CLAUDE.md](../CLAUDE.md) — Claude Code-specific agent framework and workflows
- **Copilot Instructions**: [../.github/copilot-instructions.md](../.github/copilot-instructions.md) — GitHub Copilot-specific guidance
- **Gateway Agent**: [agents/gateway.md](agents/gateway.md) — Central orchestrator entry point
- **Orchestration Protocol**: [agents/orchestration-protocol.md](agents/orchestration-protocol.md) — Inter-agent coordination
- **Automation**: [automation/index.md](automation/index.md) — Automated pipelines and event triggers
- **ADR Template**: [adr/TEMPLATE.md](adr/TEMPLATE.md) — Template for new ADRs
- **PR Reviews**: [conventions/pr-review-council.md](conventions/pr-review-council.md) — Council review process
- **Doc Standards**: [guidelines/documentation-standards.md](guidelines/documentation-standards.md) — How to write docs
- **Memory Workflow**: [guidelines/memory-promotion-workflow.md](guidelines/memory-promotion-workflow.md) — Knowledge promotion
- **Belief Threshold**: [instructions/belief-threshold.md](instructions/belief-threshold.md) — Ask when unsure

## Index

- [Architecture Decision Records](adr/index.md) — Architectural decisions (ADR-001 through ADR-019)
- [Automation](automation/index.md) — 7 automated pipelines, triggers, metrics, SLOs
- [Agents](agents/index.md) — 11 AI agents with orchestration protocol
- [Skills](skills/index.md) — 18 skills providing domain knowledge to agents
- [Instructions](instructions/index.md) — 6 always-active instruction sets
- [Conventions](conventions/index.md) — PR review council process
- [Guidelines](guidelines/index.md) — Documentation standards, memory promotion workflow
- [Research](research/) — Architecture (arch.md), coding standards (code.md), agentic coding (ai_coding.md), and ideation/decisions (ideating.md) research
- [Plans](plans/index.md) — Project plans and roadmaps
- [Worklogs](worklogs/index.md) — Chronological work session logs
- [Analysis](analysis/index.md) — Technical analysis documents
- [Memory](memory/index.md) — Knowledge management tiers

---

> **Provenance**: Created 2026-03-24; updated 2026-03-25 with multi-tool AI instruction architecture (AGENTS.md, copilot-instructions.md). Updated 2026-03-25: ADR-019 and ideating.md research integration.
