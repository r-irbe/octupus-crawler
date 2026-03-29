# Test Coverage Hardening — Design

> Architecture for pre-commit gate enhancements, guard chain completeness, and E2E alerting.
> Implements: [requirements.md](requirements.md) | ADRs: [ADR-007](../../adr/ADR-007-testing-strategy.md), [ADR-018](../../adr/ADR-018-agentic-coding-conventions.md)

---

## 1. Pre-Commit Gate Enhancements

`scripts/verify-pre-commit-gates.sh` gains three new checks after existing G2/G4 checks:

```text
G2: Branch safety  ─┐
G4: State tracker  ─┤
NEW: File size     ─┤  verify-pre-commit-gates.sh
NEW: Test naming   ─┤
NEW: eslint-disable ┘
```

- **File size**: `git diff --cached --name-only -- '*.ts'` → `wc -l` each → block if >300
- **Test naming**: staged `*.test.ts` → must match `*.{unit,integration,e2e,property,contract}.test.ts`
- **eslint-disable**: `grep eslint-disable` → check preceding/same line has `//` justification

## 2. Guard Chain Enhancement

`scripts/verify-guard-chain.sh` adds integration and property test stages:

```text
typecheck ─→ lint ─→ unit test ─→ integration test ─→ property test
```

Integration tests use `pnpm turbo test:integration` (no cache, Testcontainers).
Property tests use `pnpm turbo test:property`.

## 3. Unit Test Files

| Source File | Test File | Key Assertions |
| --- | --- | --- |
| `core/src/errors/queue-error.ts` | `queue-error.unit.test.ts` | factory output, message format, cause propagation |
| `crawl-pipeline/src/normalized-url.ts` | `normalized-url.unit.test.ts` | brand construction, type narrowing |
| `application-lifecycle/src/exit-codes.ts` | `exit-codes.unit.test.ts` | all ShutdownReason variants → correct exit code |
| `url-frontier/src/queue-backend.ts` | (interface — covered by integration tests) | — |
| `virtual-memory/src/page-table.ts` | `page-table.unit.test.ts` | load/evict/fault/pin logging, formatLog |
| `virtual-memory/src/selective-loader.ts` | `selective-loader.unit.test.ts` | full load ≤200, partial >200, section extraction |
| `virtual-memory/src/state-tracker.ts` | `state-tracker.unit.test.ts` | path generation, parse, update serialization |

## 4. E2E Alerting Validation

New test file: `packages/testing/src/e2e/alerting-rules.e2e.test.ts`

Strategy: evaluate PromQL alert expressions against real Prometheus metrics using the Prometheus query API.

```text
Crawler (K8s) ─→ /metrics ─→ Prometheus ─→ /api/v1/query ─→ E2E test asserts
```

Tests:
1. **HighErrorRate**: Seed error-producing URLs → poll metrics → query Prometheus for alert state
2. **ZeroFetchRate**: Verify frontier_size > 0 with zero successful fetches → check alert
3. **Alert rule syntax**: Use `promtool check rules` programmatically

---

> **Provenance**: Created 2026-03-29. Spec-writer Phase 3 per ADR-020.
