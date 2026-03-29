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

## Phase 8: Extended Simulator Scenarios

- [x] **T-K8E-023**: Add `robotsTxtBlockRoute` to built-in scenarios — returns Disallow rules for specific paths → REQ-K8E-038
- [x] **T-K8E-024**: Add `rateLimitRoute` (429 + Retry-After header) to built-in scenarios → REQ-K8E-034
- [x] **T-K8E-025**: Add `mixedLinksRoute` — page with diverse link types (relative, absolute, fragment, mailto, javascript:) → REQ-K8E-037
- [x] **T-K8E-026**: Write unit tests for new simulator scenarios → REQ-K8E-034, REQ-K8E-037, REQ-K8E-038

## Phase 9: Extended E2E Test Scenarios

- [x] **T-K8E-027**: Create `redirect-chain.e2e.test.ts` — max redirects, SSRF per-hop validation → REQ-K8E-026, REQ-K8E-027
- [x] **T-K8E-028**: Create `slow-response-timeout.e2e.test.ts` — fetch timeout enforcement, timeout metrics → REQ-K8E-029, REQ-K8E-030
- [x] **T-K8E-029**: Create `error-handling.e2e.test.ts` — 4xx no-retry, 5xx retry backoff, error metrics → REQ-K8E-032, REQ-K8E-033
- [x] **T-K8E-030**: Create `link-trap-depth-limit.e2e.test.ts` — bounded crawl depth, dedup verification → REQ-K8E-035, REQ-K8E-036
- [x] **T-K8E-031**: Create `robots-txt-compliance.e2e.test.ts` — Disallow paths skipped, Crawl-delay honored → REQ-K8E-038, REQ-K8E-039
- [x] **T-K8E-032**: Create `observability-pipeline.e2e.test.ts` — metrics accuracy, metric names, bytes counter → REQ-K8E-040, REQ-K8E-042
- [x] **T-K8E-033**: Create `concurrent-domain-isolation.e2e.test.ts` — per-domain isolation, slow domain doesn't starve others → REQ-K8E-030, REQ-K8E-031
- [x] **T-K8E-034**: Create `url-normalization-dedup.e2e.test.ts` — canonical URL normalization, no re-fetches → REQ-K8E-036, REQ-K8E-037

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
| Phase 7 (verify) | Phases 1–6 | Phase 8 |
| Phase 8 (extended sim) | Phase 1 | Phase 9 |
| Phase 9 (extended E2E) | Phases 4, 8 | — |

## MVP Critical Path

Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 (original MVP)

Extended: Phase 8 (T-K8E-023–026) → Phase 9 (T-K8E-027–034)

---

> **Provenance**: Created 2025-07-21. Extended 2025-07-21 with Phases 8-9 (12 new tasks). Total: 34 tasks.
