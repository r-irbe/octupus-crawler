# Architectural Review Appendix — Verification Evidence

> **Parent**: [Deep Architectural Review](architecture-review-2026-03-31.md)
> **Date**: 2026-03-31

---

## A. AGENTS.md MUST Rules Audit

Full audit of all 14 MUST rules from AGENTS.md §Coding Rules:

| # | Rule | Status | Evidence |
|---|------|--------|----------|
| 1 | TypeScript strict | PASS | `tsconfig.json`: `strict: true`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `noImplicitOverride` |
| 2 | No `any` | PASS | ESLint `@typescript-eslint/no-explicit-any` enforced as error; 0 violations |
| 3 | Explicit types | PASS | ESLint `@typescript-eslint/explicit-function-return-type` enforced as error |
| 4 | File size ≤300 | PASS | Max file: 269 lines (`built-in-scenarios.ts`); all 192 source files under 300 |
| 5 | Direct imports | PASS | No `index.ts` barrel re-exports; all imports use direct file paths |
| 6 | neverthrow domain | PASS | `Result<T, E>` used in domain layer (confirmed in rate-limiter, crawl-pipeline) |
| 7 | Zod schema-first | PASS | Config schemas defined before handler code (`config-schema.ts` pattern) |
| 8 | Real infra tests | PASS | 0 `vi.mock`/`jest.mock` in `*.integration.test.ts` (grep verified) |
| 9 | OTel first import | FAIL | TODO comment in `main.ts` — deferred until SDK wiring ready |
| 10 | Graceful shutdown | PASS | SIGTERM/SIGINT handlers in `main.ts` + `@ipf/application-lifecycle` orchestration |
| 11 | No secrets in code | PASS | 0 hardcoded secrets; External Secrets Operator strategy; gitleaks CI scan |
| 12 | Guard function chain | PASS | `pnpm turbo typecheck/lint/test` — 18/18 all pass; pre-commit gate enforced |
| 13 | Feature branches | PASS | Git hooks block commits to `main`; all work on `work/<slug>` branches |
| 14 | State tracker | PASS | `docs/memory/session/` maintained; template enforced at G4 |

**Result**: 13/14 MUST rules PASS (93%). 1 FAIL: OTel first import (known deferred work, tracked as F-002).

---

## B. File Size Verification

Top 10 largest source files (excluding tests and `.d.ts`):

| Lines | File |
|-------|------|
| 269 | `packages/testing/src/simulators/built-in-scenarios.ts` |
| 240 | `packages/http-fetching/src/http-fetcher.ts` |
| 227 | `packages/virtual-memory/src/eviction-controller.ts` |
| 202 | `packages/ssrf-guard/src/ssrf-validator.ts` |
| 199 | `packages/application-lifecycle/src/main.ts` |
| 191 | `packages/virtual-memory/src/state-tracker.ts` |
| 191 | `packages/ssrf-guard/src/ip-range-checker.ts` |
| 189 | `packages/ssrf-guard/src/hardened-fetch.ts` |
| 185 | `packages/redis/src/stream-consumer.ts` |
| 178 | `packages/virtual-memory/src/chunk-tree.ts` |

All under 300-line hard limit. 3 files are in the 200-300 "should split" zone.

---

## C. Infrastructure Mock Verification

```text
$ grep -rn "vi\.mock\|jest\.mock" packages/ --include="*.integration.test.ts" | wc -l
0
```

Zero mock framework calls in any integration test file. All integration tests use Testcontainers (Redis/Dragonfly, PostgreSQL, MinIO).

---

## D. Architecture Test Citations

Architecture enforcement test: `packages/core/src/architecture.integration.test.ts`

Validates:
- ESLint `import-x/no-cycle`: zero circular dependencies across all packages
- ESLint `import-x/no-restricted-paths`: domain layer cannot import infrastructure
- Test file isolation: production code cannot import `*.test.ts` files

ESLint config: `packages/eslint-config/eslint.config.js` (line 46) — `import-x/no-restricted-paths` rule

---

## E. K8s Hardening Checklist (Pre-Production)

| Item | Current Status | Required |
|------|---------------|----------|
| SecurityContext (runAsNonRoot) | MISSING | Yes — F-001 |
| SecurityContext (readOnlyRootFilesystem) | MISSING | Yes — F-001 |
| SecurityContext (allowPrivilegeEscalation) | MISSING | Yes — F-001 |
| Resource requests/limits | CONFIGURED | CPU: 250m/1, Memory: 256Mi/512Mi |
| PodDisruptionBudget | MISSING | Yes — HA during node drains |
| Production NetworkPolicy | MISSING | Yes — default-deny ingress |
| HorizontalPodAutoscaler | MISSING | Yes — CPU target %, min/max replicas |
| terminationGracePeriodSeconds | DEFAULT (30s) | Explicit value recommended |
| Liveness/Readiness probes | CONFIGURED | `/health`, `/readyz` |
| Prometheus scrape annotations | CONFIGURED | Port 9090, path `/metrics` |
| Multi-replica | CONFIGURED | replicas: 2 |

---

## F. Backup/Recovery Checklist (Pre-Production)

| Component | RTO Target | RPO Target | Current Status |
|-----------|-----------|-----------|----------------|
| PostgreSQL | < 4h | < 1h | NOT DOCUMENTED — needs pg_dump schedule + restore runbook |
| MinIO/S3 | < 8h | < 4h | NOT DOCUMENTED — needs replication strategy |
| Redis/Dragonfly | N/A (cache) | N/A | Ephemeral by design — rebuild from PostgreSQL |
| Disaster recovery | < 24h | < 1h | NOT DOCUMENTED — needs cross-region failover plan |

---

## G. OTel Observability Strategy Checklist (Pre-Production)

| Component | Current Status | Required |
|-----------|---------------|----------|
| SDK initialization | DEFERRED (TODO in main.ts) | Wire `import './otel'` — F-002 |
| Trace sampling strategy | NOT DEFINED | Probabilistic sampling rate (e.g., 10% prod, 100% dev) |
| Metric cardinality limits | NOT DEFINED | Cap label values to prevent metric explosion |
| Log aggregation target | NOT DEFINED | Pino → stdout → log collector → storage |
| SLA-tied alerting | NOT DEFINED | Error rate > 1%, P99 > 500ms, availability < 99.5% |
| Dashboard provisioning | DEV ONLY | Grafana dashboards in docker-compose; need prod provisioning |

---

## H. RALPH Review Summary

**Verdict**: CHANGES REQUESTED (Round 1)
**After fixes**: Updated review document addresses all sustained Critical/Major findings.
**Sustained findings addressed**: F-001 (Critical K8s SecurityContext), F-010 (MUST rules audit), F-013 (deployment status), F-019 (MVP readiness), F-021 (K8s hardening), F-022 (backup/recovery), F-023 (OTel strategy), plus 7 Minor findings.
