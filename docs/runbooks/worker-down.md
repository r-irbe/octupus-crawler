# Runbook: Worker Down

**Alert**: `WorkerDown` (critical)
**Condition**: Worker instance unreachable for 1 minute

## Symptoms

- `up{job="crawler"} == 0` for specific instance
- Pod may be in CrashLoopBackOff or Terminated state

## Diagnosis

1. Check pod status: `kubectl get pods -l app=crawler-worker -o wide`
2. Check pod events: `kubectl describe pod <name>`
3. Check node health: `kubectl get nodes`
4. Check resource limits: OOM killed? `kubectl top pod <name>`
5. Check logs before crash: `kubectl logs <name> --previous`

## Remediation

| Root Cause | Action |
| --- | --- |
| OOM killed | Increase memory limits in deployment |
| Node failure | Pod will reschedule automatically |
| Application crash | Check logs, fix bug, redeploy |
| Network partition | Check CNI, node connectivity |

## Escalation

Multiple workers down simultaneously: likely infrastructure issue. Page SRE immediately.
