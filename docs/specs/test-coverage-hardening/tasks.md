# Test Coverage Hardening — Tasks

> Implementation tasks for REQ-TCH-001 through REQ-TCH-016.
> Traces to: [requirements.md](requirements.md) | [design.md](design.md)

---

## Phase 1: Pre-Commit Gate Enhancements

- [x] **T-TCH-001** — Add file size check (>300 lines) to `verify-pre-commit-gates.sh` → REQ-TCH-001
- [x] **T-TCH-002** — Add test naming convention check to `verify-pre-commit-gates.sh` → REQ-TCH-002
- [x] **T-TCH-003** — Add eslint-disable justification check to `verify-pre-commit-gates.sh` → REQ-TCH-003

## Phase 2: Guard Chain Completeness

- [x] **T-TCH-004** — Add `test:integration` and `test:property` stages to `verify-guard-chain.sh` → REQ-TCH-004
- [x] **T-TCH-005** — Add integration test failure reporting with container info → REQ-TCH-005

## Phase 3: Missing Unit Tests

- [x] **T-TCH-006** — Write `packages/core/src/errors/queue-error.unit.test.ts` → REQ-TCH-007
- [x] **T-TCH-007** — Write `packages/crawl-pipeline/src/normalized-url.unit.test.ts` → REQ-TCH-008
- [x] **T-TCH-008** — Write `packages/application-lifecycle/src/exit-codes.unit.test.ts` → REQ-TCH-009
- [x] **T-TCH-009** — Write `packages/virtual-memory/src/page-table.unit.test.ts` → REQ-TCH-010
- [x] **T-TCH-010** — Write `packages/virtual-memory/src/selective-loader.unit.test.ts` → REQ-TCH-011
- [x] **T-TCH-011** — Write `packages/virtual-memory/src/state-tracker.unit.test.ts` → REQ-TCH-012

## Phase 4: E2E Alerting Validation

- [x] **T-TCH-012** — Write `packages/testing/src/e2e/alerting-rules.e2e.test.ts` → REQ-TCH-013, REQ-TCH-016
- [x] **T-TCH-013** — Add HighErrorRate alert evaluation test → REQ-TCH-014
- [x] **T-TCH-014** — Add ZeroFetchRate alert evaluation test → REQ-TCH-015

---

## Provenance

| Field | Value |
| --- | --- |
| Created | 2026-03-29 |
| Total tasks | 14 |
| Completed | 14 / 14 |
| ADR refs | ADR-007, ADR-018, ADR-020 |
