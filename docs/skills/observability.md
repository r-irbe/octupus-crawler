# Skill: Observability

**Agent**: SRE

Configure and maintain metrics, traces, logs, dashboards, alerts per ADR-006.

## Capabilities

OTel metrics (counters, histograms, gauges), Collector pipelines, PromQL alerts, Grafana dashboards, Loki/LogQL, Tempo trace analysis.

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

- [ADR-006](../adr/ADR-006-observability-stack.md), [SRE Agent](../agents/sre.md)
- [ADR-018](../adr/ADR-018-agentic-coding-conventions.md) — agentic metrics (guard pass rate, retry attempts)
