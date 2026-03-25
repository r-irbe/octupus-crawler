# Skill: Debug Analysis

| Field | Value |
| --- | --- |
| **ID** | `debug-analysis` |
| **Status** | Active |
| **Created** | 2026-03-24 |
| **Used By** | Debug |

## Purpose

Systematic methodology for diagnosing issues: reproduce → isolate → identify root cause → fix → verify.

## Methodology

### Step 1: Reproduce

```text
- Define exact reproduction steps
- Identify: deterministic or intermittent?
- Capture: error message, stack trace, logs
- Note: environment, config, data state
```

### Step 2: Form Hypotheses

```text
- List possible causes ordered by likelihood
- For each hypothesis: what evidence would confirm/deny?
- Start with most likely, work down
```

### Step 3: Isolate

```text
- Binary search through the system:
  - Which service? (scheduler / worker / API)
  - Which module? (fetcher / parser / storage)
  - Which function?
  - Which line?
- Use logs, traces, and debugger output as evidence
```

### Step 4: Identify Root Cause

```text
- Explain WHY the bug occurs, not just WHERE
- Document the cause chain: trigger → intermediate state → failure
- Verify: does fixing the root cause fix ALL symptoms?
```

### Step 5: Fix & Verify

```text
- Propose minimal fix (smallest change that fixes the root cause)
- Write regression test BEFORE or WITH the fix
- Verify: original reproduction steps no longer fail
- Verify: no regressions in related tests
```

## Output Format

```markdown
### Debug Report

**Issue**: [description]
**Severity**: [critical/major/minor]
**Status**: [investigating/root-cause-found/fixed/verified]

**Reproduction**: [steps]
**Root Cause**: [explanation]
**Cause Chain**: [trigger → state → failure]
**Fix**: [what was changed and why]
**Regression Test**: [test added]
**Confidence**: [X%]
```

## Related

- [Debug Agent](../agents/debug.md)
- [Evidence Gathering Skill](evidence-gathering.md)
- [ADR-018: Agentic Coding](../adr/ADR-018-agentic-coding-conventions.md) — Guard Function chain as structured error input, max 3 attempts

---

> **Provenance**: Created 2026-03-24 as part of the AI agent framework. Updated 2026-03-25: added ADR-018 Guard Function context.
