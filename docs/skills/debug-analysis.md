# Skill: Debug Analysis

**Agent**: Debug

Systematic diagnosis: reproduce → isolate → root cause → fix → verify.

## Methodology

1. **Reproduce**: Define exact steps. Deterministic or intermittent? Capture error, stack trace, logs, environment
2. **Hypothesize**: List causes by likelihood. For each: what evidence confirms/denies?
3. **Isolate**: Binary search — which service → module → function → line? Use logs, traces, debugger
4. **Root cause**: Explain WHY not just WHERE. Document cause chain: trigger → state → failure
5. **Fix & verify**: Minimal fix + regression test. Confirm original steps pass, no regressions

## Output

```markdown
**Issue**: [description] | **Severity**: critical/major/minor | **Status**: investigating/found/fixed
**Reproduction**: [steps]
**Root Cause**: [explanation]
**Cause Chain**: trigger → state → failure
**Fix**: [what changed and why]
**Regression Test**: [test added]
```

## Related

- [Debug Agent](../agents/debug.md), [Evidence Gathering](evidence-gathering.md)
- [ADR-018](../adr/ADR-018-agentic-coding-conventions.md) — Guard Functions as structured error input
