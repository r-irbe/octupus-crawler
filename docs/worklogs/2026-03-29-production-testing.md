# Worklog — 2026-03-29 — Production Testing

## Summary

Added comprehensive production testing infrastructure covering chaos testing, load testing, scaling/autoscaling verification, and DDoS/rate-limit resilience. Created specs (27 EARS requirements, 26 tasks) and implemented all phases.

## What Changed

### Spec Documents (commit be5b133)
- `docs/specs/production-testing/requirements.md` — 27 EARS requirements (REQ-PROD-001–027) across 6 categories
- `docs/specs/production-testing/design.md` — Architecture, test patterns, file layout
- `docs/specs/production-testing/tasks.md` — 26 tasks across 7 phases (25 completed, 1 deferred)
- `docs/specs/index.md` — Added production-testing entry

### Implementation (commit db3133e)
- `packages/testing/src/e2e/helpers/chaos-helpers.ts` — 7 kubectl wrappers: killPod, getPodNames, getReadyReplicas, scaleDeployment, applyNetworkPolicy, deleteNetworkPolicy, waitForReadyReplicas
- `packages/testing/src/simulators/built-in-scenarios.ts` — 3 new routes: burstLinksRoute, connectionHoldRoute, dynamic429Route
- `packages/testing/src/simulators/production-routes.unit.test.ts` — 10 new unit tests
- `packages/testing/src/e2e/chaos-pod-kill.e2e.test.ts` — 4 tests: pod kill recovery, Redis failure, health 503, simultaneous kill
- `packages/testing/src/e2e/chaos-network-partition.e2e.test.ts` — 3 tests: circuit breaker open, partition recovery, timeout
- `packages/testing/src/e2e/scaling-hpa.e2e.test.ts` — 4 tests: scale-up, pod readiness, scale-down, graceful drain
- `packages/testing/src/e2e/ddos-rate-limiting.e2e.test.ts` — 5 tests: burst throttle, domain isolation, 429 compliance, burst absorption, connection hold
- `packages/testing/src/load/throughput.k6.js` — k6 sustained load script (100 URL/s for 60s)
- `packages/testing/src/load/backpressure.k6.js` — k6 burst load script (10k URLs)
- `packages/testing/src/load/k6-helpers.ts` — Build seed payloads, extract metrics
- `packages/testing/src/load/slo-thresholds.ts` — SLO constants (p95, error rate, memory)
- `infra/k8s/overlays/e2e/hpa.yaml` — HPA for crawler-worker autoscaling
- `infra/k8s/overlays/e2e/network-partition-policy.yaml` — NetworkPolicy for chaos tests

## Decisions

| # | Decision | Rationale |
| --- | --- | --- |
| 1 | k6 scripts as `.k6.js` not `.k6.ts` | k6 runtime is not Node.js — cannot use TS imports from k6/* modules |
| 2 | Separate unit test file for new routes | Original test file at 248 lines; adding would exceed 300 hard limit |
| 3 | T-PROD-016 deferred | `pnpm k6:load` script requires k6 binary installation (separate infra task) |
| 4 | No new ADR needed | ADR-007 already mandates k6 + Litmus/ChaosMesh; gap was specs + code |

## Deferred Items

- T-PROD-016: pnpm k6:load script (needs k6 binary installed)
- HPA E2E tests use manual `scaleDeployment` until KEDA Redis scaler is wired up

## Learnings

- k6 uses its own JavaScript runtime — standard Node.js modules unavailable, must use .js extension
- NetworkPolicy needs DNS egress allowance (ports 53 UDP/TCP) or pod DNS resolution fails
- dynamic429Route requires mutable state with explicit reset function for test isolation
