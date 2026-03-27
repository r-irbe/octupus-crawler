# SRE Runbooks

> Operational runbooks linked from Prometheus alert annotations (REQ-ALERT-017, REQ-INFRA-021).

## Alert Runbooks

| Runbook | Alert(s) | Severity |
| --- | --- | --- |
| [High Error Rate](high-error-rate.md) | HighErrorRate | warning |
| [Zero Fetch Rate](zero-fetch-rate.md) | ZeroFetchRate | critical |
| [Stalled Jobs](stalled-jobs.md) | StalledJobs | warning |
| [High Latency](high-latency.md) | P95LatencyHigh, P99LatencyCritical | warning, critical |
| [Frontier Capacity](frontier-capacity.md) | FrontierCapacity, FrontierGrowth | warning |
| [Worker Utilization](worker-utilization.md) | HighUtilization, LowUtilization | warning, info |
| [Worker Down](worker-down.md) | WorkerDown | critical |
| [Coordinator Restart](coordinator-restart.md) | CoordinatorRestart | warning |
| [Zero Discovery](zero-discovery.md) | ZeroDiscovery | warning |

## Reference

| Document | Description |
| --- | --- |
| [Environment Variables](environment-variables.md) | Complete environment variable reference |
