# Implementation State Tracker — Alerting

| Field | Value |
| --- | --- |
| Date | 2026-03-27 |
| Branch | `work/alerting` |
| Spec | `docs/specs/alerting/` |
| Scope | Infrastructure config: `infra/prometheus/`, `infra/alertmanager/` |
| User request | Implement alerting spec (17 requirements, 18 tasks, 3 phases) |

## Current State

| Task | Status | Commit | Notes |
| --- | --- | --- | --- |
| G1: Plan | ✅ | — | Tier 1, infra config only, observability metrics ready |
| G2: Branch | ✅ | — | `work/alerting` from main@842b2c1 |
| G3: Specs | ✅ | — | 17 reqs (REQ-ALERT-001–017), 18 tasks, 3 phases |
| G4: State tracker | ✅ | — | This file |
| Implementation | ✅ | 709e4c4 | 12 rules, 2 test files, Alertmanager config, CI script |
| G5: Guard functions | ✅ | — | Attempt 1/3: typecheck+lint+test PASS (583 tests), promtool PASS |
| G6: Commit | ✅ | 709e4c4 | 6 files, 771 insertions |
| G7: State update | ✅ | — | This update |
| G8: RALPH review | ✅ | 65978b6 | APPROVED after fixes (F-001, F-007 resolved; F-004, F-005 → G11) |
| G9: Worklog | ✅ | ad0cdbc | docs/worklogs/2026-03-27-alerting.md |
| G10: Report | ✅ | — | Presented to user |
| G11: Spec update | ✅ | ba76108 | tasks.md 18/18, design.md PromQL + Mermaid fixes |

## Key Metric Names (from observability package)

- `fetches_total` (counter, labels: status, error_kind)
- `fetch_duration_seconds` (histogram)
- `urls_discovered_total` (counter)
- `frontier_size` (gauge)
- `active_jobs` (gauge)
- `worker_utilization_ratio` (gauge)
- `stalled_jobs_total` (counter)
- `coordinator_restarts_total` (counter)
- Prefix: configurable, default empty

## Decisions

| # | Decision | Rationale |
| --- | --- | --- |
| D1 | Used `sum()` in HighErrorRate PromQL | Prevents label leakage from `rate()` retaining status label |
| D2 | Used `on()` in ZeroFetchRate/ZeroDiscovery | Allows `and` to match across series with different label sets |
| D3 | Split tests into 2 files | 300-line hard limit; fetch.test.yml + ops.test.yml |
| D4 | 15s input interval for CoordinatorRestart test | `increase()` needs >=2 samples in 1m window |

## Problems

| # | Problem | Resolution |
| --- | --- | --- |
| P1 | HighErrorRate label leakage | Wrapped rate() in sum() to drop labels |
| P2 | `and` label matching failure | Added `on()` to ignore label differences |
| P3 | CoordinatorRestart not firing | Needed higher-frequency samples (15s) for increase() |
| P4 | promtool requires exact annotation matching | Added full exp_annotations in all fire tests |
