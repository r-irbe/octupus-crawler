# Skill: Automated Review

| Field | Value |
| --- | --- |
| **Status** | Active |
| **Created** | 2026-03-24 |
| **Primary Agents** | Review, Security |
| **ADR** | [ADR-014](../adr/ADR-014-automation-strategy.md) |

## Purpose

Perform automated pre-review analysis before the human-mimicking PR Council convenes. Generate findings, score evidence, match specialists to issues, and identify patterns that require council attention.

## Pre-Review Automated Checks

### Change Analysis

```text
On PR opened, automatically:
  1. Classify change type:
     - Feature (new functionality)
     - Bugfix (corrects defect)
     - Refactor (behavior-preserving restructure)
     - Infrastructure (CI/CD, K8s, Docker)
     - Documentation (docs only)
     - Dependency (package updates)

  2. Scope assessment:
     - Files changed count
     - Lines added/removed
     - Packages affected
     - Cross-package impact (any shared/ changes?)
     - ADRs potentially affected

  3. Risk scoring:
     LOW:    Docs only, single package, < 50 lines
     MEDIUM: Multi-file, single package, < 200 lines
     HIGH:   Multi-package, shared/ changes, > 200 lines
     CRITICAL: Config changes, infrastructure, security-related
```

### Automated Finding Generation

```text
For each changed file, automatically detect:

CODE QUALITY FINDINGS:
  - Functions > 50 lines (complexity)
  - Cyclomatic complexity > 10
  - Deep nesting > 4 levels
  - Unused variables/imports
  - Missing error handling at system boundaries
  - Missing OTel instrumentation on service calls

PATTERN COMPLIANCE FINDINGS:
  - ADR violations (via quality-gate-enforcement skill)
  - Missing Zod validation on config
  - Missing graceful shutdown handlers
  - Missing circuit breakers on external calls
  - Hardcoded configuration values
  - Files exceeding 300 lines (ADR-018 §1 context rot)
  - Missing spec.md for feature directories (ADR-018 §3 SDD)
  - Guard Function chain not passing (ADR-018 §2)

TEST QUALITY FINDINGS:
  - New code without corresponding tests
  - Test coverage below thresholds
  - Infrastructure mocks (violates ADR-007)
  - Missing assertion (test without expect/assert)
  - Snapshot tests (discouraged)

SECURITY FINDINGS:
  - Input validation gaps
  - Missing output encoding
  - Hardcoded credentials/secrets
  - Unsafe dependency patterns
  - Missing rate limiting

DOCUMENTATION FINDINGS:
  - Public API without JSDoc
  - Breaking change without migration note
  - New package without README
  - ADR-impacting change without ADR update
```

### Evidence Scoring

```text
For each automated finding:

Evidence strength = certainty * severity * actionability

certainty (0-1):
  - Static analysis match = 0.9
  - Heuristic pattern match = 0.7
  - Absence detection (missing X) = 0.5

severity (1-5):
  - 5: Security vulnerability, data loss risk
  - 4: Breaking change, ADR violation
  - 3: Quality standard violation
  - 2: Best practice deviation
  - 1: Style/polish issue

actionability (0-1):
  - Specific fix known = 1.0
  - Category of fix known = 0.7
  - Needs investigation = 0.3

Score = certainty * severity * actionability
  - Score > 3.0 → Present to Council as MAJOR finding
  - Score 1.5-3.0 → Present as MINOR finding
  - Score < 1.5 → Present as INFO (advisory only)
```

### Specialist Matching

```text
For each finding, auto-assign specialist advisors:

Finding Category → Specialist(s):
  Code quality     → Performance Analyst, DevEx Advocate
  ADR compliance   → Architecture Historian, Pattern Guardian
  Test quality     → Test Strategist, Chaos Specialist
  Security         → Threat Modeler, Compliance Auditor
  Infrastructure   → K8s Specialist, CI/CD Pipeline Expert
  Documentation    → API Documentarian, Onboarding Advocate
  Resilience       → Chaos Specialist, SRE Observer
  Data handling    → Data Privacy Expert, Schema Guardian
```

## Council Preparation

```text
Before Council Round 1 (Analysis):

1. Generate Pre-Review Report:
   ── PR #123: Add rate limiting to crawler worker ──
   
   Classification: Feature | HIGH risk | 3 packages
   
   Automated Findings (12):
     MAJOR (3):
       F1: Missing circuit breaker on DNS resolution [Score: 3.6]
       F2: Rate limit config not Zod-validated [Score: 3.2]
       F3: No integration test for rate limit enforcement [Score: 3.0]
     MINOR (5):
       F4-F8: [listed with scores]
     INFO (4):
       F9-F12: [listed with scores]
   
   Specialists Auto-Assigned:
     F1 → Performance Analyst, Chaos Specialist
     F2 → Pattern Guardian
     F3 → Test Strategist
   
   ADRs Affected: ADR-002, ADR-009, ADR-013
   
   Suggested Focus Areas for Council:
     1. Rate limiting design (new pattern, not in existing ADR)
     2. DNS resolution resilience (ADR-009 gap?)
     3. Test coverage for concurrent rate limiting

2. Distribute to voting members + auto-assigned specialists
3. Set round timer (configurable, default 5 min per round)
```

## Post-Review Analysis

```text
After Council completes:
  1. Compare automated findings vs council findings:
     - Which auto-findings were sustained?
     - Which auto-findings were dismissed? (calibration data)
     - Which council findings were NOT auto-detected? (gap data)
  2. Feed comparison to Self-Improvement Loop:
     - Improve detection rules for missed findings
     - Reduce false positives for dismissed findings
     - Calibrate evidence scoring weights
  3. Track review quality metrics:
     - Auto-detection accuracy (findings sustained / findings generated)
     - Coverage (findings auto-detected / total findings)
     - False positive rate (findings dismissed / findings generated)
```

## Related

- [PR Council Review Skill](pr-council-review.md) — Manual council process
- [Quality Gate Enforcement Skill](quality-gate-enforcement.md) — Gate checks
- [Security Analysis Skill](security-analysis.md) — Security detection
- [Agent Management Pipeline](../automation/pipelines/agent-management.md) — Review agent metrics
- [ADR-018: Agentic Coding](../adr/ADR-018-agentic-coding-conventions.md) — Guard Functions, file size limits, SDD, atomic commits
- [ADR-019: Ideation & Decision Protocols](../adr/ADR-019-ideation-decision-protocols.md) — Anti-sycophancy for evidence evaluation
- [ADR-020: Spec-Driven Development](../adr/ADR-020-spec-driven-development.md) — EARS traceability, spec drift detection, contract compliance

---

> **Provenance**: Created 2026-03-24 as part of ADR-014. Updated 2026-03-25: added ADR-018 pattern compliance checks (file size, SDD, Guard Functions). Added ADR-019/020 cross-references.
