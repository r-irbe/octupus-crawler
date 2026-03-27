# Runbook: Zero Fetch Rate

**Alert**: `ZeroFetchRate` (critical)
**Condition**: Frontier non-empty but zero successful fetches for 5 minutes

## Symptoms

- Frontier size > 0 but no successful fetches
- Workers may be idle or stuck

## Diagnosis

1. Check worker status: `kubectl get pods -l app=crawler-worker`
2. Check state store: `redis-cli -h dragonfly info clients`
3. Check queue state: `redis-cli -h dragonfly llen bull:crawl-jobs:wait`
4. Check worker logs: `kubectl logs -l app=crawler-worker --tail=50`
5. Check for deadlock: workers waiting on exhausted connection pool

## Remediation

| Root Cause | Action |
| --- | --- |
| Workers crashed | Check pod events: `kubectl describe pod <name>` |
| State store unreachable | Restart dragonfly, check PVC |
| Queue corruption | Clear stuck jobs: `redis-cli -h dragonfly del bull:crawl-jobs:stalled` |
| All targets unreachable | Check network egress, DNS |

## Escalation

Immediate — this is a critical alert indicating system deadlock.
