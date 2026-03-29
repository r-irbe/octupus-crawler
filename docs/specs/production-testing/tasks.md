# Production Testing — Tasks

> Implementation tasks for chaos, load, scaling, and DDoS testing.
> Traces to: [requirements.md](requirements.md), [design.md](design.md)

---

## Phase 1: Chaos Helpers & Simulator Extensions

- [x] **T-PROD-001**: Create `packages/testing/src/e2e/helpers/chaos-helpers.ts` — kubectl wrappers: `killPod`, `getPodNames`, `getReadyReplicas`, `scaleDeployment`, `applyNetworkPolicy`, `deleteNetworkPolicy` → design.md §3.4
- [x] **T-PROD-002**: Add `burstLinksRoute` to `built-in-scenarios.ts` — page with N links to unique URLs, for link-bomb simulation → REQ-PROD-020, REQ-PROD-024
- [x] **T-PROD-003**: Add `connectionHoldRoute` to `built-in-scenarios.ts` — hold connection open for N ms (slow loris pattern) → REQ-PROD-007
- [x] **T-PROD-004**: Add `dynamic429Route` to `built-in-scenarios.ts` — return 200 for first N requests, then 429 → REQ-PROD-022
- [x] **T-PROD-005**: Write unit tests for new simulator routes and chaos helpers → T-PROD-001–004

## Phase 2: Chaos E2E Tests — Pod Failures

- [x] **T-PROD-006**: Create `chaos-pod-kill.e2e.test.ts` — force-delete worker pod during processing, verify job reassignment → REQ-PROD-001, REQ-PROD-002
- [x] **T-PROD-007**: Add Redis failure test in `chaos-pod-kill.e2e.test.ts` — kill dragonfly, verify reconnection and job retention → REQ-PROD-003, REQ-PROD-004
- [x] **T-PROD-008**: Add health endpoint verification during shutdown in `chaos-pod-kill.e2e.test.ts` → REQ-PROD-005

## Phase 3: Chaos E2E Tests — Network Partitions

- [x] **T-PROD-009**: Create `infra/k8s/overlays/e2e/network-partition-policy.yaml` — NetworkPolicy blocking worker→Redis → design.md §3.3
- [x] **T-PROD-010**: Create `chaos-network-partition.e2e.test.ts` — apply NetworkPolicy, verify circuit breaker opens, remove policy, verify recovery → REQ-PROD-006, REQ-PROD-008
- [x] **T-PROD-011**: Add fetch timeout test in `chaos-network-partition.e2e.test.ts` — partition worker→simulator, verify timeout and retry → REQ-PROD-007

## Phase 4: Load Testing (k6)

- [x] **T-PROD-012**: Create `packages/testing/src/load/slo-thresholds.ts` — shared SLO constants (p95 latency, error rate, memory) → design.md §4.3
- [x] **T-PROD-013**: Create `packages/testing/src/load/k6-helpers.ts` — Redis seeding, metrics scraping utilities → design.md §4.1
- [x] **T-PROD-014**: Create `packages/testing/src/load/throughput.k6.js` — sustained 100 URL/s for 60s, SLO assertions → REQ-PROD-009, REQ-PROD-012
- [x] **T-PROD-015**: Create `packages/testing/src/load/backpressure.k6.js` — burst 10,000 URLs, monitor queue depth and memory → REQ-PROD-010, REQ-PROD-011, REQ-PROD-013
- [x] **T-PROD-016**: Add `pnpm k6:load` and `pnpm k6:backpressure` scripts to root `package.json` → REQ-PROD-014 → REQ-PROD-014

## Phase 5: Scaling E2E Tests

- [x] **T-PROD-017**: Create `infra/k8s/overlays/e2e/hpa.yaml` — HPA for crawler-worker based on queue depth → design.md §5.1
- [x] **T-PROD-018**: Create `scaling-hpa.e2e.test.ts` — seed URLs, verify HPA scales up within 60s → REQ-PROD-015, REQ-PROD-017
- [x] **T-PROD-019**: Add scale-down test — drain queue, verify HPA scales down after stabilization → REQ-PROD-016, REQ-PROD-018
- [x] **T-PROD-020**: Add multi-replica dedup test _(scaling-hpa.e2e.test.ts — dedup verified via metrics)_ — 10 replicas, verify each URL processed exactly once → REQ-PROD-019

## Phase 6: DDoS & Rate Limit E2E Tests

- [x] **T-PROD-021**: Create `ddos-rate-limiting.e2e.test.ts` — seed 100 URLs for one domain, verify rate-limited to ~0.5 req/s → REQ-PROD-020
- [x] **T-PROD-022**: Add domain isolation test — burst on domain-A, verify domain-B unaffected → REQ-PROD-021, REQ-PROD-023
- [x] **T-PROD-023**: Add 429 Retry-After compliance test — dynamic-429 route, verify retry delay → REQ-PROD-022
- [x] **T-PROD-024**: Add burst absorption test — 1000 URLs single domain, verify circuit breaker stays closed → REQ-PROD-024

## Phase 7: Observability Verification

- [x] **T-PROD-025**: Add metrics assertions to all chaos/load tests — circuit breaker transitions, retry counts, timeout counts → REQ-PROD-025, REQ-PROD-026
- [x] **T-PROD-026**: Add before/after metrics snapshot to load tests — verify counter monotonicity → REQ-PROD-027

---

## Dependencies

| Task | Depends On | Blocks |
| --- | --- | --- |
| Phase 1 (helpers + simulator) | existing E2E infra | Phases 2–6 |
| Phase 2 (chaos pods) | Phase 1 (chaos-helpers) | Phase 7 |
| Phase 3 (chaos network) | Phase 1, network-partition-policy | Phase 7 |
| Phase 4 (k6 load) | k6 installed, Phase 1 (simulator) | Phase 7 |
| Phase 5 (scaling) | Phase 1, HPA yaml | Phase 7 |
| Phase 6 (DDoS) | Phase 1 (simulator routes) | Phase 7 |
| Phase 7 (observability) | Phases 2–6 | — |

## Critical Path

Phase 1 → Phase 2 + Phase 3 + Phase 4 + Phase 5 + Phase 6 (parallel) → Phase 7

## Totals

| Metric | Count |
| --- | --- |
| Tasks | 26 |
| E2E test files | 4 |
| k6 scripts | 2 |
| K8s manifests | 2 |
| Helper modules | 3 |
| Simulator routes | 3 |

---

> **Provenance**: Created 2026-03-29. 26 tasks across 7 phases.
