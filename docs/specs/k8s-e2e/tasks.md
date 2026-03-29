# K8s E2E Testing — Tasks

> Implementation tasks traceable to [requirements.md](requirements.md). Dependency-ordered.
> Design: [design.md](design.md)

---

## Phase 1: Web Simulator

- [x] **T-K8E-001**: Create `packages/testing/src/simulators/web-simulator.ts` — HTTP server with route registry, random port binding → REQ-K8E-010, REQ-K8E-012, REQ-K8E-015
- [x] **T-K8E-002**: Create `packages/testing/src/simulators/site-graph-builder.ts` — declarative site graph to routes converter → REQ-K8E-011
- [x] **T-K8E-003**: Create `packages/testing/src/simulators/built-in-scenarios.ts` — slow, error, reset, redirect, trap, robots, SSRF-bait scenarios → REQ-K8E-013, REQ-K8E-014
- [x] **T-K8E-004**: Write unit tests for web simulator (route matching, site graph HTML generation, scenario behaviors) → REQ-K8E-010–015
- [x] **T-K8E-005**: Create `infra/docker/Dockerfile.web-simulator` — container image for K8s deployment → REQ-K8E-016

## Phase 2: Cluster Automation

- [x] **T-K8E-006**: Create `scripts/setup-local.sh` — k3d cluster + registry creation, idempotent → REQ-K8E-001, REQ-K8E-002, REQ-K8E-003, REQ-K8E-006
- [x] **T-K8E-007**: Create `scripts/teardown-local.sh` — cluster + registry deletion → REQ-K8E-004
- [x] **T-K8E-008**: Create `scripts/build-and-push.sh` — build crawler + simulator images, push to local registry with git SHA tag → REQ-K8E-007, REQ-K8E-008
- [x] **T-K8E-009**: Add `pnpm` scripts in root `package.json`: `k8s:setup`, `k8s:teardown`, `k8s:build`, `k8s:e2e` → REQ-K8E-001

## Phase 3: K8s E2E Overlay

- [x] **T-K8E-010**: Create `infra/k8s/overlays/e2e/kustomization.yml` — E2E overlay with reduced resources → REQ-K8E-009
- [x] **T-K8E-011**: Create `infra/k8s/overlays/e2e/web-simulator.yml` — Pod manifest for simulator in ipf-test namespace → REQ-K8E-016
- [ ] **T-K8E-012**: Verify Kustomize build for E2E overlay renders correctly → REQ-K8E-005

## Phase 4: E2E Test Helpers

- [x] **T-K8E-013**: Create `packages/testing/src/e2e/helpers/k8s-helpers.ts` — kubectl exec, port-forward, wait-for-pod utilities → REQ-K8E-017
- [x] **T-K8E-014**: Create `packages/testing/src/e2e/helpers/e2e-setup.ts` — beforeAll/afterAll: verify cluster, deploy manifests, setup port-forwards → REQ-K8E-017

## Phase 5: E2E Test Scenarios

- [x] **T-K8E-015**: Create `health-probes.e2e.test.ts` — verify /health and /readyz return 200 in K8s → REQ-K8E-020
- [x] **T-K8E-016**: Create `crawl-pipeline.e2e.test.ts` — seed URL → crawl → verify discovered URLs in frontier → REQ-K8E-017, REQ-K8E-021
- [x] **T-K8E-017**: Create `graceful-shutdown.e2e.test.ts` — SIGTERM → drain → clean exit → REQ-K8E-018
- [x] **T-K8E-018**: Create `ssrf-blocking.e2e.test.ts` — SSRF-bait links rejected, no fetch to reserved IPs → REQ-K8E-019
- [ ] **T-K8E-019**: Create `multi-replica-dedup.e2e.test.ts` — 2 replicas, verify no duplicate URL processing → REQ-K8E-022

## Phase 6: CI Integration

- [ ] **T-K8E-020**: Add E2E job to `.github/workflows/agent-pr-validation.yml` — optional k3d E2E stage → REQ-K8E-024, REQ-K8E-025

## Phase 7: Documentation & Verification

- [ ] **T-K8E-021**: Verify E2E test suite completes within 5 minutes → REQ-K8E-023
- [x] **T-K8E-022**: Update `docs/specs/index.md` with k8s-e2e spec entry

---

## Dependencies

| Task | Depends On | Blocks |
| --- | --- | --- |
| Phase 1 (simulator) | packages/testing exists | Phases 3, 5 |
| Phase 2 (scripts) | k3d + Docker available | Phases 3, 4, 5 |
| Phase 3 (overlay) | Phase 1 (simulator image), base K8s manifests | Phase 5 |
| Phase 4 (helpers) | Phase 2 (cluster running) | Phase 5 |
| Phase 5 (E2E tests) | Phases 1–4 | Phase 6 |
| Phase 6 (CI) | Phase 5 | Phase 7 |
| Phase 7 (verify) | Phases 1–6 | — |

## MVP Critical Path

Phase 1 (T-K8E-001–004) → Phase 2 (T-K8E-006–008) → Phase 3 (T-K8E-010–011) → Phase 4 (T-K8E-013–014) → Phase 5 (T-K8E-015–016)

Minimum viable: web simulator + cluster scripts + crawl pipeline E2E test. Other E2E scenarios (shutdown, SSRF, multi-replica) can follow.

---

> **Provenance**: Created 2025-07-21 per ADR-020. 22 tasks across 7 phases. MVP critical path: 10 tasks.
