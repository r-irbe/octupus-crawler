# Worklog — 2025-07-21 Composition Root & Docker Verification

## Summary

Created the composition root `main.ts` for the IPF Crawler, enabling Docker image build, compose-up, and Prometheus metrics scraping. This unblocked 4 deferred tasks that were blocked on missing Docker infrastructure.

## Changes

### New Files

- **packages/application-lifecycle/src/main.ts** — Composition root wiring all packages: config → observability → infrastructure → worker → seeding → signal handlers. Implements REQ-LIFE-001 through REQ-LIFE-032.
- **packages/observability/src/metrics-scraping.integration.test.ts** — Integration test verifying /metrics, /health, /readyz endpoints (T-TEST-016).
- **docs/memory/session/2025-07-21-composition-root-docker-verification-state.md** — State tracker (G4).

### Modified Files

- **infra/docker/Dockerfile** — Changed CMD from compiled JS to tsx/esm TypeScript execution.
- **infra/docker/docker-compose.dev.yml** — Fixed Dragonfly persistence flags, image tags (Prometheus v2.50.0, Grafana 10.4.0), memory constraints.
- **package.json** — Added tsx as root dependency for Docker runtime.
- **packages/application-lifecycle/package.json** — Added @ipf/observability, @ipf/job-queue, @ipf/url-frontier, @ipf/crawl-pipeline as dependencies.
- **pnpm-lock.yaml** — Updated lockfile.

## Decisions

| Decision | Rationale |
| --- | --- |
| tsx runtime instead of tsc compilation | Package exports map to .ts files; cross-package resolution requires tsx ESM loader |
| Root-level tsx dependency | pnpm strict linking requires tsx at root for Docker CMD to find it |
| Dragonfly `--dir/--dbfilename` instead of `--appendonly` | Dragonfly v1.37 doesn't support Redis `--appendonly` flag |
| Dragonfly `--proactor_threads 2 --maxmemory 512mb` | Dev environment memory constraint to prevent OOM |
| No-op pipeline executor with TODO | Full pipeline wiring tracked as T-LIFE-031; composition root functional without it |

## Verified Tasks

| Task | Status | Evidence |
| --- | --- | --- |
| T-INFRA-021 (Docker build) | ✅ Verified | `docker build` succeeds, image sha256:ec5a3b... |
| T-INFRA-022 (Docker compose-up) | ✅ Verified | All 4 services start, health endpoints respond |
| T-INFRA-025 (Prometheus persistence) | ✅ Verified | Data survives `docker compose restart prometheus` |
| T-TEST-016 (Metrics scraping test) | ✅ Verified | 4 tests pass in metrics-scraping.integration.test.ts |

## Deferred (Unchanged)

| Task | Reason |
| --- | --- |
| T-AGENT-048 | Requires live Claude Code session |
| T-AGENT-049 | Requires live Copilot TDD mode |
| T-AGENT-050 | Requires actual GitHub Actions PR run |
| T-AGENT-051 | Satisfied by this workflow but needs formal sign-off |
| T-AGENT-107 | No OpenAPI/TypeSpec specs exist to validate |
| T-AGENT-109 | Requires full live environment + agent orchestration |

## RALPH Review Findings

| # | Severity | Finding | Resolution |
| --- | --- | --- | --- |
| P1 | Minor | Variable shadowing in metricsPhase Promise | Renamed to resolvePhase/rejectPhase/resolveClose/rejectClose |
| AR2 | Minor | Comment mismatch in compose (appendonly vs dump) | Updated comment to match actual persistence method |

## Learnings

- Dragonfly requires explicit memory/thread limits or crashes on insufficient resources
- pnpm strict linking requires runtime deps (tsx) at root level for Docker CMD resolution
- Docker `--no-cache` needed when lockfile changes to avoid stale layer reuse
