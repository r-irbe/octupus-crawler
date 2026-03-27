# Alerting — Tasks

> Implementation tasks traceable to [requirements.md](requirements.md). Dependency-ordered.
> Design: [design.md](design.md)

---

## Phase 1: Alert Rules

- [x] **T-ALERT-001**: Define HighErrorRate alert (PromQL + for: 2m) → REQ-ALERT-001
- [x] **T-ALERT-002**: Define ZeroFetchRate alert (PromQL + for: 5m) → REQ-ALERT-002
- [x] **T-ALERT-003**: Define StalledJobs alert (PromQL + for: 2m) → REQ-ALERT-003
- [x] **T-ALERT-004**: Define P95LatencyHigh alert (PromQL + for: 3m) → REQ-ALERT-004
- [x] **T-ALERT-005**: Define P99LatencyCritical alert (PromQL + for: 5m) → REQ-ALERT-005
- [x] **T-ALERT-006**: Define FrontierCapacity alert (PromQL + for: 5m) → REQ-ALERT-006
- [x] **T-ALERT-007**: Define FrontierGrowth alert (PromQL + for: 3m) → REQ-ALERT-007
- [x] **T-ALERT-008**: Define HighUtilization alert (PromQL + for: 3m) → REQ-ALERT-008
- [x] **T-ALERT-009**: Define LowUtilization alert (PromQL + for: 10m) → REQ-ALERT-009
- [x] **T-ALERT-010**: Define WorkerDown alert (PromQL + for: 1m) → REQ-ALERT-010
- [x] **T-ALERT-011**: Define CoordinatorRestart alert (PromQL + for: 0m) → REQ-ALERT-011
- [x] **T-ALERT-012**: Define ZeroDiscovery alert (PromQL + for: 10m) → REQ-ALERT-012

## Phase 2: Alert Tests

- [x] **T-ALERT-013**: Write fire + no-fire tests for all 12 alert rules → REQ-ALERT-013
- [x] **T-ALERT-014**: Integrate alert tests into CI pipeline → GAP-ALERT-002

## Phase 3: Alert Testing & Routing

- [x] **T-ALERT-015**: Integrate `promtool test rules` into CI pipeline as merge-blocking gate → REQ-ALERT-014
- [x] **T-ALERT-016**: Write edge-case test scenarios (threshold ±1%, duration boundary, metric absence) → REQ-ALERT-015
- [x] **T-ALERT-017**: Configure Alertmanager routing (critical → PagerDuty/webhook, warning → Slack, info → log) → REQ-ALERT-016
- [x] **T-ALERT-018**: Add `summary`, `description`, and `runbook_url` annotations to all alert rules → REQ-ALERT-017

---

## Dependencies

| Task | Depends On | Blocks |
| --- | --- | --- |
| Phase 1 (rules) | observability (metric definitions) | Phase 2, Phase 3, infrastructure |
| Phase 2 (tests) | Phase 1 | CI pipeline |
| Phase 3 (testing/routing) | Phase 1, Phase 2 | infrastructure |

---

> **Provenance**: Created 2026-03-25. Implementation Agent task decomposition per ADR-020. Updated 2026-03-25: added Phase 3 (REQ-ALERT-014–017 CI testing, edge-cases, routing, annotations).
