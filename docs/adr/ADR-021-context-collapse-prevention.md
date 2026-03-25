# ADR-021: Context Collapse Prevention

| Field | Value |
| --- | --- |
| **Status** | Accepted |
| **Created** | 2026-03-25 |
| **Author(s)** | Architecture Council |

## Context

AI agents experience progressive degradation as context fills — ten distinct failure modes collectively termed "context collapse" ([research/collapse.md](../research/collapse.md)). ADR-018 §11 provides a summary; this ADR adds systematic detection, governance, and response protocols. The research (2025–2026) has moved from observation to mechanism: the attention basin explains lost-in-the-middle, persona drift is trackable in activation space, and frameworks (ACE, SSGM, HiAgent) offer architectures.

## Decision

### 1. Failure Mode Taxonomy

| # | Mode | Mechanism | Detection | Severity |
| --- | --- | --- | --- | --- |
| 1 | Context rot | Non-linear decay with length | Accuracy drops >10% | Critical |
| 2 | Attention basin | Causal masking neglects middle | Middle instructions ignored | Critical |
| 3 | Instruction fade | System prompts lose influence at 20-40% fill | Agent stops following rules | High |
| 4 | Persona drift | Conversational pressure shifts behavior | Response length deviation >25% | High |
| 5 | Lost-in-the-middle | Middle docs receive least attention | Edge-biased citations | Medium |
| 6 | Safety destabilization | Refusal rates unpredictable at 200K+ | Sudden refusal spikes/drops | High |
| 7 | Memory poisoning | Corrupted retrieval (OWASP ASI-06) | Factual contradictions after retrieval | Critical |
| 8 | Cascading hallucination | Early error propagates downstream | Upstream errors in downstream output | High |
| 9 | Scope creep drift | Agent expands beyond assigned scope | Files modified outside feature folder | Medium |
| 10 | Knowledge contamination | Stale memory overrides current context | Agent follows deprecated patterns | Medium |

### 2. Five-Layer Prevention Stack

| Layer | Strategy | Implementation |
| --- | --- | --- |
| 1. Budget governance | Limit context size | File ≤200 lines; MCP on-demand (ADR-018 §1, §5) |
| 2. Positional anti-bias | Counter attention basin | Critical context at start/end only |
| 3. Compression | Reduce without info loss | State tracker (G4/G7) as external memory |
| 4. Persona anchoring | Resist drift | Agent definitions + anti-sycophancy (ADR-019) |
| 5. Memory governance | Prevent poisoning | Three-tier + SSGM validation gates (ADR-022) |

### 3. Persona Drift Detection

| Metric | Threshold | Response |
| --- | --- | --- |
| Response length trend | >25% from rolling avg | Log warning; Gateway reviews |
| Refusal rate change | >2× or <50% baseline | Pause agent; fresh context restart |
| Task boundary adherence | Files outside scope | Gateway intervenes; revert |
| Instruction following | <80% over 5 tasks | Restart with re-anchored prompt |

### 4. Response Protocol

1. **DETECT**: Metric crosses threshold
2. **LOG**: Record in state tracker (failure mode, value, context)
3. **ASSESS**: Low (log) → Medium (compress context, re-read state) → High (restart session, reload agent definition)
4. **LEARN**: Capture pattern for memory promotion

### 5. Framework Selection

| Framework | Mechanism | Use Case |
| --- | --- | --- |
| ACE (Stanford) | Generator/Reflector/Curator; +10.6% | Agent self-reflection |
| SSGM | Three governance gates | Memory promotion (ADR-022) |
| HiAgent | Hierarchical chunking; 35% reduction | Large codebase navigation |
| InfiniteICL | Context distillation; 90% reduction | Long multi-task sessions |

### 6. OWASP ASI Awareness

| ASI | Risk | Mitigation |
| --- | --- | --- |
| ASI-01 | Prompt injection | Zod validation at all boundaries (ADR-013) |
| ASI-06 | Memory poisoning | Three-tier + SSGM gates (ADR-022) |
| ASI-07 | Cascading failures | Guard Function chain (ADR-018 §2) |
| ASI-08 | Trust boundary violations | Hub-and-spoke orchestration |
| ASI-10 | Misaligned autonomy | 80% belief threshold; user confirmation |

## Consequences

**Positive**: Systematic detection of all 10 modes; actionable response protocol; OWASP ASI mapping; observable proxy metrics.
**Negative**: Monitoring overhead; restart latency; proxy metrics may false-positive.

## Validation

- Drift detection triggers before observable quality loss in >80% of incidents
- Session restart restores >95% instruction-following within 2 tasks
- Zero poisoned memories reach long-term (SSGM gates)
- Context utilization stays <50% of declared window

## Related

- [ADR-018 §11](ADR-018-agentic-coding-conventions.md), [ADR-019](ADR-019-ideation-decision-protocols.md), [ADR-022](ADR-022-memory-governance.md)
- [research/collapse.md](../research/collapse.md)
