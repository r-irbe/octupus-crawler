# Pipeline: Documentation Lifecycle

| Field | Value |
| --- | --- |
| **Status** | Active |
| **Created** | 2026-03-24 |
| **ADR** | [ADR-014](../../adr/ADR-014-automation-strategy.md) |
| **Triggers** | `file.changed`, `task.completed`, `branch.merged`, `memory.written`, `schedule.daily` |

## Overview

Automates all documentation maintenance: index rebuilding, cross-reference validation, provenance tracking, gap analysis, and knowledge management. No documentation task is manual.

## Automated Processes

### 1. Index Auto-Rebuild

**Trigger:** `file.changed` (when .md file created/deleted), `branch.merged`

```text
On new/deleted .md file:
  1. Identify parent directory
  2. Read current index.md
  3. Scan directory for all .md files (excluding index.md)
  4. For each file: extract title, description from first heading + metadata
  5. Regenerate index table and bottom index
  6. Update document count in parent indexes (cascade up)
  7. Commit with message: "docs: auto-rebuild index for <dir>"
```

**Cascade rule:** When a child index changes, parent indexes update their document counts.

### 2. Cross-Reference Validation

**Trigger:** `file.changed` (any .md), `schedule.daily`

```text
For each .md file in docs/:
  1. Extract all markdown links [text](path)
  2. Resolve relative paths
  3. Check target file exists
  4. Check target heading exists (if #anchor)
  5. Report:
     - Dead links (target missing)
     - Stale links (target moved)
     - Orphaned files (no inbound links)
  6. Generate fix suggestions for dead links
```

**Output:** Cross-reference health report → Documentation Agent.

### 3. Provenance Auto-Update

**Trigger:** `file.changed` (any .md)

```text
On .md file modification:
  1. Check for provenance block (> **Provenance**: ...)
  2. If missing: add provenance block with creation date and author
  3. If present: update "Last Updated" date
  4. Validate provenance format matches documentation standards
```

### 4. Documentation Gap Analysis

**Trigger:** `schedule.weekly`, `task.completed` (for new features)

```text
Analyze documentation coverage:
  1. Scan all packages/ directories for code
  2. For each package: check for README.md, API docs
  3. For each ADR decision: check implementation references it
  4. For each agent: check all referenced skills exist
  5. For each skill: check referenced ADRs exist
  6. Report:
     - Undocumented packages
     - ADR decisions without implementation references
     - Missing skill-agent links
     - Guidelines without examples
```

**Output:** Gap analysis report → Documentation Agent for remediation.

### 5. Memory Tier Management

**Trigger:** `memory.written`, `memory.promoted`, `schedule.weekly`

```text
Automated memory hygiene:
  1. Session memory (docs/memory/session/):
     - Files > 7 days old without promotion → flag for review
     - Duplicate content across sessions → flag for consolidation
  2. Short-term memory (docs/memory/short-term/):
     - Entries validated by 3+ tasks → suggest promotion to long-term
     - Entries contradicted by recent work → flag for review
     - Entries > 30 days without reference → flag for archival
  3. Long-term memory (docs/memory/long-term/):
     - Patterns that suggest ADR amendment → draft amendment
     - Entries superseded by ADR updates → flag for removal
```

### 6. Worklog Auto-Generation

**Trigger:** `task.completed`

```text
On task completion:
  1. Collect: task description, agent(s), branch, files changed, tests added
  2. Collect: session learnings, decisions made, duration
  3. Generate worklog entry in standard format
  4. Save to docs/worklogs/YYYY-MM-DD-<task-slug>.md
  5. Update docs/worklogs/index.md
```

### 7. Dead Link Healing

**Trigger:** Cross-reference validation finding dead links

```text
On dead link detected:
  1. Search for renamed/moved target file (fuzzy match)
  2. If match found with >80% confidence:
     - Auto-fix the link
     - Commit with: "docs: auto-fix dead link <old> → <new>"
  3. If no confident match:
     - Create Documentation Agent ticket to fix
     - Add to gap analysis report
```

### 8. ADR Lifecycle Tracking

**Trigger:** `file.changed` (ADR files), `schedule.weekly`

```text
For each ADR:
  1. Check status (Proposed → Accepted → Deprecated → Superseded)
  2. Validate all referenced implementation files exist
  3. Check for contradictions with newer ADRs
  4. Check validation metrics are being measured
  5. Report:
     - ADRs with unmet validation targets
     - ADRs with no implementation references
     - ADRs that may need amendment (based on memory insights)
```

## Pipeline Flow

```text
file.changed (.md)
    │
    ├──▶ Index Auto-Rebuild
    ├──▶ Cross-Reference Validation
    ├──▶ Provenance Auto-Update
    └──▶ ADR Lifecycle Check (if ADR file)

task.completed
    │
    ├──▶ Worklog Auto-Generation
    ├──▶ Index Auto-Rebuild
    └──▶ Gap Analysis (if new feature)

memory.written / memory.promoted
    │
    └──▶ Memory Tier Management

schedule.daily
    │
    ├──▶ Cross-Reference Validation
    └──▶ Dead Link Healing

schedule.weekly
    │
    ├──▶ Documentation Gap Analysis
    ├──▶ Memory Tier Management
    └──▶ ADR Lifecycle Tracking
```

## Metrics Collected

| Metric | Target | Description |
| --- | --- | --- |
| `docs.index_freshness` | < 1 hour stale | Time since last index rebuild |
| `docs.dead_links` | 0 | Count of broken cross-references |
| `docs.orphaned_files` | 0 | Files with no inbound links |
| `docs.provenance_coverage` | 100% | Files with valid provenance blocks |
| `docs.gap_score` | < 5% | Undocumented code/features ratio |
| `docs.memory_staleness` | < 7 days session, < 30 days short-term | Age of unprocessed memories |
| `docs.auto_fix_rate` | > 80% | Dead links auto-healed vs reported |

## Related

- [Documentation Standards](../../guidelines/documentation-standards.md) — Format rules
- [Memory Promotion Workflow](../../guidelines/memory-promotion-workflow.md) — Promotion process
- [Documentation Agent](../../agents/documentation.md) — Executing agent
- [Self-Improvement Loop](self-improvement-loop.md) — Learning integration

---

> **Provenance**: Created 2026-03-24 as part of ADR-014 automation strategy. Defines automated documentation lifecycle management.
