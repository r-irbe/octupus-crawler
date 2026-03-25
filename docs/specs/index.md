# Specs Index

> Master index of all feature specifications created per [ADR-020](../adr/ADR-020-spec-driven-development.md).
> Each feature has three documents: `requirements.md` (EARS), `design.md` (architecture), `tasks.md` (implementation).
> Source: [REQUIREMENTS-AGNOSTIC.md](../research/REQUIREMENTS-AGNOSTIC.md)

---

## Feature Specifications

| Feature | Directory | Requirement IDs | Source Sections | Docs |
| --- | --- | --- | --- | --- |
| Core Contracts | [core-contracts/](core-contracts/) | REQ-ARCH-001 to 015 | §2 | [req](core-contracts/requirements.md) [des](core-contracts/design.md) [tasks](core-contracts/tasks.md) |
| Crawl Pipeline | [crawl-pipeline/](crawl-pipeline/) | REQ-CRAWL-001 to 016 | §3 | [req](crawl-pipeline/requirements.md) [des](crawl-pipeline/design.md) [tasks](crawl-pipeline/tasks.md) |
| SSRF Guard | [ssrf-guard/](ssrf-guard/) | REQ-SEC-001 to 013 | §4 | [req](ssrf-guard/requirements.md) [des](ssrf-guard/design.md) [tasks](ssrf-guard/tasks.md) |
| HTTP Fetching | [http-fetching/](http-fetching/) | REQ-FETCH-001 to 019 | §5 | [req](http-fetching/requirements.md) [des](http-fetching/design.md) [tasks](http-fetching/tasks.md) |
| URL Frontier | [url-frontier/](url-frontier/) | REQ-DIST-001 to 006 | §6.1-6.2 | [req](url-frontier/requirements.md) [des](url-frontier/design.md) [tasks](url-frontier/tasks.md) |
| Worker Management | [worker-management/](worker-management/) | REQ-DIST-007 to 011 | §6.3-6.4 | [req](worker-management/requirements.md) [des](worker-management/design.md) [tasks](worker-management/tasks.md) |
| Completion Detection | [completion-detection/](completion-detection/) | REQ-DIST-012 to 022 | §6.5-6.7 | [req](completion-detection/requirements.md) [des](completion-detection/design.md) [tasks](completion-detection/tasks.md) |
| Observability | [observability/](observability/) | REQ-OBS-001 to 026 | §7 | [req](observability/requirements.md) [des](observability/design.md) [tasks](observability/tasks.md) |
| Application Lifecycle | [application-lifecycle/](application-lifecycle/) | REQ-LIFE-001 to 028, REQ-LIFE-CFG-001 to 003 | §2.5, §8, §10.5 | [req](application-lifecycle/requirements.md) [des](application-lifecycle/design.md) [tasks](application-lifecycle/tasks.md) |
| Alerting | [alerting/](alerting/) | REQ-ALERT-001 to 013 | §9 | [req](alerting/requirements.md) [des](alerting/design.md) [tasks](alerting/tasks.md) |
| Infrastructure | [infrastructure/](infrastructure/) | REQ-INFRA-001 to 019 | §10 | [req](infrastructure/requirements.md) [des](infrastructure/design.md) [tasks](infrastructure/tasks.md) |
| Testing & Quality | [testing-quality/](testing-quality/) | REQ-TEST-001 to 020 | §11 | [req](testing-quality/requirements.md) [des](testing-quality/design.md) [tasks](testing-quality/tasks.md) |

## Requirement Count Summary

| Domain | Count |
| --- | --- |
| Architecture (REQ-ARCH) | 15 |
| Crawl Pipeline (REQ-CRAWL) | 16 |
| Security (REQ-SEC) | 13 |
| HTTP Fetching (REQ-FETCH) | 19 |
| Distributed (REQ-DIST) | 22 |
| Observability (REQ-OBS) | 26 |
| Lifecycle (REQ-LIFE) | 31 |
| Alerting (REQ-ALERT) | 13 |
| Infrastructure (REQ-INFRA) | 19 |
| Testing (REQ-TEST) | 20 |
| **Total** | **194** |

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

## Gap Analysis Integration

The REQUIREMENTS-AGNOSTIC.md §12 identified 27 gaps. These are addressed in the specs as follows:

- Security gaps (GAP-001 to 010): [ssrf-guard/requirements.md](ssrf-guard/requirements.md)
- Alert gaps (GAP-ALERT-001 to 003): [alerting/requirements.md](alerting/requirements.md)
- Remaining gaps: Distributed across relevant feature specs

---

> **Provenance**: Created 2026-03-25. Documentation Agent index per ADR-020.
