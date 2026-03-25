# Alerting — Requirements

> EARS-format requirements for alert rules and alert testing.
> Source: [REQUIREMENTS-AGNOSTIC.md](../../research/REQUIREMENTS-AGNOSTIC.md) §9

---

## 1. Alert Rules

**REQ-ALERT-001** (State-driven)
While the error rate exceeds 50% and throughput > 0.1 req/s for 2 minutes, the system shall fire a `warning` alert.

**REQ-ALERT-002** (State-driven)
While the frontier is non-empty but the successful fetch rate is zero for 5 minutes, the system shall fire a `critical` alert.

**REQ-ALERT-003** (State-driven)
While the stalled job rate exceeds 0.05/s for 2 minutes, the system shall fire a `warning` alert.

**REQ-ALERT-004** (State-driven)
While P95 fetch latency exceeds 10s for 3 minutes, the system shall fire a `warning` alert.

**REQ-ALERT-005** (State-driven)
While P99 fetch latency exceeds 15s for 5 minutes, the system shall fire a `critical` alert.

**REQ-ALERT-006** (State-driven)
While the frontier size exceeds 5,000 for 5 minutes, the system shall fire a `warning` alert.

**REQ-ALERT-007** (State-driven)
While the frontier growth rate exceeds 100 URLs/min for 3 minutes, the system shall fire a `warning` alert.

**REQ-ALERT-008** (State-driven)
While average worker utilization exceeds 80% for 3 minutes, the system shall fire a `warning` alert.

**REQ-ALERT-009** (State-driven)
While average worker utilization is below 20% (but > 0%) for 10 minutes, the system shall fire an `info` alert.

**REQ-ALERT-010** (Event-driven)
When a worker instance is unreachable for 1 minute, the system shall fire a `critical` alert.

**REQ-ALERT-011** (Event-driven)
When a coordinator restart is detected, the system shall fire a `warning` alert immediately.

**REQ-ALERT-012** (State-driven)
While there are zero discoveries despite successful fetches and a large frontier (>100) for 10 minutes, the system shall fire a `warning` alert.

### Acceptance Criteria — Alert Rules

```gherkin
Given error rate at 60% and throughput at 0.5 req/s sustained for 2 min
When the alert evaluator runs
Then a "warning" alert fires for high error rate

Given frontier size of 200 and zero successful fetches for 5 min
When the alert evaluator runs
Then a "critical" alert fires for zero fetch rate
```

## 2. Alert Testing

**REQ-ALERT-013** (Ubiquitous)
All alert rules shall have automated unit tests with both fire and no-fire test cases.

**REQ-ALERT-014** (Ubiquitous)
Alert tests shall be run as part of the CI pipeline using `promtool test rules`. Alert test failures shall block merge.

**REQ-ALERT-015** (Ubiquitous)
Each alert rule test shall include edge-case scenarios: threshold boundary values (±1%), duration boundary (exact duration vs. duration-1s), and metric absence (no data).

## 3. Alert Routing & Notification

**REQ-ALERT-016** (Ubiquitous)
Alert routing shall be configured via Alertmanager with the following severity mapping: `critical` → immediate notification (PagerDuty/webhook), `warning` → Slack channel, `info` → log only.

**REQ-ALERT-017** (Ubiquitous)
All alerts shall include annotations: `summary` (one-line description), `description` (detailed context with metric values), and `runbook_url` (link to remediation procedure).

### Acceptance Criteria — Testing & Routing

```gherkin
Given alert rule tests exist for all 12 rules
When the CI pipeline runs
Then `promtool test rules` executes and failures block merge

Given the HighErrorRate alert with threshold 50%
When metrics show 49% error rate for 2m
Then the alert does not fire
And when metrics show 51% error rate for 2m
Then the alert fires

Given a critical alert (e.g., ZeroFetchRate) fires
When Alertmanager processes it
Then a PagerDuty/webhook notification is sent

Given a warning alert (e.g., HighUtilization) fires
When Alertmanager processes it
Then a Slack channel notification is sent

Given any alert rule definition
When its annotations are inspected
Then it contains summary, description, and runbook_url fields
```

## 4. Threshold Calibration Evidence

| Alert | Threshold | Calibration Source | Rationale |
| --- | --- | --- | --- |
| HighErrorRate | 50% | Industry standard (SRE Workbook ch.5) | 50% error rate is a clear P1 signal; lower thresholds generate noise in crawling (expected 404s) |
| ZeroFetchRate | 0 success/5m | Deadlock detection | 5 minutes of zero throughput with queued work = stuck system |
| StalledJobs | 0.05/s for 2m | BullMQ default stall check (30s) | 0.05/s = ~6 stalls/2m; exceeds 1 stall/min baseline |
| P95Latency | 10s | `FETCH_TIMEOUT_MS` default (10s) | P95 ≥ timeout = most requests timing out |
| P99Latency | 15s | 1.5× timeout | P99 at 1.5× timeout indicates systemic degradation |
| FrontierCapacity | 5,000 | Memory headroom (retention window 10K) | 50% of retention window = growing backlog |
| FrontierGrowth | 100 URLs/min | Empirical: 10× normal discovery rate | Based on expected 10 URLs/page × 1 page/s |
| HighUtilization | 80% | Standard autoscaling threshold | 80% = headroom for burst capacity |
| LowUtilization | 20% for 10m | Scale-down signal | Sustained underutilization = overprovisioned |
| WorkerDown | 0 (unreachable) for 1m | K8s default pod eviction | 1 minute grace for transient network issues |
| CoordinatorRestart | Any restart | State continuity risk | Even 1 restart risks state loss if HA not active |
| ZeroDiscovery | 0 discoveries/10m | Crawl exhaustion signal | Successful fetches but no new URLs = stuck or complete |

## 5. Known Gaps (Resolved)

| Gap ID | Description | Status | Resolution |
| --- | --- | --- | --- |
| GAP-ALERT-001 | 4 alert rules lack unit tests | **RESOLVED** | REQ-ALERT-013 + 015 covers all rules |
| GAP-ALERT-002 | Alert tests not in CI pipeline | **RESOLVED** | REQ-ALERT-014 adds CI gate |
| GAP-ALERT-003 | No alert routing/notification config | **RESOLVED** | REQ-ALERT-016–017 adds Alertmanager routing |

---

## Traceability Matrix

| Requirement | Source | Priority | Test Type |
| --- | --- | --- | --- |
| REQ-ALERT-001 | §9.0 | MUST | Unit (fire + no-fire) |
| REQ-ALERT-002 | §9.0 | MUST | Unit (fire + no-fire) |
| REQ-ALERT-003 | §9.0 | MUST | Unit (fire + no-fire) |
| REQ-ALERT-004 | §9.0 | MUST | Unit (fire + no-fire) |
| REQ-ALERT-005 | §9.0 | MUST | Unit (fire + no-fire) |
| REQ-ALERT-006 | §9.0 | MUST | Unit (fire + no-fire) |
| REQ-ALERT-007 | §9.0 | MUST | Unit (fire + no-fire) |
| REQ-ALERT-008 | §9.0 | MUST | Unit (fire + no-fire) |
| REQ-ALERT-009 | §9.0 | MUST | Unit (fire + no-fire) |
| REQ-ALERT-010 | §9.0 | MUST | Unit (fire + no-fire) |
| REQ-ALERT-011 | §9.0 | MUST | Unit (fire + no-fire) |
| REQ-ALERT-012 | §9.0 | MUST | Unit (fire + no-fire) |
| REQ-ALERT-013 | §9.1 | MUST | Meta-test |
| REQ-ALERT-014 | §9.1 (CI) | MUST | CI pipeline |
| REQ-ALERT-015 | §9.1 (edge) | MUST | Unit |
| REQ-ALERT-016 | §9.2 (routing) | MUST | Config review |
| REQ-ALERT-017 | §9.2 (annotations) | MUST | Config review |

---

> **Provenance**: Created 2026-03-25 from REQUIREMENTS-AGNOSTIC.md §9. EARS conversion per ADR-020. Updated 2026-03-25: added REQ-ALERT-014–017, threshold calibration evidence (§4), resolved GAP-ALERT-001–003 per PR Review Council findings.
