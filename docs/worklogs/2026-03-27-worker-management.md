# Worklog: Worker Management Implementation

**Date**: 2026-03-27
**Branch**: `work/worker-management`
**Commits**: `5a17da0`, `129be39`, `28dd6a2`

## What Changed

Implemented `packages/worker-management/` — worker utilization tracking, job consumer adapter, stalled job config, counter consistency guard, and worker metrics reporter. Also added Copilot agent hooks (`.github/hooks/gates.json`) and ran G8 PR Review Council on all unreviewed packages.

### Files Created

| File | Purpose |
| --- | --- |
| `packages/worker-management/package.json` | Package config with @ipf/core dependency |
| `packages/worker-management/tsconfig.json` | TypeScript config extending base |
| `packages/worker-management/vitest.config.ts` | Vitest config |
| `packages/worker-management/eslint.config.js` | ESLint config |
| `packages/worker-management/src/utilization-tracker.ts` | In-process counter with floor guard (T-WORK-001/002) |
| `packages/worker-management/src/stalled-job-config.ts` | Stalled job detection config with 2x invariant (T-WORK-006) |
| `packages/worker-management/src/job-consumer-adapter.ts` | Lifecycle orchestration, start guard, event wiring (T-WORK-003/004/005) |
| `packages/worker-management/src/worker-metrics.ts` | Periodic metrics push + counter consistency guard (T-WORK-012/013) |
| `packages/worker-management/src/utilization-tracker.unit.test.ts` | 20 tests — ratio, floor guard, inconsistency, snapshot |
| `packages/worker-management/src/stalled-job-config.unit.test.ts` | 6 tests — defaults, custom, 2x invariant |
| `packages/worker-management/src/job-consumer-adapter.unit.test.ts` | 10 tests — start guard, event registration, utilization, close |
| `packages/worker-management/src/worker-metrics.unit.test.ts` | 3 tests — metrics push, counter reset, consistency |

### Files Modified

| File | Change |
| --- | --- |
| `packages/core/src/contracts/job-event-source.ts` | Added `onActive` method to track job start events |
| `packages/core/src/contracts/contracts.unit.test.ts` | Updated mock to include `onActive` |
| `pnpm-lock.yaml` | Updated for new package |
| `.github/hooks/gates.json` | Created — Copilot hook config (PreToolUse/PostToolUse/Stop) |
| `scripts/hooks/copilot-pre-tool-use.sh` | Created — blocks commit without G2/G4/G5, blocks push to main |
| `scripts/hooks/copilot-post-tool-use.sh` | Created — typecheck + file size warning after edits |
| `scripts/hooks/copilot-stop.sh` | Created — session-end verification |
| `.vscode/settings.json` | Created — disables Claude hooks in VS Code |
| `AGENTS.md` | Updated enforcement note to three-layer defense |
| `.github/copilot-instructions.md` | Added Hooks section, three-layer enforcement |
| `docs/specs/agentic-setup/requirements.md` | Added §17 (REQ-AGENT-107 to 112) |
| `docs/specs/agentic-setup/design.md` | Added Copilot Hooks Architecture + three-layer diagram |
| `docs/specs/agentic-setup/tasks.md` | Added Phase 26 (T-AGENT-116 to 121) |

## Decisions Made

| # | Decision | Rationale |
| --- | --- | --- |
| 1 | Added `onActive` to `JobEventSource` contract | REQ-DIST-011 requires tracking job starts; contract was incomplete |
| 2 | Worker recovery via BullMQ stalled detection only | No custom recovery code needed — BullMQ handles natively (ADR-002) |
| 3 | Separate `WorkerMetricsReporter` from `JobConsumerAdapter` | Keeps adapter focused on lifecycle; metrics is cross-cutting (ADR-015) |
| 4 | Copilot hooks filter by `tool_name` internally (not via matchers) | VS Code ignores Claude matcher syntax — would fire on every tool call |
| 5 | `.vscode/settings.json` disables Claude hook loading in VS Code | Prevents double-firing and broken matchers |

## G8 Review Council

Ran Ralph-Loop on 5 unreviewed packages: ssrf-guard, url-frontier, worker-management, Copilot hooks, G11 gate.

- **14 findings** across 5 packages
- **1 sustained Major** (F-HOOK-002): `if !` grouping bug in guard function chain — **fixed** in `28dd6a2`
- **F-SSRF-001** not sustained (4/6, needed >75%): `dnsFailPolicy:'open'` default — SRE dissented (DNS transience)
- **F-WORK-001** not sustained (2/6): `onActive` contract change — additive, plan was approved

## Tests

- 484 total tests (up from 441 — 43 new)
- 4 test files in worker-management
- All typecheck, lint, test pass on attempt 1/3

## Remaining

- T-WORK-009: Integration test (configurable concurrency) — needs real BullMQ
- T-WORK-010: Distributed test (stalled job recovery) — needs real BullMQ
- T-WORK-014: Integration test (crash recovery) — needs real BullMQ
- T-WORK-016: Integration test (metrics exposure) — needs Prometheus endpoint

---

> **Provenance**: Created 2026-03-27. Updated 2026-03-27: added Copilot hooks, G8 review council results, spec updates.
