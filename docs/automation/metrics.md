# Automation Metrics & SLOs

**ADRs**: [ADR-014](../adr/ADR-014-automation-strategy.md), [ADR-006](../adr/ADR-006-observability-stack.md)

Every pipeline, agent, and process is measured. Metrics feed dashboards, SLOs trigger alerts, trends feed Self-Improvement.

## System SLOs

| SLO | Target | Alert |
| --- | --- | --- |
| Tasks completed successfully | ≥ 95% | < 90% |
| End-to-end cycle time | < 30 min | > 45 min |
| Quality gate first-pass | > 95% | < 85% |
| Completion within 3 attempts (ADR-018) | > 90% | < 80% |
| Avg source file size (ADR-018) | ≤ 200 lines | > 300 lines |
| Security scan coverage | 100% | < 100% |

## Pipeline SLOs

| Pipeline | SLO | Target |
| --- | --- | --- |
| Dev Lifecycle | Completion rate | ≥ 95% |
| Quality Gates | Execution time | < 5 min |
| Quality Gates | False positive rate | < 2% |
| Doc Lifecycle | Index freshness | < 1 hour |
| Self-Improvement | Applied improvement success | > 80% |
| Agent Management | Health score (all) | ≥ 80% |
| Release | Total time (merge → verified) | < 15 min |
| Release | Deploy success rate | > 99% |
| Security | Critical CVE fix time | < 24 hours |
| Security | Secrets leaked | 0 |

## Agent SLOs

| Metric | Target | Applies To |
| --- | --- | --- |
| Task success rate | ≥ 95% | All |
| Error rate | < 5% | All |
| Avg belief score | ≥ 80% | All |
| Gate first-pass rate | > 95% | Implementation |
| Rework rate | < 20% | Implementation |
| Coverage achievement | ≥ 80% business | Test |
| Council consensus rate | > 75% | Review |

## Alert Routing

| Severity | Condition | Routing |
| --- | --- | --- |
| P0 Critical | Secrets leaked, critical CVE in prod | Security → Gateway → User (immediate) |
| P1 High | Deploy failure, agent critical health | Gateway → User (1 hour) |
| P2 Medium | SLO breach >10%, agent degraded | Gateway → Self-Improvement (24 hours) |
| P3 Low | SLO approaching threshold | Self-Improvement → Weekly report |

## Reporting

| Report | Frequency | Audience |
| --- | --- | --- |
| Real-time dashboard | Continuous | All agents |
| Daily summary | Daily | Gateway |
| Weekly improvement | Weekly | User + Gateway |
| Monthly review | Monthly | User |
| Quarterly audit | Quarterly | Architecture Council |

## Related

- [Self-Improvement Loop](pipelines/self-improvement-loop.md), [Agent Management](pipelines/agent-management.md)
- [ADR-006](../adr/ADR-006-observability-stack.md), [ADR-018](../adr/ADR-018-agentic-coding-conventions.md)
