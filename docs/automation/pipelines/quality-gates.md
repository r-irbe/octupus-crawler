# Pipeline: Quality Gates

**ADR**: [ADR-014](../../adr/ADR-014-automation-strategy.md) | **Triggers**: `file.changed`, `code.committed`, `pr.opened`, `dependency.changed`

Automated blocking quality enforcement. No code progresses without passing all checks. No overrides except Gateway + user approval.

## Gate Tiers

### Tier 1: On File Save (<2s, non-blocking warnings)

tsc --noEmit, eslint, import validation.

### Tier 2: On Commit (<10s, blocking)

| Gate | Threshold |
| --- | --- |
| TypeScript strict | Zero errors |
| ESLint full | Zero errors + warnings |
| Commit message | Conventional commits |
| Secrets detection (gitleaks) | Zero findings |
| File size | No source file >300 lines (ADR-018) |
| Forbidden patterns | No `console.log`, `any` casts, `@ts-ignore` |

### Tier 3: On PR (<5 min, blocking)

| Gate | Threshold |
| --- | --- |
| Unit + integration tests | 100% pass |
| Coverage (business) | ≥ 80% |
| Coverage (overall) | ≥ 60% |
| ADR compliance | All referenced ADRs |
| Spec exists | Feature tasks have requirements.md (ADR-020) |
| Dependency audit | No critical/high CVEs |
| Container build | Builds successfully |
| API contract | No breaking schema changes |
| Bundle size | No regression >10% (warning) |

### Tier 4: On Merge (<2 min, blocking)

PR Council verdict APPROVED (>75%), all PR checks green, no merge conflicts, branch up-to-date.

## ADR Compliance Rules

| ADR | Check |
| --- | --- |
| ADR-001 | Imports don't cross package boundaries |
| ADR-002 | Queue code uses BullMQ patterns |
| ADR-006 | Service boundaries have OTel spans |
| ADR-007 | Tests don't mock Redis/PG/S3 |
| ADR-009 | Services have SIGTERM handlers + circuit breakers |
| ADR-013 | Config via Zod schema, no `process.env` direct, no hardcoded secrets |
| ADR-018 | Files ≤300 lines, Guard Function chain, feature dirs have spec |

## Forbidden Patterns

`any`, `@ts-ignore`, `@ts-expect-error` (undocumented), `console.log/error/warn`, `process.env.KEY`, `setTimeout(`, `eval(`, `new Function(`, hardcoded passwords/secrets/API keys, embedded certificates.

## Failure Protocol

Gate fails → report to agent with gate, threshold, current value, file:line, fix suggestion, ADR ref → agent fixes → re-run → 3 total failures (ADR-018) → escalate to Gateway → user.

## Override Protocol

Requires: Gateway approval + user confirmation + documented reason + single-PR scope. **Never overridable**: secrets detection, critical CVE, test failures.

## Metrics

| Metric | Description |
| --- | --- |
| `gate.pass_rate` | First-time pass rate |
| `gate.failure_distribution` | Most-failing gates |
| `gate.fix_time` | Time to fix failures |
| `gate.override_count` | Approved overrides |

## Related

- [Development Lifecycle](development-lifecycle.md), [Security Pipeline](security-pipeline.md)
- [ADR-007](../../adr/ADR-007-testing-strategy.md), [ADR-012](../../adr/ADR-012-ci-cd-pipeline.md), [ADR-018](../../adr/ADR-018-agentic-coding-conventions.md), [ADR-020](../../adr/ADR-020-spec-driven-development.md)
