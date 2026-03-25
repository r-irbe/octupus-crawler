# Skill: Quality Gate Enforcement

| Field | Value |
| --- | --- |
| **Status** | Active |
| **Created** | 2026-03-24 |
| **Primary Agents** | Gateway, Implementation, Test |
| **ADR** | [ADR-014](../adr/ADR-014-automation-strategy.md) |

## Purpose

Execute automated quality checks, enforce blocking gates, report violations with actionable fix suggestions, and track gate health metrics. Quality gates implement the **Guard Function** half of the Atomic Action Pair pattern (ADR-018) — deterministic verification of stochastic agent output.

## Atomic Action Pair Integration (ADR-018)

Every agent-generated code change is an Atomic Action Pair: generation + verification as an inseparable transaction. Quality gates ARE the verification half.

```text
Atomic Action Pair:
  1. Agent generates code (stochastic)
  2. Guard Functions verify (deterministic):
     tsc → eslint → vitest (unit) → vitest (integration) → ADR compliance
  3. Pass → commit | Fail → structured error → agent retries (max 3)
  4. 3 failures → escalate to user with full error context
```

Guard Function output MUST be structured (JSON) so agents can parse failures:

```json
{
  "gate": "vitest-unit",
  "status": "fail",
  "failures": [
    {
      "file": "src/features/crawl-url/crawl-url.service.ts",
      "line": 42,
      "expected": "Result<CrawlResult, CrawlError>",
      "actual": "undefined",
      "message": "Missing return in error branch"
    }
  ]
}
```

## Gate Execution Protocol

### Pre-Commit Gates (Tier 2)

```text
Before each commit, automatically run:
  1. tsc --noEmit --strict → must be zero errors
  2. eslint --max-warnings 0 → must be zero errors + warnings
  3. commitlint → conventional commit format
  4. gitleaks → no secrets detected
  5. Forbidden pattern scan → no banned patterns

Execution:
  - Run all checks in parallel
  - Collect all results before reporting
  - If ANY fail: block commit, report all failures at once
  - Generate fix suggestions for each failure
```

### PR Gates (Tier 3)

```text
On PR opened/updated, automatically run:
  1. Full test suite (unit + integration)
  2. Coverage measurement and threshold check
  3. ADR compliance scan
  4. Dependency audit
  5. Container build test
  6. Bundle size check
  7. API contract validation

Execution:
  - Run independent checks in parallel
  - Coverage requires test completion (sequential)
  - If ANY blocking gate fails: set PR status to failing
  - Generate detailed report as PR comment
```

## ADR Compliance Scanning

```text
For each changed file in a PR:
  1. Determine applicable ADRs:
     - packages/shared/** → ADR-001, ADR-013
     - packages/*/src/*queue* → ADR-002
     - k8s/** → ADR-003, ADR-004, ADR-005
     - *.test.* → ADR-007
     - *fetch*, *parse* → ADR-008
     - *circuit*, *retry*, *shutdown* → ADR-009
     - *pg*, *s3*, *minio* → ADR-010
     - *route*, *fastify* → ADR-011
     - .github/** → ADR-012
     - *config* → ADR-013

  2. For each applicable ADR, check decision rules:
     - Extract "Decision" section rules
     - Map rules to code patterns
     - Verify compliance

  3. Report format:
     ✓ ADR-002: BullMQ used correctly (queue options validated)
     ✗ ADR-007: Mock detected for Redis → Use Testcontainers
       File: packages/worker/src/__tests__/queue.test.ts:42
       Fix: Replace jest.mock('redis') with GenericContainer('redis:7')
     ✓ ADR-013: Config loaded via Zod schema
```

## Violation Reporting

### Report Format (per violation)

```text
QUALITY GATE VIOLATION
━━━━━━━━━━━━━━━━━━━━━
Gate:     [gate name]
Severity: [blocking/warning]
File:     [file:line]
Rule:     [what rule was violated]
ADR:      [reference if applicable]
Current:  [what the code does]
Expected: [what the code should do]
Fix:      [specific actionable fix suggestion]
```

### Aggregate Report (PR comment)

```text
## Quality Gate Report

### Summary
- ✅ 8 gates passed
- ❌ 2 gates failed (blocking)
- ⚠️ 1 gate warning

### Failures
1. **Coverage (Business Logic)**: 72% < 80% threshold
   - Missing coverage in: packages/worker/src/crawler.ts
   - Suggested: Add unit tests for handleResponse() and followLinks()

2. **ADR-007 Compliance**: Mock detected
   - File: packages/worker/src/__tests__/queue.test.ts:42
   - Fix: Replace mock with Testcontainers GenericContainer

### Warnings
1. **Bundle Size**: +8% (threshold: 10%)
   - Monitor: approaching threshold

### Gate History (this PR)
- Attempt 1: 2 failures → fixed → Attempt 2: 0 failures ✅
```

## Fix Suggestion Generation

```text
For each violation type, generate specific fix:

TypeScript error → Show correct type signature
ESLint violation → Show auto-fix or manual fix
Coverage gap → List uncovered functions + test scaffold
ADR violation → Show compliant pattern from ADR
Secrets detected → Show how to use env vars + ESO
Dependency CVE → Show safe version to upgrade to
Forbidden pattern → Show replacement pattern with ADR reference
```

## Consecutive Failure Escalation

```text
IF same file/function fails gate 3 times consecutively:
  1. Flag as "persistent quality issue"
  2. Escalate to Gateway Agent:
     - "File X has failed gate Y three times"
     - "Root cause may be: [analysis]"
     - "Suggest: [reassign/restructure/seek guidance]"
  3. Gateway decides: reassign, seek user guidance, or provide additional context
```

## Metrics Collected

| Metric | Description |
| --- | --- |
| `gate.runs` | Total gate executions |
| `gate.pass_first_attempt` | Gates passing on first try |
| `gate.violations_by_type` | Distribution of violation types |
| `gate.fix_time` | Time from violation to fix |
| `gate.overrides` | Approved gate overrides |
| `gate.escalations` | Consecutive failure escalations |

## Related

- [Quality Gates Pipeline](../automation/pipelines/quality-gates.md) — Full pipeline definition
- [ADR-018: Agentic Coding](../adr/ADR-018-agentic-coding-conventions.md) — Atomic Action Pairs, Guard Functions, retry semantics
- [ADR-020: Spec-Driven Development](../adr/ADR-020-spec-driven-development.md) — Evidence-driven 5-dimension quality gates, spec drift detection
- [ADR Compliance Skill](adr-compliance.md) — Manual ADR checking
- [Code Generation Skill](code-generation.md) — Quality patterns

---

> **Provenance**: Created 2026-03-24 as part of ADR-014. Skill for automated quality gate execution and violation reporting. Updated 2026-03-25: added ADR-018/020 cross-references.
