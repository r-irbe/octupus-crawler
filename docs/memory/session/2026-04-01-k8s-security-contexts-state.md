# Implementation State Tracker — K8s Security Contexts

## Session Identity

| Field | Value |
| --- | --- |
| Date | 2026-04-01 |
| Branch | `work/k8s-security-contexts` |
| User request | Fix K8s security context gap (arch review finding) |
| Scope | infra/k8s/ — all Deployments, StatefulSets, DaemonSets |

## Task Queue

| # | Task | Status | Commit | Notes |
| --- | --- | --- | --- | --- |
| 1 | Add security contexts to base workloads | `done` | `69597b6` | crawler, dragonfly, minio, postgresql |
| 2 | Add security contexts to monitoring | `done` | `69597b6` | prometheus, jaeger, loki, promtail, grafana |
| 3 | Add security contexts to e2e overlays | `done` | `69597b6` | web-simulator, mega-simulator |

## Current State

| Field | Value |
| --- | --- |
| Current task # | done |
| Last completed gate | G8 |
| Guard function status | `pass` (18/18) |
| Commits on branch | 1 (`69597b6`) |
| Tests passing | 18/18 |
| Blockers | none |

## RALPH Review

- **Result**: 6/6 APPROVE — PASSED
- **S-001 (informational)**: dragonfly, minio, postgresql lack `readOnlyRootFilesystem: true` — justified for stateful services needing writable paths beyond volume mounts
- **S-002 (fixed)**: State tracker updated to reflect actual state
- **S-003 (withdrawn)**: Promtail pod-level `runAsNonRoot` omission is clearer than explicit `false`

## Special Cases

- **postgresql**: uid 999 (postgres), no `readOnlyRootFilesystem` (writes PID to /var/run/postgresql/)
- **promtail**: DaemonSet runs as root (uid 0) with DAC_READ_SEARCH only — minimal privilege for host log access
- **dragonfly**: uid 999, no `readOnlyRootFilesystem` (writes temp files beyond data volume)
- **minio**: uid 1000, no `readOnlyRootFilesystem` (Console UI temp paths)
- **prometheus**: uid 65534 (nobody), `readOnlyRootFilesystem: true` — /prometheus is volume-mounted
