# PR Review Council Convention

| Field | Value |
| --- | --- |
| **Status** | Accepted |
| **Created** | 2026-03-24 |
| **Last Updated** | 2026-03-24 |
| **Author(s)** | Architecture Council |
| **Style** | Google-style PR convention with AI Ralph-Loop council reviews |

## Overview

All pull requests undergo review by an AI Council that operates in deliberative rounds. The council consists of **voting members** who decide acceptance and **non-voting specialist advisors** who provide evidence, analysis, and recommendations. Findings must reach **>75% consensus** among voting members to be accepted.

## PR Convention (Google Style)

### PR Title Format

```text
<type>(<scope>): <short summary>

Types: feat, fix, refactor, perf, test, docs, chore, ci, build
Scope: scheduler, worker, api, shared, infra, k8s, adr, convention
```

### PR Description Template

```markdown
## Summary

[One paragraph describing the change]

## Motivation

[Why is this change necessary? Link to issue/ADR]

## Changes

- [Bullet list of key changes]

## Testing

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing performed

## ADR Alignment

- [Which ADRs does this change align with?]
- [Does this change require a new ADR or ADR update?]

## Rollback Plan

[How to revert this change if it causes issues]

## Council Review Notes

[Populated by the PR Review Council after review]
```

## Council Composition

### Voting Members (6)

These members deliberate and vote on all findings. A finding is accepted when **>75% (at least 5 of 6)** vote in favor.

| Role | Focus Area | Vote Weight |
| --- | --- | --- |
| **Architect** | System design, pattern compliance, ADR alignment, tech debt | 1 |
| **Skeptic** | Challenge assumptions, find edge cases, question necessity | 1 |
| **Socratic Advisor** | Ask probing questions, surface implicit assumptions, deepen understanding | 1 |
| **Devil's Advocate** | Argue the opposing position, stress-test proposals, find failure modes | 1 |
| **Product Manager** | User impact, business value, scope creep, priorities | 1 |
| **SRE** | Reliability, observability, graceful degradation, operational burden | 1 |

### Non-Voting Specialist Advisors (20)

These specialists **advise and support** voting members. They gather evidence, perform analysis, present argumentation and counter-argumentation, but do **not** cast votes.

| Specialist | Expertise |
| --- | --- |
| **DevOps** | CI/CD pipelines, container builds, deployment automation |
| **DevEx** | Developer experience, tooling friction, onboarding, DX improvement |
| **SecOps** | Security operations, threat detection, incident response |
| **SecEng** | Security engineering, vulnerability analysis, secure coding patterns |
| **SRE (Advisor)** | Site reliability advisory, SLO/SLI definition, error budgets |
| **Network Engineer** | Network topology, DNS, load balancing, latency, mTLS |
| **UI Designer** | Visual design, component patterns, accessibility |
| **UX Researcher** | User flows, usability, cognitive load, task analysis |
| **API Designer** | REST/GraphQL design, versioning, backward compatibility, contracts |
| **Enterprise Architect** | Cross-system integration, governance, compliance, standards |
| **Sales** | Customer-facing impact, competitive positioning, messaging |
| **Executive** | Strategic alignment, resource allocation, risk appetite |
| **Research Engineer** | Algorithmic efficiency, academic literature, novel approaches |
| **Data Engineer** | Data pipelines, schema design, ETL, data quality |
| **AI Engineer** | ML integration, model serving, AI-assisted features |
| **Data Scientist** | Statistical analysis, A/B testing, metrics interpretation |
| **Prompt Engineer** | LLM interaction design, prompt quality, AI tool effectiveness |
| **AI Architect** | AI system design, model orchestration, AI infrastructure |
| **Distributed Systems Specialist** | Consensus, consistency, partition tolerance, distributed algorithms |
| **QA Engineer** | Test coverage, edge cases, regression testing, quality gates |

## Review Process: Ralph-Loop Rounds

### Round Structure

The council reviews PRs in structured rounds. Each round focuses on a specific aspect and produces findings that are voted upon.

```text
┌─────────────────────────────────────────────────────────────┐
│                    RALPH-LOOP REVIEW                        │
│                                                             │
│  ┌──────────┐    ┌───────────┐    ┌──────────────────────┐  │
│  │ Round 1  │───→│ Round 2   │───→│ Round 3              │  │
│  │ Analysis │    │ Debate    │    │ Consensus & Verdict  │  │
│  └──────────┘    └───────────┘    └──────────────────────┘  │
│       │                │                     │              │
│       ▼                ▼                     ▼              │
│  Specialists      Voting Members       Final Vote           │
│  gather evidence  debate findings      >75% threshold       │
│  & present data   with advisor help                         │
└─────────────────────────────────────────────────────────────┘
```

### Round 1: Analysis & Evidence Gathering

**Duration**: Initial deep analysis

**Participants**: All non-voting specialists (primary), voting members (observe)

**Activities**:

1. Each specialist reviews the PR through their lens
2. Specialists produce **findings** — structured observations with evidence

**Finding Format**:

```markdown
### Finding: [F-XXX] [Title]

- **Raised By**: [Specialist Role]
- **Severity**: Critical | Major | Minor | Informational
- **Category**: Security | Performance | Reliability | Design | Testing | DX | Ops
- **Evidence**: [Code references, benchmarks, documentation, precedent]
- **Recommendation**: [Specific actionable suggestion]
- **Counter-Evidence**: [Arguments against this finding, if any]
- **Related ADR**: [ADR-XXX if applicable]
```

### Round 2: Deliberation & Debate

**Duration**: Structured debate

**Participants**: Voting members (primary), specialists (on-call for questions)

**Activities**:

1. Voting members review all findings from Round 1
2. For each finding, voting members may:
   - Request additional evidence from specialists
   - Ask specialists for counter-arguments
   - Challenge severity assessments
   - Propose amendments to recommendations
3. Voting members discuss and refine findings
4. The **Socratic Advisor** ensures all assumptions are surfaced
5. The **Devil's Advocate** stress-tests each finding
6. The **Skeptic** challenges overly confident assessments

**Deliberation Protocol**:

- Each finding is discussed for a minimum of one exchange
- Any voting member can escalate a finding's severity
- Any voting member can request additional specialist input
- The Architect ensures findings align with ADR decisions
- The Product Manager weighs business impact vs effort
- The SRE evaluates operational risk

### Round 3: Consensus & Verdict

**Duration**: Voting

**Participants**: Voting members only

**Activities**:

1. Each finding is voted on individually
2. Voting is explicit: **Accept** (finding is valid) or **Reject** (finding is not valid/relevant)
3. A finding is **sustained** if >75% of voting members (at least 5 of 6) vote Accept
4. Sustained findings with severity Critical or Major **block** the PR
5. Sustained findings with severity Minor produce **recommendations** (non-blocking)
6. Sustained findings with severity Informational are **noted** for future reference

**Verdict Categories**:

| Verdict | Condition | PR Status |
| --- | --- | --- |
| **APPROVED** | No sustained Critical or Major findings | Merge allowed |
| **CHANGES REQUESTED** | 1+ sustained Major findings | Block until addressed |
| **REJECTED** | 1+ sustained Critical findings | Block, requires redesign |
| **DEFERRED** | Insufficient evidence for verdict | Additional round scheduled |

### Post-Review

1. All findings, votes, and verdict are documented in the PR
2. Sustained findings are linked to follow-up issues if not addressed in this PR
3. Patterns observed across PRs are captured in session learnings
4. ADRs are updated if findings reveal gaps in architectural decisions

## Review Output Format

```markdown
## PR Council Review — PR #[number]

**Date**: YYYY-MM-DD
**Rounds Completed**: [N]
**Verdict**: APPROVED | CHANGES REQUESTED | REJECTED | DEFERRED

### Council Attendance

**Voting**: Architect ✓, Skeptic ✓, Socratic ✓, Devil's Advocate ✓, PM ✓, SRE ✓
**Advisors**: [List of specialists who contributed]

### Sustained Findings

#### [F-001] [Title] — [Severity]

- **Raised By**: [Role]
- **Evidence**: [Summary]
- **Recommendation**: [Action]
- **Vote**: 6/6 Accept (100%)
- **Status**: Blocking | Recommendation | Noted

### Rejected Findings

#### [F-002] [Title] — [Severity]

- **Raised By**: [Role]
- **Rejection Reason**: [Why <75% voted Accept]
- **Vote**: 3/6 Accept (50%)

### Session Learnings

- [Patterns, insights, or process improvements identified during this review]

### ADR Impact

- [Any ADRs that need creation or update based on this review]
```

## Anti-Sycophancy Safeguards (ADR-019)

The council process is explicitly designed to prevent sycophantic agreement patterns. Research shows that multi-agent debate suffers from **disagreement collapse** — agents converging too quickly without genuine critique (78.5% sycophancy persistence rate in unconstrained systems).

### Mandatory Dissent Rules

1. **No unanimous first-pass approval**: In Round 2 deliberation, each voting member MUST articulate at least one concern or risk before casting an APPROVE vote. A finding that passes Round 2 with zero concerns logged is automatically flagged for a supplementary Devil's Advocate challenge.

2. **Disagreement collapse detection**: If Round 2 produces fewer than 2 dissenting arguments across all findings, the Gateway injects an additional challenge round where the Devil's Advocate and Skeptic roles are required to argue against the majority position with evidence.

3. **Minority opinion preservation**: When a voting member dissents with evidence-backed reasoning but is overruled, their dissenting argument MUST be recorded in the review output under a "Dissenting Opinions" section — not silently discarded.

4. **Confidence-weighted domain voting**: For findings in a specialist domain (e.g., security, performance), voting members with relevant expertise have their arguments given extra scrutiny weight during deliberation.

5. **Citation rebuttal rule**: No voting member may dismiss a finding without providing counter-evidence. "I disagree" is not sufficient — it must be "I disagree because [evidence]."

### Role Separation

The existing council roles (Skeptic, Devil's Advocate, Socratic Advisor) are the primary anti-sycophancy mechanism. These roles MUST NOT be collapsed into a single "general reviewer" perspective. Each role brings a distinct cognitive stance:

- **Skeptic**: Questions whether the change is necessary at all
- **Devil's Advocate**: Argues the strongest possible case for the opposing approach
- **Socratic Advisor**: Surfaces unstated assumptions through probing questions

## Escalation Path

1. If the council cannot reach consensus after 3 rounds → escalate to human reviewer
2. If a voting member recuses due to conflict of interest → minimum 4/5 (80%) for sustained
3. If all specialists agree but voting members disagree → mandatory additional round with expanded evidence

## Integration with CI/CD

The PR Review Council runs as a GitHub Actions workflow triggered on PR creation and updates:

1. PR opened → Council review triggered
2. Council produces structured review as PR comment
3. Sustained Critical/Major findings → PR status check fails
4. Author addresses findings → re-review triggered
5. Council re-reviews only the deltas
6. APPROVED verdict → status check passes → merge allowed

## Related

- [ADR-012: CI/CD Pipeline](../adr/ADR-012-ci-cd-pipeline.md) — Council integrates as CI status check
- [ADR-016: Coding Standards](../adr/ADR-016-coding-standards-principles.md) — CUPID/FOOP compliance, naming conventions, ESLint enforcement
- [ADR-017: Service Communication](../adr/ADR-017-service-communication.md) — tRPC contract review, Temporal workflow correctness
- [ADR-018: Agentic Coding](../adr/ADR-018-agentic-coding-conventions.md) — File size limits, Guard Functions, SDD compliance
- [ADR-019: Ideation & Decision Protocols](../adr/ADR-019-ideation-decision-protocols.md) — Anti-sycophancy, MAD safeguards, disagreement collapse prevention
- [ADR-020: Spec-Driven Development](../adr/ADR-020-spec-driven-development.md) — EARS traceability, contract-first API review, spec drift detection
- [Documentation Standards](../guidelines/documentation-standards.md) — Finding format follows doc standards
- [Memory Promotion Workflow](../guidelines/memory-promotion-workflow.md) — Session learnings from reviews

---

> **Provenance**: Created 2026-03-24 as part of initial project governance setup. Defines the AI-assisted PR review process with voting council and specialist advisors. Updated 2026-03-25: added Anti-Sycophancy Safeguards section per ADR-019; added ADR-016/017/018/020 cross-references.
