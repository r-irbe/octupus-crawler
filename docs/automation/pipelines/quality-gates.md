# Pipeline: Quality Gates

| Field | Value |
| --- | --- |
| **Status** | Active |
| **Created** | 2026-03-24 |
| **ADR** | [ADR-014](../../adr/ADR-014-automation-strategy.md) |
| **Triggers** | `file.changed`, `code.committed`, `pr.opened`, `dependency.changed` |

## Overview

Automated quality enforcement that runs on every code change. Gates are **blocking** — no code progresses without passing all checks. No manual overrides except with explicit Gateway + user approval.

## Gate Architecture

```text
              file.changed / code.committed
                         │
           ┌─────────────┼─────────────┐
           ▼             ▼             ▼
     ┌──────────┐ ┌──────────┐ ┌──────────┐
     │ Static   │ │ Runtime  │ │ Security │
     │ Analysis │ │ Checks   │ │ Scanning │
     └────┬─────┘ └────┬─────┘ └────┬─────┘
           │             │             │
           ▼             ▼             ▼
     ┌─────────────────────────────────────┐
     │         GATE AGGREGATOR            │
     │  All must pass → proceed           │
     │  Any fail → block + report         │
     └───────────────────┬─────────────────┘
                         │
              ┌──────────┼──────────┐
              ▼          ▼          ▼
         pr.opened   commit    merge-ready
```

## Gate Definitions

### Tier 1: On File Save (Instant Feedback, < 2s)

| Gate | Tool | Threshold | Blocking |
| --- | --- | --- | --- |
| TypeScript Typecheck | `tsc --noEmit` | Zero errors | Warning (non-blocking until commit) |
| ESLint | `eslint` | Zero errors | Warning (non-blocking until commit) |
| Import Validation | Custom rule | Monorepo boundaries respected | Warning |

### Tier 2: On Commit (Pre-commit, < 10s)

| Gate | Tool | Threshold | Blocking |
| --- | --- | --- | --- |
| TypeScript Strict | `tsc --noEmit --strict` | Zero errors | **Blocking** |
| ESLint Full | `eslint --max-warnings 0` | Zero errors + warnings | **Blocking** |
| Commit Message | commitlint | Conventional commits format | **Blocking** |
| Secrets Detection | gitleaks | Zero findings | **Blocking** |
| File Size | Custom | No source file > 300 lines (ADR-018), no binary | **Blocking** |
| Forbidden Patterns | Custom | No `console.log`, no `any` casts, no `// @ts-ignore` | **Blocking** |

### Tier 3: On PR (Full Pipeline, < 5 min)

| Gate | Tool | Threshold | Blocking |
| --- | --- | --- | --- |
| Unit Tests | Vitest | 100% pass rate | **Blocking** |
| Integration Tests | Vitest + Testcontainers | 100% pass rate | **Blocking** |
| Coverage (Business) | v8 coverage | ≥ 80% | **Blocking** |
| Coverage (Overall) | v8 coverage | ≥ 60% | **Blocking** |
| ADR Compliance | Custom checker | All referenced ADRs satisfied | **Blocking** |
| Spec Exists | Custom | Feature tasks have spec.md (ADR-018 §3) | **Blocking** |
| Dependency Audit | `pnpm audit` | No critical/high CVEs | **Blocking** |
| Container Build | Docker | Builds successfully | **Blocking** |
| Bundle Size | Custom | No regression > 10% | Warning |
| API Contract | Zod schema diff | No breaking changes | **Blocking** |
| Documentation | Index checker | All indexes current | Warning |

### Tier 4: On Merge (Release Gate, < 2 min)

| Gate | Tool | Threshold | Blocking |
| --- | --- | --- | --- |
| PR Council Verdict | Review Agent | APPROVED (>75% consensus) | **Blocking** |
| All PR Checks Green | GitHub | All status checks pass | **Blocking** |
| No Merge Conflicts | Git | Clean merge possible | **Blocking** |
| Branch Up-to-Date | Git | Rebased on target | **Blocking** |

## ADR Compliance Checker

The automated ADR compliance checker verifies code changes against ADR decisions:

```text
For each changed file:
  1. Determine which ADRs apply (by package, by pattern)
  2. Extract decision rules from ADR
  3. Verify code follows each rule
  4. Report violations with ADR reference and fix suggestion
```

**Rule mappings:**

| ADR | Rule | Check |
| --- | --- | --- |
| ADR-001 | Package boundaries | Imports don't cross package boundaries without shared/ |
| ADR-002 | BullMQ patterns | Queue code uses correct options, no raw Redis calls |
| ADR-006 | OTel instrumentation | Service boundary functions have spans |
| ADR-007 | No infra mocks | Test files don't mock Redis/PG/S3 |
| ADR-008 | Tiered fetching | Static pages use undici, JS pages use Playwright |
| ADR-009 | Graceful shutdown | Services register SIGTERM handlers |
| ADR-009 | Circuit breakers | External calls wrapped in circuit breakers |
| ADR-013 | Zod config | Config loaded via Zod schema, no process.env direct access |
| ADR-013 | No hardcoded secrets | No string literals matching secret patterns |
| ADR-018 | File size ≤300 lines | Source files under 300-line hard limit, 200-line target |
| ADR-018 | Guard Function chain | Pre-commit hooks run tsc → eslint → gitleaks |
| ADR-018 | Spec-driven development | Feature dirs have spec.md with Given/When/Then criteria |

## Forbidden Pattern Detection

Patterns that are automatically blocked:

```text
# TypeScript anti-patterns
any                      → Use specific type or unknown
// @ts-ignore            → Fix the type error
// @ts-expect-error      → Fix the type error (unless documented)
console.log              → Use structured logger (ADR-006)
console.error            → Use structured logger
console.warn             → Use structured logger
process.env.KEY          → Use Zod config (ADR-013)
setTimeout(              → Use scheduler abstraction
eval(                    → Never use eval
new Function(            → Never use dynamic code generation

# Security anti-patterns
password = "             → No hardcoded credentials
secret = "               → No hardcoded secrets
api_key = "              → No hardcoded API keys
-----BEGIN               → No embedded certificates/keys
```

## Gate Failure Protocol

When a gate fails:

```text
1. Identify which gate(s) failed
2. Generate actionable fix suggestions
3. Report to working agent with:
   - Gate name and threshold
   - Current value vs required value
   - Specific file(s) and line(s)
   - Suggested fix
   - Related ADR reference
4. Agent fixes and re-commits
5. Gates re-run automatically
6. If 3 total attempts fail on same gate (ADR-018 §7):
   - Escalate to Gateway
   - Gateway may reassign or seek user guidance
```

## Override Protocol

Gates can ONLY be overridden when:

1. Gateway Agent approves the override
2. User explicitly confirms the override
3. Reason is documented in commit message
4. Override is time-limited (single PR only)
5. Override is logged in metrics as `gate.override`

**Forbidden overrides** (never allowed):

- Secrets detection (always blocking)
- Dependency CVE critical (always blocking)
- Test failures (always blocking)

## Metrics Collected

| Metric | Description |
| --- | --- |
| `gate.pass_rate` | % of gate runs that pass first time |
| `gate.failure_distribution` | Which gates fail most often |
| `gate.fix_time` | Time from gate failure to fix |
| `gate.override_count` | Number of approved overrides |
| `gate.tier_duration` | Time each tier takes to execute |
| `gate.flaky_rate` | Gates that flip pass/fail without code change |

## Related

- [Development Lifecycle](development-lifecycle.md) — Pipeline context
- [Security Pipeline](security-pipeline.md) — Extended security checks
- [ADR-007: Testing](../../adr/ADR-007-testing-strategy.md) — Test requirements
- [ADR-012: CI/CD](../../adr/ADR-012-ci-cd-pipeline.md) — Pipeline infrastructure
- [ADR-018: Agentic Coding](../../adr/ADR-018-agentic-coding-conventions.md) — Guard Functions, file size limits, SDD, retry semantics
- [ADR-020: Spec-Driven Development](../../adr/ADR-020-spec-driven-development.md) — Evidence-driven 5-dimension quality gates, spec drift detection, EARS traceability

---

> **Provenance**: Created 2026-03-24 as part of ADR-014 automation strategy. Updated 2026-03-25: aligned with ADR-018 (file size → line-count, added SDD gate, 3-attempt retry, ADR-018 compliance rules). Added ADR-020 cross-reference for evidence-driven quality gates.
