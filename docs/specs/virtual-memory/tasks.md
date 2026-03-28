# Virtual Memory — Tasks

> Implementation tasks traceable to [requirements.md](requirements.md). Dependency-ordered.
> Design: [design.md](design.md)

---

## Phase 1: Context Budget Monitor

- [x] **T-VMEM-001**: Implement context budget tracker with cumulative size tracking → REQ-VMEM-016
- [x] **T-VMEM-002**: Implement model-specific token estimation (Claude ~3.5 chars/token, GPT-4 ~4 chars/token, Gemini ~4 chars/token, fallback char/4) → REQ-VMEM-020
- [x] **T-VMEM-003**: Implement effective window calculation (50% of declared window per NoLiMa) → REQ-VMEM-016
- [x] **T-VMEM-004**: Implement 70% utilization warning with compression/restart suggestion → REQ-VMEM-017
- [x] **T-VMEM-005**: Implement threshold event logging (utilization %, loaded files count, token count, recommended action) → REQ-VMEM-021

## Phase 2: Hierarchical Chunking

- [x] **T-VMEM-006**: Implement chunk tree builder (package → feature → file → section) → REQ-VMEM-004
- [x] **T-VMEM-007**: Implement selective chunk loading (chunk + immediate parent context only) → REQ-VMEM-005
- [x] **T-VMEM-008**: Validate 30% context reduction target via benchmark → REQ-VMEM-006

## Phase 3: Context Distillation

- [x] **T-VMEM-009**: Implement task context compressor (extract essential facts and outcomes) → REQ-VMEM-001
- [x] **T-VMEM-010**: Implement distillation metadata recording (original size, distilled size, compression ratio, source task) → REQ-VMEM-003
- [x] **T-VMEM-011**: Validate 80% compression and 95% accuracy targets via empirical protocol (design.md §7) → REQ-VMEM-001, REQ-VMEM-002

## Phase 4: State Tracker Integration

- [x] **T-VMEM-012**: Implement state tracker creation on session start (per ADR-018 G4) → REQ-VMEM-007
- [x] **T-VMEM-013**: Implement state tracker re-read before new task loading → REQ-VMEM-008
- [x] **T-VMEM-014**: Implement state tracker update on task completion (status, decisions, commit hash, persistent context) → REQ-VMEM-009

## Phase 5: Selective Loading

- [x] **T-VMEM-015**: Implement task-scoped file loading (only directly needed files) → REQ-VMEM-010
- [x] **T-VMEM-016**: Implement section-level loading for files >200 lines → REQ-VMEM-011
- [x] **T-VMEM-017**: Implement on-demand schema loading (MCP or targeted read) → REQ-VMEM-012

## Phase 6: Eviction & Paging

- [x] **T-VMEM-018**: Implement eviction trigger at 50% context utilization → REQ-VMEM-013
- [x] **T-VMEM-019**: Implement priority-based eviction (distilled completed tasks → unrelated reference → older tasks) → REQ-VMEM-014
- [x] **T-VMEM-020**: Implement eviction exclusion list (current task files, state tracker, agent definition, instruction set) → REQ-VMEM-015
- [x] **T-VMEM-021**: Implement page-fault reload from disk (file system, state tracker, distilled summary) → REQ-VMEM-018
- [x] **T-VMEM-022**: Implement page-fault logging (what needed, why evicted, reload cost) → REQ-VMEM-019

## Phase 7: Tests

- [x] **T-VMEM-023**: Unit test for token estimation accuracy (within 15% of actual per model) → REQ-VMEM-020
- [x] **T-VMEM-024**: Unit test for effective window calculation → REQ-VMEM-016
- [x] **T-VMEM-025**: Unit test for 70% threshold warning trigger → REQ-VMEM-017
- [x] **T-VMEM-026**: Unit test for threshold event log fields → REQ-VMEM-021
- [x] **T-VMEM-027**: Unit test for chunk tree generation (>50 files) → REQ-VMEM-004
- [x] **T-VMEM-028**: Unit test for selective chunk loading (only chunk + parent) → REQ-VMEM-005
- [x] **T-VMEM-029**: Integration test for context distillation (compression ratio ≥80%) → REQ-VMEM-001
- [x] **T-VMEM-030**: Integration test for distillation accuracy (≥95%) → REQ-VMEM-002
- [x] **T-VMEM-031**: Unit test for distillation metadata recording → REQ-VMEM-003
- [x] **T-VMEM-032**: Unit test for eviction priority ordering → REQ-VMEM-014
- [x] **T-VMEM-033**: Unit test for eviction exclusion list → REQ-VMEM-015
- [x] **T-VMEM-034**: Unit test for page-fault reload and logging → REQ-VMEM-018, REQ-VMEM-019
- [x] **T-VMEM-035**: Scenario test for full session: load → exceed budget → evict → page-fault → reload → REQ-VMEM-013 to 019

---

## Dependencies

| Task | Depends On | Blocks |
| --- | --- | --- |
| Phase 1 (budget monitor) | core-contracts (config schema) | Phases 5, 6 |
| Phase 2 (chunking) | — | Phase 5 |
| Phase 3 (distillation) | — | Phase 6 |
| Phase 4 (state tracker) | ADR-018 conventions | Phase 5 |
| Phase 5 (selective loading) | Phase 1, Phase 2, Phase 4 | Phase 6 |
| Phase 6 (eviction/paging) | Phase 1, Phase 3 | — |
| Phase 7 (tests) | Phases 1-6 | — |

---

> **Provenance**: Created 2026-03-25. Implementation Agent task decomposition per ADR-020. Covers all 21 REQ-VMEM requirements.
