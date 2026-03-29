# Specs Index

> Master index of all feature specifications created per [ADR-020](../adr/ADR-020-spec-driven-development.md).
> Each feature has three documents: `requirements.md` (EARS), `design.md` (architecture), `tasks.md` (implementation).
> Source: [REQUIREMENTS-AGNOSTIC.md](../research/REQUIREMENTS-AGNOSTIC.md)

---

## Feature Specifications

| Feature | Directory | Requirement IDs | Source Sections | Docs |
| --- | --- | --- | --- | --- |
| Core Contracts | [core-contracts/](core-contracts/) | REQ-ARCH-001 to 018 | §2 | [req](core-contracts/requirements.md) [des](core-contracts/design.md) [tasks](core-contracts/tasks.md) |
| Crawl Pipeline | [crawl-pipeline/](crawl-pipeline/) | REQ-CRAWL-001 to 019 | §3 | [req](crawl-pipeline/requirements.md) [des](crawl-pipeline/design.md) [tasks](crawl-pipeline/tasks.md) |
| SSRF Guard | [ssrf-guard/](ssrf-guard/) | REQ-SEC-001 to 019 | §4 | [req](ssrf-guard/requirements.md) [des](ssrf-guard/design.md) [tasks](ssrf-guard/tasks.md) |
| HTTP Fetching | [http-fetching/](http-fetching/) | REQ-FETCH-001 to 024 | §5 | [req](http-fetching/requirements.md) [des](http-fetching/design.md) [tasks](http-fetching/tasks.md) |
| URL Frontier | [url-frontier/](url-frontier/) | REQ-DIST-001 to 009 | §6.1-6.2 | [req](url-frontier/requirements.md) [des](url-frontier/design.md) [tasks](url-frontier/tasks.md) |
| Worker Management | [worker-management/](worker-management/) | REQ-DIST-007 to 014 | §6.3-6.4 | [req](worker-management/requirements.md) [des](worker-management/design.md) [tasks](worker-management/tasks.md) |
| Completion Detection | [completion-detection/](completion-detection/) | REQ-DIST-012 to 027 | §6.5-6.7 | [req](completion-detection/requirements.md) [des](completion-detection/design.md) [tasks](completion-detection/tasks.md) |
| Observability | [observability/](observability/) | REQ-OBS-001 to 030 | §7 | [req](observability/requirements.md) [des](observability/design.md) [tasks](observability/tasks.md) |
| Application Lifecycle | [application-lifecycle/](application-lifecycle/) | REQ-LIFE-001 to 034, REQ-LIFE-CFG-001 to 003 | §2.5, §8, §10.5 | [req](application-lifecycle/requirements.md) [des](application-lifecycle/design.md) [tasks](application-lifecycle/tasks.md) |
| Alerting | [alerting/](alerting/) | REQ-ALERT-001 to 017 | §9 | [req](alerting/requirements.md) [des](alerting/design.md) [tasks](alerting/tasks.md) |
| Infrastructure | [infrastructure/](infrastructure/) | REQ-INFRA-001 to 021 | §10 | [req](infrastructure/requirements.md) [des](infrastructure/design.md) [tasks](infrastructure/tasks.md) |
| Testing & Quality | [testing-quality/](testing-quality/) | REQ-TEST-001 to 024 | §11 | [req](testing-quality/requirements.md) [des](testing-quality/design.md) [tasks](testing-quality/tasks.md) |
| K8s E2E Testing | [k8s-e2e/](k8s-e2e/) | REQ-K8E-001 to 025 | ADR-005, ADR-007 §E2E | [req](k8s-e2e/requirements.md) [des](k8s-e2e/design.md) [tasks](k8s-e2e/tasks.md) |
| Production Testing | [production-testing/](production-testing/) | REQ-PROD-001 to 027 | ADR-002, ADR-007, ADR-009 | [req](production-testing/requirements.md) [des](production-testing/design.md) [tasks](production-testing/tasks.md) |
| API Contracts | [api-contracts/](api-contracts/) | REQ-API-001 to 010 | ADR-011, ADR-017 | [req](api-contracts/requirements.md) [des](api-contracts/design.md) [tasks](api-contracts/tasks.md) |

## Agent Virtual Memory Specifications

| Feature | Directory | Requirement IDs | ADR Reference | Docs |
| --- | --- | --- | --- | --- |
| Virtual Memory | [virtual-memory/](virtual-memory/) | REQ-VMEM-001 to 021 | ADR-022 §6 | [req](virtual-memory/requirements.md) [des](virtual-memory/design.md) [tasks](virtual-memory/tasks.md) |

## Agentic Setup Improvement Specifications

| Feature | Directory | Requirement IDs | Source | Docs |
| --- | --- | --- | --- | --- |
| Agentic Setup | [agentic-setup/](agentic-setup/) | REQ-AGENT-001 to 106 | [copilot_claude_code.md](../research/copilot_claude_code.md), [ai_coding.md](../research/ai_coding.md), [collapse.md](../research/collapse.md), [ideating.md](../research/ideating.md), [spec.md](../research/spec.md), [REQUIREMENTS-AGNOSTIC.md](../research/REQUIREMENTS-AGNOSTIC.md), [arch.md](../research/arch.md), [code.md](../research/code.md), [post-mortem](../worklogs/2026-03-25-implementation-postmortem.md) | [req](agentic-setup/requirements.md) [des](agentic-setup/design.md) [tasks](agentic-setup/tasks.md) |

## Requirement Count Summary

| Domain | Count |
| --- | --- |
| Architecture (REQ-ARCH) | 18 |
| Crawl Pipeline (REQ-CRAWL) | 19 |
| Security (REQ-SEC) | 19 |
| HTTP Fetching (REQ-FETCH) | 24 |
| Distributed (REQ-DIST) | 30 |
| Observability (REQ-OBS) | 30 |
| Lifecycle (REQ-LIFE) | 37 |
| Alerting (REQ-ALERT) | 17 |
| Infrastructure (REQ-INFRA) | 21 |
| Testing (REQ-TEST) | 24 |
| K8s E2E (REQ-K8E) | 42 |
| Virtual Memory (REQ-VMEM) | 21 |
| Agentic Setup (REQ-AGENT) | 106 |
| API Contracts (REQ-API) | 10 |
| **Total** | **376** |

## Implementation Order

Recommended build order based on dependency analysis across all task files:

1. **core-contracts** — Foundation types, error taxonomy, contract interfaces
2. **observability** — Logger, metrics, tracing (needed by all features)
3. **application-lifecycle** (Phase 1: config) — Zod config schema
4. **ssrf-guard** — IP validation (needed by http-fetching)
5. **http-fetching** — Fetch client (needs ssrf-guard, observability)
6. **crawl-pipeline** — Pipeline stages (needs http-fetching)
7. **url-frontier** — BullMQ frontier (needs core-contracts)
8. **worker-management** — Job consumer (needs url-frontier)
9. **completion-detection** — Coordinator (needs worker-management)
10. **application-lifecycle** (Phases 2-7) — Startup/shutdown (needs all above)
11. **alerting** — PromQL rules (needs observability metrics)
12. **infrastructure** — Docker, K8s, compose (needs application code)
13. **testing-quality** — Test infrastructure, CI pipeline (needs all features)
14. **agentic-setup** — Agent configuration, enforcement hooks, TDD workflows, CI pipeline for agent PRs (independent — can be implemented in parallel with features)

## Gap Analysis Integration

The REQUIREMENTS-AGNOSTIC.md §12 identified 27 gaps. These are addressed in the specs as follows:

- Security gaps (GAP-001 to 010): [ssrf-guard/requirements.md](ssrf-guard/requirements.md)
- Alert gaps (GAP-ALERT-001 to 003): [alerting/requirements.md](alerting/requirements.md)
- Remaining gaps: Distributed across relevant feature specs

---

> **Provenance**: Created 2026-03-25. Documentation Agent index per ADR-020. Updated 2026-03-26: updated requirement counts after PR Review Council fixes (300 → 366 requirements). Updated 2026-03-26: P2/P3 fixes — created virtual-memory/tasks.md, added 55+ implementation tasks across 12 specs, added Gherkin acceptance criteria for all new requirements, fixed all markdown lint errors.
