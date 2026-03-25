# Skill: Automated Review

**Agents**: Review, Security | **ADR**: [ADR-014](../adr/ADR-014-automation-strategy.md)

Pre-review analysis before PR Council convenes: classify changes, generate findings with evidence scores, match specialists, identify patterns requiring council attention.

## Change Analysis

On PR opened, automatically classify:

- **Type**: Feature, Bugfix, Refactor, Infrastructure, Documentation, Dependency
- **Risk**: LOW (docs, single pkg, <50 lines) → MEDIUM (multi-file, <200 lines) → HIGH (multi-pkg, shared/ changes, >200 lines) → CRITICAL (config, infra, security)

## Automated Finding Categories

- **Code quality**: Functions >50 lines, cyclomatic complexity >10, deep nesting >4, missing error handling/OTel
- **Pattern compliance**: ADR violations, missing Zod validation, missing shutdown/circuit breakers, files >300 lines (ADR-018), missing spec.md (ADR-020)
- **Test quality**: Missing tests for new code, coverage below threshold, infra mocks (ADR-007), assertion-less tests
- **Security**: Input validation gaps, hardcoded credentials, unsafe dependencies, missing rate limiting
- **Documentation**: Missing JSDoc on public API, breaking changes without migration notes, ADR-impacting changes without ADR update

## Evidence Scoring

`Score = certainty × severity × actionability`

- **Certainty**: static analysis = 0.9, heuristic = 0.7, absence detection = 0.5
- **Severity**: 5 (security/data loss) → 4 (breaking/ADR violation) → 3 (quality) → 2 (best practice) → 1 (style)
- **Actionability**: specific fix = 1.0, fix category = 0.7, needs investigation = 0.3

Score > 3.0 → MAJOR | 1.5–3.0 → MINOR | < 1.5 → INFO (advisory)

## Specialist Matching

Code quality → Performance Analyst, DevEx Advocate | ADR compliance → Architecture Historian, Pattern Guardian | Test quality → Test Strategist | Security → Threat Modeler, Compliance Auditor | Infrastructure → K8s Specialist, CI/CD Expert | Resilience → Chaos Specialist

## Council Preparation

Generate pre-review report: classification, risk, ranked findings (MAJOR/MINOR/INFO), auto-assigned specialists, affected ADRs, suggested focus areas. Distribute before Round 1.

## Post-Review Calibration

Compare auto-findings vs council findings: sustained (accuracy), dismissed (false positives), missed (gaps). Feed to Self-Improvement Loop for detection rule tuning.

## Related

- [PR Council Review Skill](pr-council-review.md), [Quality Gate Enforcement](quality-gate-enforcement.md)
- [ADR-018](../adr/ADR-018-agentic-coding-conventions.md), [ADR-019](../adr/ADR-019-ideation-decision-protocols.md), [ADR-020](../adr/ADR-020-spec-driven-development.md)
