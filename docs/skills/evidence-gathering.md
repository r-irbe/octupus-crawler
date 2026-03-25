# Skill: Evidence Gathering

**Agents**: Research, Review, Architect, Debug

Systematic gathering, evaluation, and presentation of evidence for decisions and findings.

## Sources

| Source | Confidence |
| --- | --- |
| Codebase (grep, semantic search, read) | High |
| Tests (run, read output) | High |
| Documentation (ADRs, guidelines, memory) | High |
| Runtime (logs, metrics, traces) | High |
| External docs (fetch_webpage) | Medium |
| Agent knowledge (training data) | Medium |
| Inference (logical deduction) | Varies |

## Methodology

1. Define the question clearly before searching
2. Search broadly first (semantic), then narrow (grep)
3. Verify claims against ≥2 sources when possible
4. Present counter-evidence alongside supporting evidence
5. State confidence explicitly per finding
6. Cite sources with file paths and line numbers
7. Select reasoning framework per ADR-019: CoT (linear), ToT (branching), GoT (cross-cutting)

## Rules

1. Never present inference as fact — label clearly
2. Always seek counter-evidence (avoid confirmation bias, ADR-019 §1)
3. State methodology — how was evidence gathered?
4. Confidence = min(source reliability, inference strength)
5. When evidence insufficient, say so — don't fill gaps with assumptions
6. Every research output must include counter-evidence section

## Related

- [ADR-019](../adr/ADR-019-ideation-decision-protocols.md), [Research Agent](../agents/research.md)
