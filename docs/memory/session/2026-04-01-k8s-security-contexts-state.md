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
| 1 | Add security contexts to base workloads | `todo` | — | crawler, dragonfly, minio, postgresql |
| 2 | Add security contexts to monitoring | `todo` | — | prometheus, jaeger, loki, promtail, grafana |
| 3 | Add security contexts to e2e overlays | `todo` | — | web-simulator, mega-simulator |

## Current State

| Field | Value |
| --- | --- |
| Current task # | 1 |
| Last completed gate | G4 |
| Guard function status | `pending` |
| Commits on branch | 0 |
| Tests passing | 18/18 |
| Blockers | none |

## Special Cases

- **postgresql**: official image runs as uid 999 (postgres)
- **promtail**: DaemonSet needs host /var/log access — use reduced caps, not full root
- **dragonfly**: needs writable data dir — use emptyDir + fsGroup
- **minio**: needs writable data dir — use emptyDir + fsGroup
- **prometheus**: needs writable /prometheus — use emptyDir + fsGroup
