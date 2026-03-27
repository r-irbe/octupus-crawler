---
name: review-code
description: Multi-perspective code review with anti-sycophancy and dissent requirement
---

# Code Review Skill

> **Canonical**: [docs/skills/automated-review.md](../../../docs/skills/automated-review.md), [docs/conventions/pr-review-council.md](../../../docs/conventions/pr-review-council.md) | Claude Code implementation

Structured multi-perspective review with anti-sycophancy safeguards. Run each perspective sequentially.

## RALPH Loop (Mandatory for G8)

G8 **always** requires a Review Agent running the full PR Review Council RALPH loop:

1. **Round 1 — Analysis**: Each perspective reviews independently, produces structured findings
2. **Round 2 — Deliberation**: Findings debated, severities adjusted, evidence challenged
3. **Round 3 — Vote**: Each finding voted Accept/Reject (>75% consensus to sustain)

**Iteration**: If any sustained Critical or Major findings remain, fix them and re-run the RALPH loop. Repeat until the verdict is APPROVED (no sustained Critical/Major). Self-review alone is never sufficient for G8.

**G8→G11 Spec Propagation**: Every RALPH finding that results in a code change MUST be propagated to specs in G11. Record each finding's impact for G11:
- Architectural changes → update `design.md`
- New constraints or invariants discovered → update `requirements.md`
- New/modified tasks → update `tasks.md`
- Changes to enforcement rules or cross-cutting concerns → update specs of ALL affected features (e.g., agentic-setup)

## Review Perspectives

### 1. Security Auditor

- Check for injection vulnerabilities (SQL, XSS, command injection)
- Verify all external input is Zod-validated
- Check error messages don't leak internals
- Verify SSRF protection on URL fetching
- Check for hardcoded secrets or credentials
- Verify `using` keyword for resource cleanup

### 2. Performance Reviewer

- Check for N+1 queries, unbounded loops, memory leaks
- Verify connection pooling and resource cleanup
- Check async patterns (no blocking I/O in hot paths)
- Verify circuit breaker usage for external calls
- Check for proper stream handling and backpressure

### 3. API Consistency Checker

- Verify naming follows domain ubiquitous language
- Check interface contracts match `design.md`
- Verify error types use discriminated unions with `_tag`
- Check Zod schema-first ordering in API handlers
- Verify OpenAPI/TypeSpec contract alignment

### 4. Architecture Auditor

- Verify layer boundaries (domain never imports infra)
- Check import paths (no barrel imports)
- Verify feature co-location (VSA pattern)
- Check file sizes (≤200 target, 300 hard limit)
- Verify OTel first import in service entry points

## Dissent Requirement

- You MUST find at least one genuine concern before approving
- Unanimous approval on first pass triggers additional scrutiny
- Record all concerns in structured format:
  ```
  ## Findings
  | # | Severity | File | Line | Finding | Recommendation |
  ```

## Anti-Sycophancy Protocol

- Blind evaluation: do not read the implementing agent's rationale
- Each reviewer has an explicitly different perspective (not generic)
- At least one reviewer is explicitly adversarial
- Human makes the final approval decision
