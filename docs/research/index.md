# Research Index

Research documents providing the evidence base for Architecture Decision Records and project conventions.

## Documents

| Document | Topic | ADRs Informed |
| --- | --- | --- |
| [arch.md](arch.md) | Architecture patterns, distributed systems, monorepo tooling | ADR-001 through ADR-013 |
| [code.md](code.md) | Coding standards, TypeScript patterns, CUPID, FOOP | ADR-016 |
| [ai_coding.md](ai_coding.md) | Agentic coding, context rot, Guard Functions, SDD | ADR-018 |
| [collapse.md](collapse.md) | Context collapse taxonomy, prevention frameworks, persona drift, OWASP ASI Top 10 | ADR-018, ADR-019 |
| [ideating.md](ideating.md) | Brainstorming science, reasoning frameworks, anti-sycophancy | ADR-019 |
| [spec.md](spec.md) | Spec-Driven Development, EARS, contract-first API, quality gates, formal methods | ADR-020 |
| [REQUIREMENTS-AGNOSTIC.md](REQUIREMENTS-AGNOSTIC.md) | Technology-agnostic requirements (200+), gap analysis, remediation roadmap | All ADRs, [Specs](../specs/index.md) |

## Index

- [arch.md](arch.md) — 12-phase architecture plan: monorepo, Redis, API, database, resilience, observability, testing, security, CI/CD, K8s
- [code.md](code.md) — TypeScript strict mode, CUPID principles, FOOP paradigm, neverthrow, naming conventions, ESLint rules
- [ai_coding.md](ai_coding.md) — Context rot mitigation, Atomic Action Pairs, Guard Functions, Spec-Driven Development, token budget, schema-first
- [collapse.md](collapse.md) — Ten context collapse failure modes (attention basin, lost-in-middle, context cliff, persona drift, safety destabilization, instruction fade, semantic drift, brevity bias, memory poisoning, cascading failures), prevention frameworks (ACE, SSGM, SagaLLM, HiAgent, InfiniteICL), the OWASP ASI Top 10 for agentic AI, MCP protocol vulnerabilities, persona drift detection metrics
- [ideating.md](ideating.md) — Brainstorming science (EBS, brainwriting), AI reasoning frameworks (CoT/ToT/GoT/SPIRAL), multi-agent debate pathologies, anti-sycophancy
- [spec.md](spec.md) — EARS requirements syntax, Martin Fowler SDD taxonomy, Kiro/GitHub Spec Kit/BMAD tooling, contract-first API (TypeSpec/Spectral/Dredd/Pact), property-based testing from specs, evidence-driven quality gates, formal methods (TLA+), human-AI collaboration models
- [REQUIREMENTS-AGNOSTIC.md](REQUIREMENTS-AGNOSTIC.md) — 194 technology-agnostic requirements across 10 domains (architecture, crawl pipeline, security, HTTP fetching, distributed, observability, lifecycle, alerting, infrastructure, testing), 27-item gap analysis, prioritized remediation roadmap. Converted to EARS specs in [docs/specs/](../specs/index.md)

---

> **Provenance**: Created 2026-03-25 as the research directory index.
