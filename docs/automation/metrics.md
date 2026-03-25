# Automation Metrics & SLOs

| Field | Value |
| --- | --- |
| **Status** | Active |
| **Created** | 2026-03-24 |
| **ADR** | [ADR-014](../adr/ADR-014-automation-strategy.md), [ADR-006](../adr/ADR-006-observability-stack.md) |

## Overview

Every automated pipeline, agent, and process is measured. Metrics feed dashboards, SLOs trigger alerts, and trends feed the Self-Improvement Loop. No automation runs unobserved.

## Metric Hierarchy

```text
Level 1: SYSTEM HEALTH (aggregated)
  ├── Overall automation health score
  ├── System throughput (tasks/day)
  └── End-to-end cycle time

Level 2: PIPELINE HEALTH (per pipeline)
  ├── Pipeline success rate
  ├── Pipeline duration
  └── Pipeline failure distribution

Level 3: AGENT HEALTH (per agent)
  ├── Agent health score (5 dimensions)
  ├── Agent task success rate
  └── Agent skill utilization

Level 4: PROCESS HEALTH (per process)
  ├── Quality gate pass rates
  ├── Memory promotion rates
  └── Documentation freshness
```

## SLO Definitions

### System-Level SLOs

| SLO | Target | Alert Threshold | Measurement Window |
| --- | --- | --- | --- |
| Tasks completed successfully | ≥ 95% | < 90% | Rolling 7 days |
| End-to-end cycle time | < 30 min | > 45 min | Per task |
| Quality gate first-pass rate | > 95% | < 85% | Rolling 7 days |
| Task completion within 3 attempts | > 90% (ADR-018) | < 80% | Rolling 7 days |
| Average source file size | ≤ 200 lines (ADR-018) | > 300 lines | Daily |
| Zero manual steps for routine tasks | 100% | < 100% | Audit |
| Security scan coverage | 100% | < 100% | Daily |

### Pipeline SLOs

| Pipeline | SLO | Target | Alert |
| --- | --- | --- | --- |
| Development Lifecycle | Completion rate | ≥ 95% | < 90% |
| Development Lifecycle | Context pre-fetch time | < 30s | > 60s |
| Quality Gates | Execution time | < 5 min | > 8 min |
| Quality Gates | False positive rate | < 2% | > 5% |
| Documentation Lifecycle | Index freshness | < 1 hour stale | > 4 hours |
| Documentation Lifecycle | Dead link count | 0 | > 0 |
| Self-Improvement Loop | Pattern detection rate | ≥ 1/week | 0 for 2 weeks |
| Self-Improvement Loop | Applied improvement success | > 80% | < 60% |
| Agent Management | Agent availability | ≥ 99% | < 95% |
| Agent Management | Health score (all agents) | ≥ 80% | < 60% |
| Release Pipeline | Total time (merge to verified) | < 15 min | > 25 min |
| Release Pipeline | Deploy success rate | > 99% | < 95% |
| Release Pipeline | Rollback time | < 10 min | > 15 min |
| Security Pipeline | Critical CVE time to fix | < 24 hours | > 48 hours |
| Security Pipeline | Secrets leaked to repo | 0 | > 0 |

### Agent SLOs

| Agent | SLO | Target | Alert |
| --- | --- | --- | --- |
| All agents | Task success rate | ≥ 95% | < 90% |
| All agents | Error rate | < 5% | > 10% |
| All agents | Average belief score | ≥ 80% | < 70% |
| Implementation | Quality gate first-pass | > 95% | < 85% |
| Implementation | Rework rate | < 20% | > 30% |
| Test | Coverage achievement | ≥ 80% business | < 75% |
| Test | Flaky test rate | < 1% | > 3% |
| Review | Council consensus rate | > 75% | < 60% |
| Review | Review cycle time | < 15 min | > 30 min |
| Documentation | Index freshness | < 1 hour | > 4 hours |
| Security | Scan coverage | 100% | < 100% |

## Dashboard Structure

### Executive Dashboard

```text
┌─────────────────────────────────────────────────────────┐
│ IPF AUTOMATION HEALTH                    Updated: now    │
│                                                         │
│ System Health: ██████████████████████░░░ 88%  HEALTHY   │
│                                                         │
│ Tasks Today: 12 completed, 2 in-progress, 0 failed     │
│ Avg Cycle Time: 22 min (target: < 30)                  │
│ Gate Pass Rate: 96% first attempt (target: > 95%)      │
│ Security: 0 critical, 0 high (target: 0)               │
│ Docs: 0 dead links, 0 stale indexes                    │
│                                                         │
│ ┌─── Pipelines ───────────────────────────────────┐     │
│ │ Dev Lifecycle   ███████████████████ 96% success  │     │
│ │ Quality Gates   ██████████████████░ 89% 1st-pass │     │
│ │ Doc Lifecycle   ████████████████████ 100% fresh  │     │
│ │ Self-Improve    █████████████████░░ 85% success  │     │
│ │ Agent Mgmt      ███████████████████ 95% healthy  │     │
│ │ Release         ████████████████████ 100% success │     │
│ │ Security        ████████████████████ 100% clean   │     │
│ └─────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────┘
```

### Agent Dashboard

```text
┌─────────────────────────────────────────────────────────┐
│ AGENT HEALTH (7-day rolling)                            │
│                                                         │
│ Agent          │ Health │ Tasks │ Errs │ Belief │ Trend │
│ ───────────────┼────────┼───────┼──────┼────────┼───────│
│ Gateway        │  95%   │  48   │   1  │  92%   │  ↑    │
│ Architect      │  88%   │  12   │   0  │  85%   │  →    │
│ Implementation │  82%   │  28   │   3  │  78%   │  ↓    │
│ Test           │  91%   │  24   │   1  │  88%   │  ↑    │
│ Review         │  87%   │  10   │   0  │  90%   │  →    │
│ Research       │  90%   │   8   │   0  │  82%   │  →    │
│ Debug          │  85%   │   6   │   1  │  75%   │  →    │
│ DevOps         │  93%   │  14   │   0  │  88%   │  ↑    │
│ SRE            │  89%   │   4   │   0  │  85%   │  →    │
│ Security       │  94%   │   6   │   0  │  90%   │  →    │
│ Documentation  │  96%   │  36   │   0  │  95%   │  ↑    │
└─────────────────────────────────────────────────────────┘
```

### Self-Improvement Dashboard

```text
┌─────────────────────────────────────────────────────────┐
│ SELF-IMPROVEMENT METRICS (this week)                     │
│                                                         │
│ Patterns Detected:    7                                 │
│ Learnings Promoted:   4 (session → short-term)          │
│ Learnings Promoted:   1 (short-term → long-term)        │
│ ADR Amendments:       1 proposed, 0 applied             │
│ Skill Updates:        2 applied                         │
│ Pipeline Optimizations: 1 applied                       │
│ Improvements Verified: 3/4 positive (75%)               │
│ Reverts:              0                                 │
│                                                         │
│ Memory Tier Health:                                     │
│   Session:     12 entries (5 pending review)            │
│   Short-term:  28 entries (3 ready for promotion)       │
│   Long-term:   15 entries (all current)                 │
└─────────────────────────────────────────────────────────┘
```

## Alert Routing

| Severity | SLO Violation | Routing |
| --- | --- | --- |
| **P0 Critical** | Security: secrets leaked, critical CVE in prod | Security Agent → Gateway → User (immediate) |
| **P1 High** | Deploy failure, agent critical health, data loss risk | Gateway → User (within 1 hour) |
| **P2 Medium** | SLO breach > 10%, agent degraded, gate pass rate drop | Gateway → Self-Improvement (within 24 hours) |
| **P3 Low** | SLO approaching threshold, minor trends | Self-Improvement → Weekly report |

## Reporting Cadence

| Report | Frequency | Content | Audience |
| --- | --- | --- | --- |
| Real-time Dashboard | Continuous | All metrics live | All agents |
| Daily Summary | Daily 09:00 | Key metrics, alerts, issues | Gateway |
| Weekly Improvement | Weekly Monday | Patterns, learnings, trends | User + Gateway |
| Monthly Review | Monthly 1st | SLO performance, capacity, roadmap | User |
| Quarterly Audit | Quarterly | Full process audit, ADR review | Architecture Council |

## Related

- [ADR-014: Automation Strategy](../adr/ADR-014-automation-strategy.md) — Architecture
- [ADR-006: Observability](../adr/ADR-006-observability-stack.md) — Metrics infrastructure
- [Self-Improvement Loop](pipelines/self-improvement-loop.md) — Metrics consumer
- [Agent Management](pipelines/agent-management.md) — Agent metrics
- [ADR-018: Agentic Coding](../adr/ADR-018-agentic-coding-conventions.md) — Guard Function pass rate, retry limits, file size metrics

---

> **Provenance**: Created 2026-03-24 as part of ADR-014 automation strategy. Updated 2026-03-25: added ADR-018 agentic metrics (3-attempt completion, file size SLO).
