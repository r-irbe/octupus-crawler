# Runbook: Coordinator Restart

**Alert**: `CoordinatorRestart` (warning)
**Condition**: Any coordinator restart detected (immediate)

## Symptoms

- `coordinator_restarts_total` counter incremented
- Possible state continuity risk if HA is not active

## Diagnosis

1. Check coordinator logs: `kubectl logs <coordinator-pod> --tail=50`
2. Check for OOM kills: `kubectl describe pod <name>` → look for `OOMKilled`
3. Check state store connectivity: `redis-cli -h dragonfly ping`
4. Check leader election state (if HA enabled)
5. Check recent deployments: `kubectl rollout history deployment/crawler-worker`

## Remediation

| Root Cause | Action |
| --- | --- |
| OOM killed | Increase memory limits |
| State store timeout | Check Dragonfly health, network latency |
| Application bug | Check logs for unhandled exceptions |
| Deployment rollout | Expected during rolling update — verify state recovery |

## Escalation

Repeated restarts (>3 in 10 minutes): investigate for persistent failure. Check if HA mode is active to prevent state loss.
