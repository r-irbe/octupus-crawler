# Worklog: K8s E2E Testing Infrastructure

| Field | Value |
| --- | --- |
| Date | 2025-07-21 |
| Branch | `work/k8s-e2e-testing` |
| Commits | `b58baf3`, `ce4a3f2` |
| Scope | `packages/testing/`, `scripts/`, `infra/k8s/`, `infra/docker/`, `docs/specs/k8s-e2e/` |

## Summary

Added complete K8s E2E testing infrastructure: EARS specs, web simulator, k3d automation scripts, K8s overlay, and E2E test suite. Addresses 6 previously identified gaps in the E2E test tier.

## Changes

### Specs Created (Phase 1)

- `docs/specs/k8s-e2e/requirements.md` — 25 EARS requirements (REQ-K8E-001–025)
- `docs/specs/k8s-e2e/design.md` — System overview, scripts, overlay, test flow
- `docs/specs/k8s-e2e/design-simulator.md` — Web simulator architecture (split for 300-line limit)
- `docs/specs/k8s-e2e/tasks.md` — 22 tasks across 7 phases

### Implementation (Phase 2)

**Web Simulator** (5 files):
- `web-simulator.ts` — HTTP server with route registry, random port binding
- `site-graph-builder.ts` — Declarative page definitions → HTML routes
- `built-in-scenarios.ts` — 5 scenarios: slow, error, redirect chain, link trap, SSRF bait
- `web-simulator.unit.test.ts` — 13 unit tests
- `simulator-entrypoint.ts` — Docker container runner with default 7-page site

**K8s Automation** (3 scripts):
- `scripts/setup-local.sh` — k3d cluster + registry creation (idempotent)
- `scripts/teardown-local.sh` — Cluster + registry deletion
- `scripts/build-and-push.sh` — Docker build + push to local registry

**K8s E2E Overlay** (3 files):
- `infra/docker/Dockerfile.web-simulator` — Multi-stage simulator container
- `infra/k8s/overlays/e2e/kustomization.yml` — E2E overlay with reduced resources
- `infra/k8s/overlays/e2e/web-simulator.yml` — Pod + Service manifest

**E2E Tests** (6 files):
- `k8s-helpers.ts` — kubectl wrapper, port-forward, cluster-ready check
- `e2e-setup.ts` — Shared beforeAll/afterAll with port-forward setup
- `health-probes.e2e.test.ts` — Liveness, readiness, metrics, simulator health
- `crawl-pipeline.e2e.test.ts` — Seed URL → crawl → metrics verification
- `graceful-shutdown.e2e.test.ts` — SIGTERM mid-crawl
- `ssrf-blocking.e2e.test.ts` — SSRF bait + metrics verification

**Config** (3 modified):
- `packages/testing/vitest.config.ts` — Excluded `*.e2e.test.ts` from default run
- `packages/testing/vitest.e2e.config.ts` — Serial execution config for E2E
- Root `package.json` — Added `k8s:setup/teardown/build/e2e` scripts

## RALPH Review Findings

| # | Severity | Finding | Resolution |
| --- | --- | --- | --- |
| AR7 | Major | Concurrent E2E test execution risk | Added `vitest.e2e.config.ts` with `singleFork: true` |
| A1 | Minor | Dynamic import in graceful-shutdown test | Moved to top-level import |
| A2 | Minor | Ambiguous SSRF test dual-path logic | Added `simulatorScenarioPort` to E2EContext |
| S5 | Minor | Raw body injection in site-graph-builder | Documented `page.body` as trusted HTML |

## Decisions

1. Split `design.md` into `design.md` + `design-simulator.md` for 300-line limit
2. E2E tests excluded from default `vitest run` — require k3d cluster
3. Web simulator uses `node:http` (not undici/express) for minimal dependencies
4. Port forwarding uses `:0` for random local port allocation

## Gaps Closed

- GAP-TEST-003: No E2E test files → 4 E2E tests created
- GAP-TEST-004: No setup-local.sh → Created with idempotent k3d setup
- GAP-TEST-005: No web simulator → Full simulator with 5 scenarios
- GAP-TEST-006: E2E tier at 0% → Foundation now in place

## Deferred

- T-K8E-020: CI matrix for E2E (needs GitHub Actions integration)
- T-K8E-021/022: Documentation updates and full verification
- E2E tests cannot be validated without live k3d cluster

---

> **Provenance**: Created 2025-07-21 by Copilot agent.
