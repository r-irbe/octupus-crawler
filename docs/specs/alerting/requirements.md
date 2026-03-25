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

### Acceptance Criteria — Alert Testing

```gherkin
Given each alert rule definition
When the test suite runs
Then at least one "should fire" and one "should not fire" test exists
```

## 3. Alert Gaps

| Gap ID | Description | Recommendation |
| --- | --- | --- |
| GAP-ALERT-001 | 4 alert rules lack unit tests | Add test coverage |
| GAP-ALERT-002 | Alert tests not in CI pipeline | Integrate into CI |
| GAP-ALERT-003 | No alert routing/notification config | Add notification system |

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

---

> **Provenance**: Created 2026-03-25 from REQUIREMENTS-AGNOSTIC.md §9. EARS conversion per ADR-020.
