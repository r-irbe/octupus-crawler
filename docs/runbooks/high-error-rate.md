# Runbook: High Error Rate

**Alert**: `HighErrorRate` (warning)
**Condition**: Error rate > 50% with throughput > 0.1 req/s for 2 minutes

## Symptoms

- Dashboard shows error rate gauge in red (>50%)
- `fetches_total{status="error"}` rate exceeds `fetches_total{status="success"}`

## Diagnosis

1. Check error logs: `kubectl logs -l app=crawler-worker --tail=100 | grep ERROR`
2. Identify error patterns:
   - DNS resolution failures → check DNS service
   - Connection timeouts → check target availability
   - HTTP 4xx/5xx → check target health, rate limiting
3. Check recent config changes: `git log --oneline -5`
4. Verify state store connectivity: `redis-cli -h dragonfly ping`

## Remediation

| Root Cause | Action |
| --- | --- |
| Target site down | Pause crawl for affected domain, wait for recovery |
| DNS failures | Check CoreDNS pods, upstream DNS |
| Rate limited by target | Increase `CRAWL_POLITENESS_DELAY_MS` |
| Network partition | Check node networking, CNI plugin |

## Escalation

If error rate persists after 15 minutes: page SRE on-call.
