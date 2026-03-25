---
name: Review PR
description: Structured PR review with multi-perspective analysis and dissent requirement
---

> **Canonical**: [docs/skills/automated-review.md](../../docs/skills/automated-review.md), [docs/conventions/pr-review-council.md](../../docs/conventions/pr-review-council.md) | Copilot PR review prompt

## PR Review: #{{pr_number}}

### Review-by-Explanation Protocol

Before approving, verify you can explain the implementation rationale to a colleague. This prevents critical thinking atrophy.

### Security Audit

- [ ] All external input Zod-validated
- [ ] No hardcoded secrets or credentials
- [ ] Error messages don't leak internals
- [ ] SSRF protection on URL fetching (if applicable)
- [ ] Resource cleanup uses `using` keyword

### Performance Review

- [ ] No N+1 queries or unbounded loops
- [ ] Connection pooling for database access
- [ ] Circuit breakers for external calls
- [ ] Async patterns correct (no blocking I/O in hot paths)

### API Consistency

- [ ] Naming follows domain ubiquitous language
- [ ] Interface contracts match `design.md`
- [ ] Error types use discriminated unions (`_tag`)
- [ ] Zod schema defined before handler

### Architecture Conformance

- [ ] Layer boundaries respected (domain ≠ infra)
- [ ] No barrel imports
- [ ] File sizes ≤300 lines
- [ ] Feature co-located (VSA pattern)
- [ ] OTel first import in service entry points

### Dissent Requirement

Find at least one genuine concern before approving. Unanimous first-pass agreement triggers additional scrutiny.

| # | Severity | File | Line | Finding | Recommendation |
| --- | --- | --- | --- | --- | --- |
| 1 | | | | | |

### Verdict

- [ ] APPROVE — all checks pass, concerns addressed
- [ ] CHANGES REQUESTED — blocking issues found
- [ ] COMMENT — non-blocking observations
