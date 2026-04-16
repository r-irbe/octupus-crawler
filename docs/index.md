# IPF Crawler — Documentation Index

All docs follow [Documentation Standards](guidelines/documentation-standards.md) with provenance tracking.

## Directories

| Directory | Description |
| --- | --- |
| [Architecture](ARCHITECTURE.md) | Design, hexagonal layout, API, tech stack, CI/CD, testing |
| [Getting Started](GETTING-STARTED.md) | Docker Compose, k3d, mega simulator, load/chaos testing |
| [Load Testing](LOAD-TESTING.md) | k6 profiles, Chaos Mesh, autoscaling, Grafana dashboards |
| [ADRs](adr/index.md) | 22 architectural decisions + template |
| [Automation](automation/index.md) | 7 pipelines, triggers, metrics, SLOs |
| [Agents](agents/index.md) | 11 AI agents + orchestration protocol |
| [Skills](skills/index.md) | 18 domain-knowledge skill definitions |
| [Instructions](instructions/index.md) | 8 always-active agent rules |
| [Conventions](conventions/index.md) | PR review council process |
| [Guidelines](guidelines/index.md) | Doc standards, memory promotion |
| [Patterns](patterns/) | Implementation patterns (AsyncLocalStorage) |
| [Specs](specs/index.md) | Feature specifications (12 features + virtual memory) |
| [Research](research/) | Architecture, coding, agentic, ideation research |
| [Plans](plans/index.md) | Project plans and roadmaps |
| [Worklogs](worklogs/index.md) | Chronological work session logs |
| [Analysis](analysis/index.md) | Technical analysis documents |
| [Memory](memory/index.md) | Knowledge management (session → short-term → long-term) |

## Quick Reference

- **[AGENTS.md](../AGENTS.md)** — Canonical AI coding instructions (all tools)
- **[CLAUDE.md](../CLAUDE.md)** — Claude Code-specific extensions
- **[Copilot Instructions](../.github/copilot-instructions.md)** — GitHub Copilot-specific guidance
- **[Gateway Agent](agents/gateway.md)** — Central orchestrator entry point
- **[ADR Template](adr/TEMPLATE.md)** — Template for new ADRs
- **[PR Reviews](conventions/pr-review-council.md)** — Council review process
- **[Belief Threshold](instructions/belief-threshold.md)** — Ask when unsure

---

> **Provenance**: Created 2026-03-24. Condensed 2026-03-25: merged table + index, trimmed quick reference.
