# Runbook: Worker Utilization (High / Low)

**Alerts**: `HighUtilization` (warning, avg > 80% for 3m), `LowUtilization` (info, avg < 20% for 10m)

## High Utilization

### Symptoms
- Workers near capacity, queue depth growing
- Latency may increase due to contention

### Remediation
1. Scale up: `kubectl scale deployment crawler-worker --replicas=<N+1>`
2. If HPA configured: check HPA status: `kubectl get hpa`
3. Reduce per-worker concurrency: lower `CRAWL_MAX_CONCURRENT_FETCHES`

## Low Utilization

### Symptoms
- Workers mostly idle, resources wasted
- May indicate crawl is near completion

### Remediation
1. Check if crawl is completing naturally (frontier shrinking)
2. Scale down: `kubectl scale deployment crawler-worker --replicas=<N-1>`
3. If consistently low: review resource allocation

## Escalation

High utilization sustained > 30m with growing queue: scale immediately.
