# Agents Index

AI agent definitions for the IPF distributed crawler project. Each agent is a specialist with defined responsibilities, skills, and coordination protocols.

## Orchestration

| Document | Description |
| --- | --- |
| [Gateway Agent](gateway.md) | Central orchestrator — entry point for all tasks, routes to specialists |
| [Orchestration Protocol](orchestration-protocol.md) | Inter-agent communication, skill loading, and coordination rules |

## Specialist Agents

| Agent | Domain | Primary Skills |
| --- | --- | --- |
| [Architect](architect.md) | System design, ADR management, tech choices | codebase-analysis, adr-management |
| [Implementation](implementation.md) | Code writing, features, refactoring | code-generation, git-safety |
| [Test](test.md) | Test writing, coverage, quality gates | test-generation, codebase-analysis |
| [Review](review.md) | PR review, council orchestration | pr-council-review, adr-compliance |
| [Research](research.md) | Investigation, evidence gathering, analysis | evidence-gathering, codebase-analysis |
| [Debug](debug.md) | Systematic debugging, root cause analysis | debug-analysis, codebase-analysis |
| [DevOps](devops.md) | CI/CD, K8s, Docker, Pulumi | infrastructure-management, git-safety |
| [SRE](sre.md) | Reliability, observability, SLOs | observability, codebase-analysis |
| [Security](security.md) | Security analysis, OWASP, supply chain | security-analysis, codebase-analysis |
| [Documentation](documentation.md) | Doc maintenance, memory promotion | doc-maintenance, memory-promotion |

## Index

- [Gateway Agent](gateway.md) — Central orchestrator and task router
- [Orchestration Protocol](orchestration-protocol.md) — Inter-agent communication protocol
- [Architect Agent](architect.md) — System design and ADR management
- [Implementation Agent](implementation.md) — Code writing and feature implementation
- [Test Agent](test.md) — Test writing and quality verification
- [Review Agent](review.md) — PR review council orchestration
- [Research Agent](research.md) — Investigation and evidence gathering
- [Debug Agent](debug.md) — Systematic debugging and root cause analysis
- [DevOps Agent](devops.md) — Infrastructure, CI/CD, and Kubernetes
- [SRE Agent](sre.md) — Reliability, observability, and resilience
- [Security Agent](security.md) — Security analysis and vulnerability detection
- [Documentation Agent](documentation.md) — Documentation maintenance and memory steward

---

> **Provenance**: Created 2026-03-24 as the agent directory index for the IPF distributed crawler project.
