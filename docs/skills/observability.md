# Skill: Observability

| Field | Value |
| --- | --- |
| **ID** | `observability` |
| **Status** | Active |
| **Created** | 2026-03-24 |
| **Used By** | SRE |

## Purpose

Configure and maintain metrics, traces, logs, dashboards, and alerts following ADR-006.

## Capabilities

- Define custom OTel metrics (counters, histograms, gauges)
- Configure OTel Collector pipelines
- Write PromQL alert rules
- Design Grafana dashboards
- Configure Loki log queries (LogQL)
- Trace analysis in Tempo

## Standard Metrics

| Metric | Type | Labels |
| --- | --- | --- |
| `crawler.pages.fetched` | Counter | domain, status_code |
| `crawler.pages.parsed` | Counter | content_type |
| `crawler.queue.depth` | Gauge | queue_name |
| `crawler.fetch.duration` | Histogram | domain |
| `crawler.errors` | Counter | type, domain |
| `crawler.robots.blocked` | Counter | domain |
| `crawler.dedup.hits` | Counter | — |

## Related

- [ADR-006: Observability Stack](../adr/ADR-006-observability-stack.md)
- [SRE Agent](../agents/sre.md)
- [ADR-018: Agentic Coding](../adr/ADR-018-agentic-coding-conventions.md) — Agentic metrics (guard pass rate, retry attempts, task completion rate)

---

> **Provenance**: Created 2026-03-24 as part of the AI agent framework. Updated 2026-03-25: added ADR-018 agentic metrics reference.
