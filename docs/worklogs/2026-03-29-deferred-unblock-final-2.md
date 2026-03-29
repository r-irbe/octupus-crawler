# 2026-03-29: Deferred Unblock Final-2

## Summary

Resolved all remaining actionable deferred tasks across the project. Created API contracts spec (spec-writer), added K8s E2E CI, cleaned stale provenance.

## Branch

`work/deferred-unblock-final-2` from `main`

## Commits

| Hash | Type | Description |
| --- | --- | --- |
| f4e3844 | feat | Unblock deferred tasks — openapi spec, k8s-e2e CI, provenance cleanup |
| 5ef1c76 | fix | Address RALPH review findings R-002/003/004/005/007/008/010/011 |

## Changes

### New Files (8)

- `openapi.yaml` — OpenAPI 3.1 spec (7 endpoints, 7 schemas, examples, SSRF docs)
- `.spectral.yml` — Spectral linting config (extends spectral:oas)
- `.github/workflows/k8s-e2e.yml` — K8s E2E CI job (extracted from main workflow)
- `docs/specs/api-contracts/requirements.md` — 10 EARS requirements (REQ-API-001–010)
- `docs/specs/api-contracts/design.md` — Architecture for API contract validation
- `docs/specs/api-contracts/tasks.md` — 6 tasks, all complete
- `packages/testing/src/e2e/multi-replica-dedup.e2e.test.ts` — 2-replica dedup E2E test
- `scripts/verify-kustomize-e2e.sh` — Kustomize overlay verification script

### Modified Files (10)

- `package.json` — Added k6:load and k6:backpressure scripts
- `.github/workflows/agent-pr-validation.yml` — Extracted k8s-e2e job, fixed Spectral enforcement
- `docs/specs/agentic-setup/tasks.md` — T-AGENT-107 marked complete
- `docs/specs/k8s-e2e/tasks.md` — T-K8E-012/019/020/021 marked complete (34/34 = 100%)
- `docs/specs/production-testing/tasks.md` — T-PROD-016 marked complete
- `docs/specs/completion-detection/tasks.md` — Provenance cleaned
- `docs/specs/url-frontier/tasks.md` — Provenance cleaned
- `docs/specs/application-lifecycle/tasks.md` — Provenance cleaned
- `docs/specs/worker-management/tasks.md` — Provenance cleaned
- `docs/specs/index.md` — Added api-contracts entry (376 total requirements)

## Tasks Resolved

| Task | Spec | Status |
| --- | --- | --- |
| T-PROD-016 | production-testing | k6 pnpm scripts (Go binary) |
| T-K8E-012 | k8s-e2e | Kustomize verification script |
| T-K8E-019 | k8s-e2e | Multi-replica dedup E2E test |
| T-K8E-020 | k8s-e2e | E2E CI job (separate workflow) |
| T-K8E-021 | k8s-e2e | 5-min timeout verification |
| T-AGENT-107 | agentic-setup | API contracts spec + Spectral |

## RALPH Review

Round 1: CHANGES REQUESTED (3 Major: R-004 file location, R-005 missing examples, R-008 CI enforcement)
Delta re-review: **APPROVED** (6/6 unanimous) after fix commit 5ef1c76.

## Decisions

1. k6 invoked as Go binary via pnpm scripts (not npm package)
2. K8s E2E extracted to separate workflow (file size budget)
3. OpenAPI spec at repo root (CI find command scans all depths)

## Remaining Deferred (Not Actionable)

- T-AGENT-048: Requires live Claude Code session
- T-AGENT-049: Requires live Copilot agent session
- T-AGENT-109: Requires live environment with implemented features

## Learnings

- Pre-commit hook G4 check uses `grep -i "$SLUG"` — state tracker filename must contain full branch slug
- Spectral CI step was silently passing (caught by RALPH R-008) — always verify CI steps actually fail on errors
