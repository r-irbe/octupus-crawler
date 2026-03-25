# Agents

AI agent definitions for the IPF crawler. Each agent is a specialist routed by the Gateway.

## Orchestration

| Document | Description |
| --- | --- |
| [Gateway](gateway.md) | Entry point — routes all tasks to specialists |
| [Orchestration Protocol](orchestration-protocol.md) | Inter-agent communication and coordination rules |

## Specialists

| Agent | Domain | Primary Skills |
| --- | --- | --- |
| [Architect](architect.md) | System design, ADRs, tech choices | codebase-analysis, adr-management |
| [Implementation](implementation.md) | Code writing, features, refactoring | code-generation, git-safety |
| [Test](test.md) | Test writing, coverage, quality gates | test-generation, codebase-analysis |
| [Review](review.md) | PR review, council orchestration | pr-council-review, adr-compliance |
| [Research](research.md) | Investigation, evidence gathering | evidence-gathering, codebase-analysis |
| [Debug](debug.md) | Systematic debugging, root cause | debug-analysis, codebase-analysis |
| [DevOps](devops.md) | CI/CD, K8s, Docker, Pulumi | infrastructure-management, git-safety |
| [SRE](sre.md) | Reliability, observability, SLOs | observability, codebase-analysis |
| [Security](security.md) | Security analysis, OWASP, supply chain | security-analysis, codebase-analysis |
| [Documentation](documentation.md) | Doc maintenance, memory promotion | doc-maintenance, memory-promotion |

---

> **Provenance**: Created 2026-03-24. Condensed 2026-03-25.
