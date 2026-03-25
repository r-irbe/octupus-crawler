# Virtual Memory Requirements

| Field | Value |
| --- | --- |
| **Status** | Accepted |
| **Created** | 2026-03-25 |
| **Last Updated** | 2026-03-25 |
| **ADR References** | ADR-018, ADR-021, ADR-022 |
| **Spec Type** | EARS Requirements (ADR-020) |

## Overview

Virtual memory enables AI agents to work on tasks that exceed their effective context window by compressing, paging, and selectively loading context on demand. Inspired by MemGPT/Letta, InfiniteICL, and HiAgent research.

## Requirements

### Context Distillation

**REQ-VMEM-001**: When an agent completes a task in a multi-task session, the system shall compress the completed task's context to essential facts and outcomes, reducing context size by at least 80%. This target shall be empirically validated per the validation protocol in design.md §7.

**REQ-VMEM-002**: When context distillation is applied, the agent shall maintain task accuracy above 95% compared to full-context baseline. "Accuracy" is defined as: the distilled context contains all information necessary to (a) correctly answer questions about the completed task, (b) resolve cross-task dependencies, and (c) avoid re-doing completed work. Measured via the validation protocol in design.md §7.

**REQ-VMEM-003**: When a distilled context entry is created, the system shall record the original context size, distilled size, compression ratio, and source task identifier.

### Hierarchical Chunking

**REQ-VMEM-004**: When an agent navigates a codebase with more than 50 files, the system shall organize the codebase into a hierarchical chunk tree (package → feature → file → section).

**REQ-VMEM-005**: When a chunk is requested, the system shall load only that chunk and its immediate parent context, not the entire hierarchy.

**REQ-VMEM-006**: When hierarchical chunking is applied, context usage shall be reduced by at least 30% compared to loading all relevant files.

### State Tracker as Working Memory

**REQ-VMEM-007**: While an agent session is active, the agent shall maintain a state tracker file (per ADR-018 G4) as compressed external working memory.

**REQ-VMEM-008**: When an agent begins a new task within a session, the agent shall re-read the state tracker before loading any other context.

**REQ-VMEM-009**: When a task is completed, the agent shall update the state tracker with: task status, key decisions, commit hash, and any context that must persist to the next task.

### Selective Loading

**REQ-VMEM-010**: When loading context for a task, the agent shall load only the files directly needed for the current task, not all files in the feature or package.

**REQ-VMEM-011**: When a file is loaded and exceeds 200 lines, the agent should load only the relevant section(s) rather than the entire file.

**REQ-VMEM-012**: When schema or type information is needed, the agent shall use on-demand schema loading (MCP or targeted file read) rather than preloading all schemas.

### Eviction Policy

**REQ-VMEM-013**: When context utilization exceeds 50% of the effective window, the system shall trigger eviction of least-recently-referenced loaded context.

**REQ-VMEM-014**: When evicting context, the system shall first evict completed task contexts that have been distilled, then unrelated reference material, then older task contexts.

**REQ-VMEM-015**: The system shall never evict: the current task's active files, the state tracker, the agent definition, or the active instruction set.

### Context Budget

**REQ-VMEM-016**: While an agent session is active, the system shall track cumulative context size and report utilization as a percentage of the effective window (50% of declared window per NoLiMa findings).

**REQ-VMEM-017**: When context utilization exceeds 70% of effective window, the system shall warn the agent and suggest context compression or session restart.

**REQ-VMEM-020**: Token estimation shall use model-specific tokenization where available. Fallback estimation shall use the following ratios: Claude (UTF-8, ~3.5 chars/token), OpenAI GPT-4 (cl100k_base, ~4 chars/token), Gemini (~4 chars/token). The `char/4` approximation shall only be used when the model is unknown.

**REQ-VMEM-021**: When context budget thresholds (50% eviction, 70% warning) are exceeded, the system shall log the event with: current utilization percentage, number of loaded files, total token count, and recommended action.

### Paging

**REQ-VMEM-018**: When an evicted context is needed again, the system shall reload it from disk (file system, state tracker, or distilled summary).

**REQ-VMEM-019**: When a page fault occurs (access to evicted context), the system shall log the event with: what was needed, why it was evicted, and the reload cost.

## Acceptance Criteria

| Requirement | Verification Method |
| --- | --- |
| REQ-VMEM-001 | Measure compression ratio across 10+ multi-task sessions; target ≥80% |
| REQ-VMEM-002 | Compare task accuracy with/without distillation on 5+ identical task sets |
| REQ-VMEM-004 | Verify chunk tree generation for packages with >50 files |
| REQ-VMEM-007 | Audit agent sessions for state tracker creation and updates |
| REQ-VMEM-013 | Monitor context utilization metrics during long sessions |
| REQ-VMEM-016 | Dashboard showing context utilization per agent session |
| REQ-VMEM-020 | Verify token estimation accuracy within 15% of actual count per model |

### Acceptance Criteria — Context Distillation

```gherkin
Given an agent completes a task producing 10,000 tokens of context
When context distillation is applied
Then the distilled context is ≤2,000 tokens (≥80% compression)

Given a distilled context and 5 identical task sets
When task accuracy is compared (full context vs distilled)
Then the distilled version scores ≥95% accuracy
```

### Acceptance Criteria — Hierarchical Chunking

```gherkin
Given a codebase with 60 files across 3 packages
When hierarchical chunking is applied
Then a chunk tree (package → feature → file → section) is produced

Given a specific file section is requested
When the chunk is loaded
Then only that chunk and its immediate parent context are loaded
And context usage is ≥30% less than loading all relevant files
```

### Acceptance Criteria — State Tracker

```gherkin
Given an active agent session
When a new task begins
Then the state tracker is re-read before any other context is loaded

Given a task is completed
When the state tracker is updated
Then it records: task status, key decisions, commit hash, and persistent context
```

### Acceptance Criteria — Selective Loading

```gherkin
Given a task requiring 3 specific files in a 20-file feature
When context is loaded
Then only 3 files are loaded, not all 20

Given a 300-line file where only lines 50-100 are relevant
When the file is loaded
Then only the relevant section is loaded (not all 300 lines)
```

### Acceptance Criteria — Eviction & Paging

```gherkin
Given context utilization exceeds 50% of the effective window
When eviction triggers
Then completed-and-distilled task contexts are evicted first
And current task files, state tracker, agent definition, and instructions are never evicted

Given an evicted context is needed again
When the page fault occurs
Then the system logs: what was needed, why it was evicted, and reload cost
And the context is reloaded from disk
```

### Acceptance Criteria — Context Budget

```gherkin
Given a Claude model with 200K declared window
When the effective window is calculated
Then it is 100K (50% per NoLiMa findings)

Given context utilization reaches 72% of effective window
When the warning threshold (70%) is checked
Then a warning is emitted suggesting compression or session restart
And the event is logged with: utilization %, loaded file count, total tokens, recommended action

Given a Claude model processes text
When token estimation uses ~3.5 chars/token
Then the estimate is within 15% of the actual token count
```

## Traceability

| Requirement | Source | Implements |
| --- | --- | --- |
| REQ-VMEM-001–003 | InfiniteICL (90% context reduction) | ADR-022 §6 context distillation |
| REQ-VMEM-004–006 | HiAgent (35% context reduction) | ADR-022 §6 hierarchical chunking |
| REQ-VMEM-007–009 | ADR-018 G4/G7 | State tracker as working memory |
| REQ-VMEM-010–012 | ADR-018 §5 | Selective loading |
| REQ-VMEM-013–015 | MemGPT/Letta eviction policy | ADR-022 §6 |
| REQ-VMEM-016–017 | NoLiMa 2025 (50% effective window) | ADR-021 §2 budget governance |
| REQ-VMEM-018–019 | OS virtual memory paging | ADR-022 §6 |
| REQ-VMEM-020 | Model-specific tokenization research | ADR-022 §6 |
| REQ-VMEM-021 | Budget threshold observability | ADR-022 §6 |

---

> **Provenance**: Created 2026-03-25. EARS requirements for virtual memory capabilities. Source research: InfiniteICL, HiAgent, MemGPT/Letta from [collapse.md](../../research/collapse.md). Referenced by [ADR-022 §6](../../adr/ADR-022-memory-governance.md). Updated 2026-03-25: added REQ-VMEM-020–021, refined REQ-VMEM-001/002 with empirical validation protocol, accuracy definition per PR Review Council.
