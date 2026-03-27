# Runbook: High Latency / Critical Latency

**Alerts**: `P95LatencyHigh` (warning, P95 > 10s), `P99LatencyCritical` (critical, P99 > 15s)

## Symptoms

- Slow fetch responses visible in Grafana latency panel
- P95/P99 exceeding configured thresholds

## Diagnosis

1. Check target response times: specific domains may be slow
2. Check DNS resolution time: `dig +stats example.com`
3. Check network path: `traceroute` to target
4. Check if timeout is being hit: logs with `FETCH_TIMEOUT`
5. Check concurrent connections: high parallelism can exhaust client resources

## Remediation

| Root Cause | Action |
| --- | --- |
| Slow target servers | Reduce concurrency for affected domain |
| DNS resolution slow | Check DNS cache, consider local DNS cache |
| Network congestion | Reduce `CRAWL_MAX_CONCURRENT_FETCHES` |
| Timeout too low | Increase `CRAWL_FETCH_TIMEOUT_MS` if legitimate slow targets |

## Escalation

P99 critical: page SRE if sustained > 10 minutes (indicates systemic degradation).
