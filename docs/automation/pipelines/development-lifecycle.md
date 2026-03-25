# Pipeline: Development Lifecycle

| Field | Value |
| --- | --- |
| **Status** | Active |
| **Created** | 2026-03-24 |
| **ADR** | [ADR-014](../../adr/ADR-014-automation-strategy.md) |
| **Triggers** | `task.assigned`, `task.completed`, `task.blocked`, `task.failed` |

## Overview

Automates the full software development lifecycle from requirement to merged code. Every task follows this pipeline automatically — no manual orchestration steps.

## Pipeline Stages

```text
task.assigned
    │
    ▼
┌────────────────────────┐
│ 1. CONTEXT PRE-FETCH   │  ← Automated
│   • Load relevant ADRs │
│   • Load memory (S/L)  │
│   • Load recent worklogs│
│   • Analyze codebase   │
│   • Pre-fetch deps     │
└──────────┬─────────────┘
           │
    ▼
┌────────────────────────┐
│ 2. DESIGN (if needed)  │  ← Architect Agent
│   • ADR compliance     │
│   • Pattern selection  │
│   • Interface design   │
│   • Impact analysis    │
│   • Belief check ≥80%  │
└──────────┬─────────────┘
           │
    ▼
┌────────────────────────┐
│ 3. BRANCH SETUP        │  ← Automated
│   • Create branch      │
│   • Naming convention  │
│   • Set up tracking    │
│   • Configure gates    │
└──────────┬─────────────┘
           │
    ▼
┌────────────────────────┐
│ 4. IMPLEMENT           │  ← Implementation Agent
│   • Write code         │
│   • Follow patterns    │
│   • ADR compliance     │
│   • Continuous lint     │
│   • Belief check ≥80%  │
└──────────┬─────────────┘
           │
    ▼
┌────────────────────────┐
│ 5. TEST                │  ← Test Agent (parallel)
│   • Generate tests     │
│   • Run test suite     │
│   • Coverage check     │
│   • Flaky detection    │
│   • Performance check  │
└──────────┬─────────────┘
           │
    ▼
┌────────────────────────┐
│ 6. QUALITY GATE        │  ← Automated (blocking)
│   • TypeScript strict  │
│   • ESLint clean       │
│   • Tests passing      │
│   • Coverage ≥80%      │
│   • ADR compliant      │
│   • No secrets in code │
│   • Deps validated     │
└──────────┬─────────────┘
           │ (PASS only)
    ▼
┌────────────────────────┐
│ 7. REVIEW              │  ← Review Agent + Council
│   • PR creation        │
│   • Council activation │
│   • 3-round process    │
│   • Consensus vote     │
│   • Finding resolution │
└──────────┬─────────────┘
           │ (APPROVED only)
    ▼
┌────────────────────────┐
│ 8. MERGE & CLEANUP     │  ← Automated
│   • Merge to target    │
│   • Delete work branch │
│   • Trigger release    │
└──────────┬─────────────┘
           │
    ▼
┌────────────────────────┐
│ 9. POST-TASK           │  ← Documentation Agent
│   • Session memory     │
│   • Worklog entry      │
│   • Index updates      │
│   • Memory promotion   │
│   • Metrics capture    │
└────────────────────────┘
```

## Stage Details

### Stage 1: Context Pre-Fetch (Automated)

Fires on `task.assigned`. Runs before any agent starts work.

**Actions:**

| Step | What | How |
| --- | --- | --- |
| ADR Loading | Read all ADRs referenced in task assignment | Parse `adrs` field, read files |
| Memory Loading | Read short-term and long-term memory for task domain | Keyword match on memory tier indexes |
| Worklog Scan | Find recent worklogs related to task area | Filename + content search |
| Codebase Analysis | Identify relevant files, dependencies, interfaces | `codebase-analysis` skill |
| Dependency Map | Map package dependencies affected by task | `package.json` graph traversal |
| Context Package | Bundle all context for assigned agent | Structured context document |

**Output:** Context package passed to agent with task assignment.

### Stage 2: Design (Conditional)

Skipped for: bug fixes, small refactors, test additions, doc changes.
Required for: new features, architecture changes, new packages, new dependencies.

**Gate:** Architect Agent belief ≥ 80% before proceeding.

### Stage 3: Branch Setup (Automated)

**Branch naming** (per git-safety skill):

```text
work/<task-slug>/<agent-id>/<sub-task>
```

**Parallel work** (if multiple agents):

```text
work/<task-slug>/architect/design
work/<task-slug>/implementation/code
work/<task-slug>/test/tests
```

### Stage 4: Implement

Implementation Agent works with:

- `code-generation` skill loaded
- `adr-compliance` skill loaded
- `git-safety` skill loaded
- All 6 instructions active
- Continuous quality feedback (lint on save)

**Automated checks during implementation:**

| Check | Frequency | Blocking |
| --- | --- | --- |
| TypeScript typecheck | On save | Warning |
| ESLint | On save | Warning |
| Import validation | On save | Warning |
| ADR compliance | On commit | Blocking |
| Secrets scan | On commit | Blocking |

### Stage 5: Test (Parallel with Implementation)

Test Agent can start writing tests as soon as interfaces are defined.

**Automated test selection:**

| Change Type | Required Tests |
| --- | --- |
| Pure function | Unit |
| Service with dependencies | Unit + Integration (Testcontainers) |
| API endpoint | Unit + Integration + Contract |
| Full feature | Unit + Integration + Contract + E2E |
| Performance-critical | All above + Load |

### Stage 6: Quality Gate (Blocking)

No code proceeds past this gate without passing ALL checks:

| Gate | Threshold | Action on Failure |
| --- | --- | --- |
| TypeScript strict | Zero errors | Block, report to agent |
| ESLint | Zero errors, zero warnings | Block, report to agent |
| Tests passing | 100% | Block, report to agent |
| Coverage (business) | ≥ 80% | Block, report to agent |
| Coverage (overall) | ≥ 60% | Block, report to agent |
| ADR compliance | All referenced ADRs | Block, report to agent |
| Secrets scan | Zero findings | Block, escalate to Security |
| Dependency audit | No known CVEs (critical/high) | Block, escalate to Security |
| Commit messages | Conventional commits format | Block, report to agent |

### Stage 7: Review

Review Agent activates PR Council automatically on `pr.opened`.

### Stage 8: Merge & Cleanup (Automated)

On `pr.approved`:

1. Squash merge to target branch
2. Delete work branch
3. Fire `branch.merged` event → triggers Release Pipeline

### Stage 9: Post-Task (Automated)

On `task.completed`:

1. Documentation Agent creates session memory entry
2. Documentation Agent creates worklog entry
3. Documentation Agent rebuilds affected indexes
4. Self-Improvement Loop evaluates session learnings
5. Metrics Collector records task duration, complexity, rework

## Failure Handling

| Failure Point | Response |
| --- | --- |
| Context pre-fetch fails | Log warning, proceed with partial context |
| Design belief < 80% | Escalate to user per belief threshold |
| Quality gate fails | Report to Implementation Agent, loop back to Stage 4 (max 3 total attempts per ADR-018 §7, then escalate to Gateway → user) |
| Review rejects | Report findings to Implementation Agent, loop back to Stage 4 (counts toward 3-attempt limit) |
| Merge conflict | Escalate to Gateway for conflict resolution |
| Post-task fails | Log error, fire `agent.error` event, retry once |

## Metrics Collected

| Metric | Description |
| --- | --- |
| `task.duration` | Total time from assigned to completed |
| `task.rework_count` | Times through quality gate loop |
| `task.stage_durations` | Time in each stage |
| `task.belief_escalations` | Number of belief threshold triggers |
| `task.files_changed` | Count of files modified |
| `task.tests_added` | Count of new tests |
| `task.coverage_delta` | Coverage change from task |

## Related

- [Quality Gates Pipeline](quality-gates.md) — Stage 6 details
- [Release Pipeline](release-pipeline.md) — Post-merge automation
- [Self-Improvement Loop](self-improvement-loop.md) — Post-task learning
- [Triggers](../triggers.md) — Event definitions
- [ADR-018: Agentic Coding](../../adr/ADR-018-agentic-coding-conventions.md) — Guard Functions, max 3 attempts, Spec-Driven Development
- [ADR-020: Spec-Driven Development](../../adr/ADR-020-spec-driven-development.md) — EARS requirements → design → tasks workflow, contract-first API pipeline

---

> **Provenance**: Created 2026-03-24 as part of ADR-014 automation strategy. Updated 2026-03-25: aligned with ADR-018 (3-attempt retry limit, ADR-018 reference). Added ADR-020 cross-reference.
