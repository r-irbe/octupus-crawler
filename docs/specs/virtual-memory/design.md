# Virtual Memory Design

| Field | Value |
| --- | --- |
| **Status** | Accepted |
| **Created** | 2026-03-25 |
| **Last Updated** | 2026-03-25 |
| **ADR References** | ADR-018, ADR-021, ADR-022 |
| **Requirements** | [requirements.md](requirements.md) |

## Architecture

```text
┌─────────────────────────────────────────────────────┐
│                    Agent Session                     │
│                                                     │
│  ┌──────────────┐   ┌──────────────┐                │
│  │ Working       │   │ Context      │                │
│  │ Memory       │   │ Budget       │                │
│  │ (active)     │   │ Monitor      │                │
│  │              │   │ (REQ-016)    │                │
│  │ - State      │   └──────┬───────┘                │
│  │   tracker    │          │                        │
│  │ - Current    │    ┌─────▼──────┐                 │
│  │   task files │    │ Eviction   │                 │
│  │ - Agent def  │    │ Controller │                 │
│  │ - Instructions│   │ (REQ-013)  │                 │
│  └──────┬───────┘    └─────┬──────┘                 │
│         │                  │                        │
│  ┌──────▼──────────────────▼──────┐                 │
│  │        Page Table              │                 │
│  │  (loaded ↔ evicted mapping)    │                 │
│  └──────────────┬─────────────────┘                 │
│                 │                                   │
│  ┌──────────────▼─────────────────┐                 │
│  │      Backing Store             │                 │
│  │  - File system (source)        │                 │
│  │  - Distilled summaries         │                 │
│  │  - State tracker snapshots     │                 │
│  └────────────────────────────────┘                 │
└─────────────────────────────────────────────────────┘
```

## Components

### 1. Context Budget Monitor (REQ-VMEM-016, REQ-VMEM-017)

Tracks cumulative context size during an agent session.

| Property | Value |
| --- | --- |
| Effective window | 50% of declared model window (per NoLiMa) |
| Warning threshold | 70% of effective window |
| Eviction threshold | 50% of effective window (triggers LRU eviction) |
| Tracking granularity | Per-file token estimate |

**Token estimation**: Model-specific tokenization when available:

| Model Family | Tokenizer | Approx chars/token | Source |
| --- | --- | --- | --- |
| Claude (Anthropic) | UTF-8 based | ~3.5 | Anthropic docs |
| GPT-4 / GPT-4o (OpenAI) | cl100k_base | ~4.0 | tiktoken |
| Gemini (Google) | SentencePiece | ~4.0 | Google docs |
| Unknown / fallback | char/4 | ~4.0 | Conservative estimate |

For precise budgeting, use the model's tokenizer library (tiktoken for OpenAI, Anthropic SDK for Claude). The char/4 fallback is acceptable for rough estimates but should not drive eviction decisions in tight-budget scenarios.

### 2. Hierarchical Chunk Tree (REQ-VMEM-004–006)

Organizes the codebase into a navigable hierarchy for selective loading:

```text
Level 0: Workspace root
Level 1: Package (apps/api-gateway, packages/core, ...)
Level 2: Feature (src/features/crawl-pipeline/, ...)
Level 3: File (crawl.service.ts, crawl.handler.ts, ...)
Level 4: Section (function, class, type block)
```

**Loading rules**:

- Level 0–1: Load only directory listing (names + descriptions)
- Level 2: Load feature index (requirements.md summary or file listing)
- Level 3: Load full file if ≤200 lines; load section-level index if >200 lines
- Level 4: Load specific function/class on demand

### 3. Context Distillation (REQ-VMEM-001–003)

When a task is completed, compress its context:

**Input**: Full task context (loaded files, decisions, outcomes)

**Output**: Distilled entry with:

- Task identifier and status
- Key decisions made (1-2 sentences each)
- Files modified (paths only)
- Commit hash
- Critical facts needed by dependent tasks

**Target compression**: ≥80% size reduction (InfiniteICL achieves 90%)

**Storage**: Appended to state tracker under `## Distilled Tasks` section

**Example — Before and After Distillation**:

*Before* (full context, ~2400 tokens):

```text
Loaded files: ssrf-guard/requirements.md (800 tokens), ssrf-guard/design.md (1200 tokens),
ADR-009.md (400 tokens). Decisions: Changed REQ-SEC-014 to require per-IP validation.
Added SsrfValidationResult interface with pinnedIp field. Fixed TOCTOU race by coordinating
DNS resolution between SSRF guard and HTTP fetcher. Commit abc1234. Discussion about
whether to use DNS-over-HTTPS (decided against for latency). Explored whether to cache
DNS results (decided yes, 60s TTL). Read 15 files for context...
```

*After* (distilled, ~480 tokens, 80% reduction):

```text
## Distilled: SSRF Guard TOCTOU Fix
- **Task**: Fix DNS TOCTOU between SSRF guard and HTTP fetcher
- **Status**: completed
- **Commit**: abc1234
- **Key decisions**: (1) SsrfValidationResult returns pinnedIp — fetcher uses it directly.
  (2) DNS cache with 60s TTL. (3) No DNS-over-HTTPS (latency concern).
- **Files modified**: ssrf-guard/requirements.md, ssrf-guard/design.md
- **Dependencies**: http-fetching spec must consume pinnedIp from SsrfValidationResult
```

**When to Distill** (decision tree):

1. Task commit completed → **Distill immediately**
2. Task abandoned/blocked → **Distill with status=failed, record blocker**
3. Task paused for sub-task → **Do not distill yet** (retain full context)
4. Session nearing budget limit → **Distill oldest completed tasks first** (LRU)

### 4. Eviction Controller (REQ-VMEM-013–015)

LRU eviction with priority classes:

| Priority | Content | Evictable? |
| --- | --- | --- |
| P0 (pinned) | State tracker, agent definition, active instructions | Never |
| P1 (current) | Current task's active files | Never during task |
| P2 (recent) | Previous task's files (undistilled) | After distillation |
| P3 (reference) | ADRs, guidelines, specs loaded for reference | LRU eviction |
| P4 (stale) | Distilled task summaries from >5 tasks ago | First to evict |

### 5. Page Table

Maps every loaded context entry to its backing store location:

| Entry | Status | Backing Store | Last Accessed | Size (tokens) |
| --- | --- | --- | --- | --- |
| `state-tracker.md` | Pinned | `docs/memory/session/...` | Always | ~500 |
| `crawl.service.ts` | Loaded | `apps/worker/src/...` | Task 3 | ~400 |
| `ADR-018.md` | Evicted | `docs/adr/ADR-018...` | Task 1 | ~800 |

## Interfaces

### ContextBudget

```typescript
interface ContextBudget {
  readonly declaredWindow: number;    // Model's declared context window
  readonly effectiveWindow: number;   // 50% of declared (NoLiMa)
  readonly currentUsage: number;      // Current token usage
  readonly utilizationPct: number;    // currentUsage / effectiveWindow
  readonly warningThreshold: number;  // 70% of effective
  readonly evictionThreshold: number; // 50% of effective
}
```

### DistilledEntry

```typescript
interface DistilledEntry {
  readonly taskId: string;
  readonly status: 'completed' | 'failed';
  readonly summary: string;         // 1-3 sentences
  readonly filesModified: string[]; // Paths only
  readonly commitHash?: string;
  readonly keyDecisions: string[];  // 1-2 sentences each
  readonly originalSize: number;    // Tokens before distillation
  readonly distilledSize: number;   // Tokens after distillation
}
```

### PageEntry

```typescript
interface PageEntry {
  readonly path: string;
  readonly status: 'pinned' | 'loaded' | 'evicted';
  readonly priority: 0 | 1 | 2 | 3 | 4;
  readonly backingStore: string;    // File path on disk
  readonly lastAccessed: number;    // Task number
  readonly sizeTokens: number;
}
```

## Implementation Notes

Virtual memory is primarily a **protocol** for agents to follow, not runtime code. The state tracker serves as the page table and distillation store. Agents implement the protocol by:

1. Checking context budget before loading new files
2. Using selective loading (read specific sections, not full files)
3. Distilling completed task context into state tracker
4. Re-reading state tracker before each task (page table refresh)
5. Preferring distilled summaries over reloading full files

Runtime tooling (MCP servers, VS Code extensions) may eventually automate these steps, but the protocol is designed to work with manual agent discipline today.

## 7. Empirical Validation Protocol (REQ-VMEM-001, REQ-VMEM-002)

The 80% compression and 95% accuracy targets require empirical validation before adoption.

**Validation Procedure**:

1. **Corpus**: Select 10 representative multi-task sessions (≥4 tasks each) from real IPF development
2. **Baseline**: Run each session with full context (no distillation) and record all task outcomes
3. **Treatment**: Run identical sessions with distillation applied after each task
4. **Measure compression**: `1 - (distilled_size / original_size)` for each task transition
5. **Measure accuracy**: Score each distilled session against baseline:
   - (a) Cross-task dependency resolution: Does the agent correctly reference prior task outputs? (binary per dependency)
   - (b) Work deduplication: Does the agent avoid re-doing completed work? (binary per task)
   - (c) Factual consistency: Are prior decisions correctly recalled? (binary per fact reference)
   - **Accuracy** = correct_resolutions / total_resolutions across all three categories
6. **Acceptance**: Compression ≥80% AND accuracy ≥95% across ≥8 of 10 sessions

**Evidence basis for thresholds**:

- 80% compression: InfiniteICL (2025) achieves 90% on similar tasks; 80% is conservative
- 50% effective window: NoLiMa (2025) demonstrates significant accuracy degradation beyond 50% of declared window in long-context benchmarks
- 70% warning threshold: MemGPT/Letta (Packer et al. 2024) uses similar approach; 70% provides actionable buffer before hard eviction

## 8. State Tracker Backup & Recovery

The state tracker is the single source of truth for virtual memory. Loss of the state tracker means loss of the page table.

**Backup strategy**:

- After each G7 (state update gate), commit the state tracker to Git
- State tracker lives in `docs/memory/session/` which is tracked by Git
- Recovery: `git log --oneline -- docs/memory/session/<tracker>.md` to list snapshots
- Restore: `git checkout <commit> -- docs/memory/session/<tracker>.md`

**Eviction audit trail**: Every eviction event is logged in the state tracker's `## Context Events` section with timestamp, evicted file path, reason (LRU/manual/budget), and context utilization at time of eviction.

## Related

- [Requirements](requirements.md) — EARS requirements for virtual memory
- [ADR-022 §6](../../adr/ADR-022-memory-governance.md) — Virtual memory architecture overview
- [ADR-021](../../adr/ADR-021-context-collapse-prevention.md) — Failure modes mitigated by virtual memory
- [ADR-018](../../adr/ADR-018-agentic-coding-conventions.md) — State tracker, file size limits, selective loading
- [State Tracker Template](../../memory/session/STATE-TRACKER-TEMPLATE.md) — Working memory format

---

> **Provenance**: Created 2026-03-25. Design document for virtual memory capabilities. Source research: MemGPT/Letta, InfiniteICL, HiAgent from [collapse.md](../../research/collapse.md). Updated 2026-03-25: added §7 (empirical validation protocol), §8 (backup & recovery), model-specific tokenization, distilled entry examples per PR Review Council.
