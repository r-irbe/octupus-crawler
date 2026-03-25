# Skill: Quality Gate Enforcement

**Agents**: Gateway, Implementation, Test | **ADR**: [ADR-014](../adr/ADR-014-automation-strategy.md)

Execute automated quality checks, enforce blocking gates, report violations with fix suggestions. Quality gates are the **verification half** of Atomic Action Pairs (ADR-018): deterministic verification of stochastic agent output.

## Guard Function Chain

`tsc --noEmit --strict` → `eslint --max-warnings 0` → `vitest` — all must pass. Max 3 total attempts, then escalate to user. Output must be structured (JSON) so agents can parse failures.

## Pre-Commit Gates (Tier 2)

Run in parallel before each commit:
- **tsc**: zero errors
- **eslint**: zero errors + warnings
- **commitlint**: conventional commit format
- **gitleaks**: no secrets
- **Forbidden pattern scan**: no banned patterns

If ANY fail → block commit, report all failures at once with fix suggestions.

## PR Gates (Tier 3)

On PR opened/updated, run:
- Full test suite (unit + integration), coverage threshold check
- ADR compliance scan, dependency audit
- Container build test, bundle size check, API contract validation

## ADR Compliance Scanning

Map changed files → applicable ADRs (e.g., `*queue*` → ADR-002, `*.test.*` → ADR-007, `*config*` → ADR-013). Extract decision rules, verify compliance, report per-ADR status.

## Violation Reporting

Per violation: gate, severity (blocking/warning), file:line, rule, ADR ref, current vs expected, specific fix suggestion. Aggregate as PR comment with pass/fail/warning summary + gate history.

## Fix Suggestions

TypeScript error → correct type signature | ESLint → auto-fix or manual | Coverage gap → uncovered functions + test scaffold | ADR violation → compliant pattern | Secrets → env vars + ESO | Dependency CVE → safe version | Forbidden pattern → replacement with ADR ref.

## Escalation

Same file/function fails 3x consecutively → flag as persistent issue → escalate to Gateway with root cause analysis and suggested action (reassign/restructure/seek guidance).

## Metrics

| Metric | Description |
| --- | --- |
| `gate.runs` | Total gate executions |
| `gate.pass_first_attempt` | First-try pass rate |
| `gate.violations_by_type` | Violation distribution |
| `gate.fix_time` | Time from violation to fix |
| `gate.escalations` | Consecutive failure escalations |

## Related

- [Quality Gates Pipeline](../automation/pipelines/quality-gates.md)
- [ADR-018](../adr/ADR-018-agentic-coding-conventions.md) — Atomic Action Pairs, Guard Functions
- [ADR-020](../adr/ADR-020-spec-driven-development.md) — 5-dimension quality gates
- [ADR Compliance Skill](adr-compliance.md), [Code Generation Skill](code-generation.md)
