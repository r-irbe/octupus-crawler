# Skill: Evidence Gathering

| Field | Value |
| --- | --- |
| **ID** | `evidence-gathering` |
| **Status** | Active |
| **Created** | 2026-03-24 |
| **Used By** | Research, Review, Architect, Debug |

## Purpose

Systematic methodology for gathering, evaluating, and presenting evidence to support decisions, findings, and recommendations.

## Capabilities

### Evidence Sources

| Source | Method | Confidence |
| --- | --- | --- |
| Codebase | grep_search, semantic_search, read_file | High |
| Tests | Run tests, read test output | High |
| Documentation | Read ADRs, guidelines, memory | High |
| Runtime | Read logs, metrics, traces | High |
| External docs | fetch_webpage (when available) | Medium |
| Agent knowledge | Built-in training data | Medium |
| Inference | Logical deduction from evidence | Varies |

### Evidence Structure

```markdown
#### Evidence: [ID]

- **Claim**: [What this evidence supports or refutes]
- **Source**: [Where the evidence comes from]
- **Confidence**: [High/Medium/Low]
- **Data**: [The actual evidence — code, output, quote]
- **Counter-Evidence**: [Anything that contradicts this]
```

### Methodology

1. **Define the question** clearly before searching
2. **Search broadly** first (semantic search), then narrow (grep)
3. **Verify claims** against at least 2 sources when possible
4. **Present counter-evidence** alongside supporting evidence
5. **State confidence** explicitly for every finding
6. **Cite sources** with file paths and line numbers

## Rules

1. Never present inference as fact — label it clearly
2. Always look for counter-evidence (avoid confirmation bias)
3. State methodology — how was this evidence gathered?
4. Confidence = min(source_reliability, inference_strength)
5. When evidence is insufficient, say so — don't fill gaps with assumptions
6. **Select reasoning framework** per ADR-019 §2: CoT for straightforward analysis, ToT for multi-path exploration, GoT for cross-cutting synthesis
7. **Anti-sycophancy in evaluation** (ADR-019 §1): actively seek disconfirming evidence; never weight a source more highly because it agrees with the leading hypothesis
8. **Mandatory counter-evidence section**: every research output must include counter-evidence even if the conclusion seems obvious

## Related

- [ADR-019: Ideation & Decision Protocols](../adr/ADR-019-ideation-decision-protocols.md) — Reasoning frameworks, anti-sycophancy
- [Research Agent](../agents/research.md) — Primary user
- [Review Agent](../agents/review.md) — Uses during PR council
- [Belief Threshold Instruction](../instructions/belief-threshold.md)

---

> **Provenance**: Created 2026-03-24 as part of the AI agent framework. Updated 2026-03-25: added ADR-019 reasoning framework selection, anti-sycophancy evaluation, and mandatory counter-evidence rules.
