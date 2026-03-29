# Worklog: Remaining ADR Gap Specs — 2026-03-29

## Summary

Created service-communication and resilience-patterns feature specs to close remaining ADR gaps.

## Changes

### Files Created

- `docs/specs/service-communication/requirements.md` — 22 EARS requirements (REQ-COMM-001-022)
- `docs/specs/service-communication/design.md` — tRPC routers, domain events, Temporal workflows
- `docs/specs/service-communication/tasks.md` — 27 tasks across 6 phases
- `docs/specs/resilience-patterns/requirements.md` — 20 EARS requirements (REQ-RES-001-020)
- `docs/specs/resilience-patterns/design.md` — 7-layer stack, cockatiel composition, LRU breakers
- `docs/specs/resilience-patterns/tasks.md` — 25 tasks across 6 phases

### Files Modified

- `docs/specs/index.md` — Added 2 new specs, 484 total requirements (was 442)
- `docs/memory/session/2026-03-29-remaining-specs-state.md` — State tracker

## Decisions

- Temporal tasks (T-COMM-016-020) marked MEDIUM-TERM per ADR-017 §5 evaluation note
- IaC (ADR-003) and GitOps (ADR-004) specs deferred pending cloud provider choice

## RALPH Review Council (G8)

- AR-1 (Sustained Minor): `createFetchPolicy` was simplified — added note about full 7-layer composition
- AR-2 (Sustained Minor): Temporal tasks marked as MEDIUM-TERM in tasks.md
- AR-4 (Sustained Minor): Added graceful shutdown + health probes cross-references to resilience design

## Commits

| Hash | Message |
| ---- | ------- |
| d9791d1 | docs(specs): add service-communication and resilience-patterns specs |
| 0b7f0c7 | docs(specs): apply RALPH review council findings (AR-1, AR-2, AR-4) |

## Deferred

- IaC/Pulumi spec (ADR-003) — blocked on cloud provider choice
- GitOps/ArgoCD spec (ADR-004) — depends on IaC decisions

---

> **Provenance**: Created 2026-03-29. Branch: `work/remaining-specs`.
