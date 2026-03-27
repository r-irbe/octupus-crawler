# Runbook: Stalled Jobs

**Alert**: `StalledJobs` (warning)
**Condition**: Stalled job rate > 0.05/s for 2 minutes (~6 stalls per 2 min)

## Symptoms

- `stalled_jobs_total` counter increasing rapidly
- Jobs not completing within expected time

## Diagnosis

1. Check worker heartbeat config: stall interval should match BullMQ settings
2. Check worker CPU/memory: `kubectl top pods -l app=crawler-worker`
3. Check for slow fetches: P95 latency approaching timeout
4. Check network latency to state store: `redis-cli -h dragonfly --latency`

## Remediation

| Root Cause | Action |
| --- | --- |
| Worker overloaded | Reduce `CRAWL_MAX_CONCURRENT_FETCHES`, scale up replicas |
| Lock duration too short | Increase BullMQ lock duration |
| Network latency | Check node proximity to state store |
| Slow target responses | Increase fetch timeout or reduce concurrency |

## Escalation

If stall rate persists after scaling: investigate for memory leaks or event loop blocking.
