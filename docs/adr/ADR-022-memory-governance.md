# ADR-022: Memory Governance

| Field | Value |
| --- | --- |
| **Status** | Accepted |
| **Created** | 2026-03-25 |
| **Author(s)** | Architecture Council |

## Context

The three-tier memory system (`session/` → `short-term/` → `long-term/`) lacks formal governance over what enters memory, how memories are validated, and when stale entries are evicted. Memory poisoning (OWASP ASI-06) and knowledge contamination (ADR-021 #7, #10) are critical risks. The SSGM framework provides three governance gates for long-term memory writes.

## Decision

### 1. Governance Gates

| Transition | Gate | Criteria | Enforcer |
| --- | --- | --- | --- |
| Observation → Session | **Capture** | Timestamped, task-attributed, includes context | Any agent |
| Session → Short-Term | **Validation** | Evidence required (test, PR, metric, reproduction); generalizable | Documentation Agent |
| Short-Term → Long-Term | **Collation** | Confirmed across ≥2 sessions; consistent with long-term; no contradictions | Gateway Agent |

### 2. SSGM Protocol

Each Validation/Collation write passes three gates:

1. **RELEVANCE**: Learning relevant to architecture, conventions, or patterns?
2. **EVIDENCE**: Concrete evidence exists? (test result, PR finding, production metric)
3. **COHERENCE**: Contradicts existing long-term memory or ADRs? → flag for resolution

Fail any gate → reject (with logged reason) or defer (return to lower tier for more evidence).

### 3. Contradiction Resolution

| Conflict | Resolution |
| --- | --- |
| New vs long-term | Architecture review; no overwrite without resolution |
| New vs short-term | Keep both with conflict marker; resolve at collation |
| New vs ADR | Reject entry — ADRs are authoritative; propose amendment if warranted |
| Old entry outdated | Promote new; archive old with `superseded-by` reference |

### 4. Temporal Decay

| Tier | Retention | Decay Action |
| --- | --- | --- |
| Session | Current session | Archive or discard on session end |
| Short-term | 30 days | No reference in 30d → review: promote or archive |
| Long-term | Permanent | Superseded by ADR/convention → archive with reference |

### 5. Poisoning Prevention (OWASP ASI-06)

- **Source attribution**: Every entry records task, agent, timestamp, evidence type
- **Evidence requirement**: No promotion past Validation Gate without evidence
- **Contradiction detection**: Auto cross-check on promotion
- **Rollback**: Git version control provides audit trail
- **Access control**: Only Documentation Agent and Gateway can promote to long-term

### 6. Virtual Memory (Specification)

For tasks exceeding effective context windows:

| Technique | Reduction | When |
| --- | --- | --- |
| Context distillation (InfiniteICL) | 90% | Multi-task sessions >10 tasks |
| Hierarchical chunking (HiAgent) | 35% | Large codebase navigation |
| State tracker (ADR-018 G4) | Mandatory | Every agent session |
| Selective loading (ADR-018 §5) | Default | All tasks |

Full specs: [docs/specs/virtual-memory/](../specs/virtual-memory/).

## Consequences

**Positive**: Formal gates prevent poisoned/unvalidated memories in long-term; contradiction detection catches contamination; temporal decay bounds growth; virtual memory extends capability.
**Negative**: Three-gate overhead per promotion; decay may discard valid infrequent entries; compression is lossy.

## Validation

- Zero poisoned entries reach long-term (SSGM catches 100%)
- Short-term staleness: <10% exceed 30-day retention without reference
- All long-term memories traceable to source session
- Context distillation maintains >95% accuracy vs full context

## Related

- [ADR-021](ADR-021-context-collapse-prevention.md) — Failure modes #7 (poisoning), #10 (contamination)
- [ADR-018](ADR-018-agentic-coding-conventions.md) — State tracker, context engineering
- [Memory Promotion Workflow](../guidelines/memory-promotion-workflow.md)
- [Documentation Lifecycle](../automation/pipelines/documentation-lifecycle.md)
- [research/collapse.md](../research/collapse.md) — SSGM, poisoning research
