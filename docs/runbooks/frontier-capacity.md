# Runbook: Frontier Capacity / Frontier Growth

**Alerts**: `FrontierCapacity` (warning, > 5000 for 5m), `FrontierGrowth` (warning, > 100 URLs/min for 3m)

## Symptoms

- Frontier size growing beyond capacity threshold
- Discovery rate outpacing fetch rate

## Diagnosis

1. Check crawl scope: are seeds generating too many URLs?
2. Check `CRAWL_MAX_DEPTH`: reduce if too deep
3. Check `ALLOWED_DOMAINS`: restrict to target domains
4. Check discovery rate: `rate(urls_discovered_total[5m])`
5. Check fetch rate: `rate(fetches_total{status="success"}[5m])`

## Remediation

| Root Cause | Action |
| --- | --- |
| Unbounded crawl scope | Set `ALLOWED_DOMAINS`, reduce `CRAWL_MAX_DEPTH` |
| High page link density | Add URL filtering rules |
| Fetch rate too low | Scale up workers or increase concurrency |
| Duplicate URLs not deduplicated | Check frontier dedup logic |

## Escalation

If frontier exceeds 10,000: risk of memory pressure. Consider pausing seed injection.
