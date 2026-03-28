# Worklog: SSRF Guard — Fetch Hardening & Test Completion

| Field | Value |
| --- | --- |
| Date | 2026-03-28 |
| Branch | `work/ssrf-guard` |
| Commits | e651261 (initial), 8181c9e (RALPH fixes) |
| Guard Status | All PASS (12/12 typecheck, lint, test) |

## Summary

Implemented remaining ssrf-guard tasks: Phase 3 (fetch hardening), Phase 6 (tests). Phase 4 (container security) was already covered by the infrastructure Dockerfile.

## What Changed

### New Files (5)
- `packages/ssrf-guard/src/fetch-hardening.ts` (135 lines) — Primitives: redirect tracker, body size limiter, cumulative timeout, content-length pre-flight
- `packages/ssrf-guard/src/hardened-fetch.ts` (189 lines) — Orchestrator: SSRF-validated redirect following, per-hop validation
- `packages/ssrf-guard/src/fetch-hardening-primitives.unit.test.ts` (226 lines) — 18 tests for primitives
- `packages/ssrf-guard/src/hardened-fetch.unit.test.ts` (145 lines) — 6 orchestrator scenario tests
- `packages/ssrf-guard/src/ssrf-validator.property.test.ts` (97 lines) — 3 multi-IP DNS property tests
- `packages/ssrf-guard/src/dns-timeout.unit.test.ts` (88 lines) — 3 DNS timeout tests

### Modified Files (1)
- `packages/ssrf-guard/package.json` — Added exports for fetch-hardening and hardened-fetch

### Total Test Count
- 81 tests across 7 test files (was 51 tests in 3 files before)

## Requirements Covered

| Requirement | Implementation | Tests |
| --- | --- | --- |
| REQ-SEC-004: Per-redirect SSRF | hardened-fetch.ts validateRedirectTarget | 4 tests |
| REQ-SEC-008: Redirect limit | fetch-hardening.ts createRedirectTracker | 5 tests |
| REQ-SEC-009: Body size limit | fetch-hardening.ts createBodySizeLimiter | 4 tests |
| REQ-SEC-010: Cumulative timeout | fetch-hardening.ts createCumulativeTimeout | 3 tests |
| REQ-SEC-016: Multi-IP DNS | ssrf-validator.property.test.ts | 3 property tests |
| REQ-SEC-017: DNS timeout | dns-timeout.unit.test.ts | 3 tests |

## RALPH Review Findings (G8)

| Finding | Severity | Status |
| --- | --- | --- |
| F-001: String.replace hostname (IPv6) | Major | Fixed — URL.hostname setter |
| F-002: Timeout gap on DNS validation | Moderate | Fixed — isAborted check after validation |
| F-003: Response body leak on redirect | Moderate | Fixed — response.body?.cancel() |
| F-009: No scheme-change redirect test | Minor | Fixed — added ftp redirect test |
| F-004: Dead code 'unknown' reason | Minor | Dismissed (3/6) |
| F-005: File size 292 lines | Minor | Resolved — split into 2 files |

## Decisions

1. **Phase 4 (container) skipped** — T-SEC-013/014 already implemented in infra/docker/Dockerfile
2. **File split** — fetch-hardening.ts split into primitives (135) + orchestrator (189)
3. **isAborted helper** — Workaround for TypeScript narrowing of AbortSignal.aborted

## Deferred Items

- F-007: IPv6 property test generators (Minor, dismissed 4/6)
- F-011: Body limiter not composed into orchestrator (Minor, dismissed 4/6)
- F-013: Fetch-level metrics port (Minor, 1/6)
