# Implementation State Tracker — Infrastructure

| Field | Value |
| --- | --- |
| Date | 2026-03-27 |
| Branch | `work/infrastructure` |
| Spec | `docs/specs/infrastructure/` |
| Scope | `infra/docker/`, `infra/k8s/`, `infra/monitoring/`, `docs/runbooks/` |
| User request | Implement infrastructure spec (21 requirements, 26 tasks, 7 phases) |

## Current State

| Task | Status | Commit | Notes |
| --- | --- | --- | --- |
| G1: Plan | ✅ | — | Tier 1, infra config only, all deps met |
| G2: Branch | ✅ | — | `work/infrastructure` from main@be6ce6e |
| G3: Specs | ✅ | — | 21 reqs, 26 tasks, 7 phases |
| G4: State tracker | ✅ | — | This file |
| Phase 1-6: Implementation | ✅ | 548fe46 | Dockerfile, compose, K8s, monitoring, runbooks |
| Runbook URL fix | ✅ | 16d66c9 | Aligned alert annotations with doc filenames |
| G5: Guard functions | ✅ | — | 583 tests pass, 0 lint/type errors |
| G6: Commit | ✅ | 16d66c9, 548fe46 | Fix + feature commits |
| G7: State update | ✅ | — | This update |
| G8: RALPH review | 🔄 | — | In progress |
| G9: Worklog | ⏳ | — | |
| G10: Report | ⏳ | — | |
| G11: Spec update | ⏳ | — | |

## Key Config Vars (from config-schema.ts)

- `REDIS_URL` (not STATE_STORE_URL as in old spec)
- `METRICS_PORT` default 9090
- `HEALTH_PORT` default 8081
- `SEED_URLS`, `CRAWL_MAX_DEPTH`, `CRAWL_MAX_CONCURRENT_FETCHES`
- `CRAWL_FETCH_TIMEOUT_MS`, `CRAWL_POLITENESS_DELAY_MS`

## Decisions

| # | Decision | Rationale |
| --- | --- | --- |
| 1 | Use `--ignore-scripts` in Dockerfile | `prepare` script runs `setup-hooks.sh` which isn't in Docker context |
| 2 | Use REDIS_URL not STATE_STORE_URL | Matches actual config-schema.ts; design.md diverges |
| 3 | Use `labels` not `commonLabels` in kustomization | `commonLabels` is deprecated in kustomize |

## Problems

| # | Problem | Resolution |
| --- | --- | --- |
| 1 | Dockerfile COPY'd nonexistent packages (redis, validation) | Replaced with actual packages (eslint-config, testing) |
| 2 | Alert runbook URLs didn't match doc filenames | Fixed 4 URLs + test expectations |
| 3 | Docker build failed on prepare script | Added --ignore-scripts to pnpm install |
