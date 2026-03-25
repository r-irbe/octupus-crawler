# ADR-019: Ideation & Decision Protocols

| Field | Value |
| --- | --- |
| **Status** | Accepted |
| **Date** | 2026-03-25 |
| **Deciders** | Architecture Council |
| **Relates to** | ADR-014, ADR-015, ADR-018 |

## Context

AI agents and human collaborators in this project must make architectural decisions, evaluate alternatives, and generate creative solutions. Research on brainstorming science, AI reasoning frameworks, multi-agent debate pathologies, and human–AI complementarity (see [docs/research/ideating.md](../research/ideating.md)) reveals that classic group brainstorming is empirically inferior to structured alternatives, that AI reasoning architectures have measurable trade-offs, and that human–AI complementarity is large in theory but underrealized due to sycophancy, overconfidence, and poor role design.

## Decision Drivers

- Anti-sycophancy: LLMs agree with user priors ~78.5% of the time under pushback, functioning as confirmation bias at machine speed
- Structured ideation outperforms unstructured: Brainwriting produces higher quantity and quality than verbal brainstorming
- Reasoning framework selection: CoT, ToT, GoT, and SPIRAL have distinct accuracy/cost/latency profiles requiring deliberate choice
- Human–AI complementarity gap: realized collaboration effect is typically a small fraction of theoretical potential due to overconfidence
- Incubation is not optional: neuroscience shows DMN activity during disengagement produces qualitatively different insights

## Decision

### 1. Anti-Sycophancy Protocol

LLM sycophancy persistence rate is ~78.5% — when pushed back on a correct answer, models revert to agreement four out of five times. All agent interactions involving evaluation or recommendation must apply anti-sycophancy measures:

- **Explicit dissent instructions**: "Steelman the opposing position. Identify the three strongest arguments against this approach"
- **Persona priming**: Assign agents specific critical roles with institutional authority rather than generic "helpful assistant" framing
- **Structural role separation**: Never generate and evaluate in the same prompt or session
- **Citation-based rebuttals**: Require evidence-backed counter-arguments; never ask "Is this correct?"
- **Anti-sycophancy in system prompts**: All agent definitions include anti-sycophancy stance

The PR Review Council's Devil's Advocate and Skeptic voting roles operationalize this — they are structurally required to oppose, not optionally invited to critique.

### 2. Reasoning Framework Selection

Agents must select the appropriate reasoning framework based on task characteristics:

| Task Type | Framework | Rationale |
| --- | --- | --- |
| Questions with clear answers | Chain-of-Thought (CoT) | Fast, low cost, sufficient accuracy |
| Architectural comparisons with branching | Tree of Thoughts (ToT) | Explores alternatives explicitly, enables backtracking |
| Complex multi-step problems with feedback | Graph of Thoughts (GoT) | Merges, reinforces, and revises reasoning nodes |
| Extended autonomous research | SPIRAL/MCTS-style | Planner + Critic + Simulator tri-agent search |
| High-stakes design decisions | Multi-agent debate with role diversity | Counters Degeneration of Thought via structured opposition |

Key constraint: ToT does **not** consistently outperform simpler methods after controlling for compute budget. Larger models excel at generating thoughts but not at discriminating which branches are worth pursuing. Use ToT only when the evaluation function is well-defined (e.g., "does this pattern satisfy all ADR-009 resilience requirements?").

### 3. Multi-Agent Debate Safeguards

Multi-agent debate (MAD) suffers from "disagreement collapse" — agents converge prematurely on whichever position is stated most confidently. Safeguards:

- **Explicit, distinct roles**: Proponent, Critic, Red Team, Synthesizer — never free-form debate
- **Diverse perspectives**: Different system prompts with opposing priors force genuine diversity
- **Minimum critique requirement**: Agents must provide a minimum number of critiques before any agreement
- **Confidence-weighted voting**: Final synthesis uses confidence-weighted votes, not majority rule
- **Bounded debate depth**: Extended rounds entrench initial errors; cap at 3 rounds matching ADR-018's retry semantics
- **Minority correction asymmetry**: Agents are more likely to maintain a correct minority position than to correct an incorrect consensus — design for this by giving minority positions explicit protected time

### 4. Structured Ideation Methods

Replace unstructured brainstorming with evidence-based alternatives:

| Method | When to Use | Key Mechanism |
| --- | --- | --- |
| Brainwriting 6-3-5 | Any group ideation, especially distributed | Parallel written rotation eliminates production blocking and evaluation apprehension |
| Six Thinking Hats | Architecture reviews, ADR deliberation | Parallel perspective switching; Green Hat for creativity, Black Hat for critique |
| SCAMPER | Feature generation, API design | Structured attribute manipulation (Substitute, Combine, Adapt, Modify, Put to use, Eliminate, Reverse) |
| Pre-mortem | High-stakes decisions (K8s, IaC, data layer) | Working backward from imagined failure to surface hidden risks |
| Opportunity Solution Tree | Ongoing product discovery | Outcome → Opportunities → Solutions → Experiments hierarchy |

For the PR Review Council: Round 1 (Analysis) is analogous to Brainwriting — specialists generate findings in parallel without influencing each other. Round 2 (Deliberation) applies Six Thinking Hats implicitly through the voting roles.

### 5. Human–AI Collaboration Design

Complementarity potential is rarely realized because humans rely on their own judgment where AI is superior, and vice versa. Design explicit role boundaries:

**Assign to AI**:
- Generating exhaustive option spaces (combinatorial breadth)
- Cross-domain synthesis (patterns from unrelated domains)
- Devil's advocate with anti-sycophancy instruction
- Consistency checking against requirements and ADRs
- Precedent retrieval (what did industry leaders do?)
- Generating counterexamples to proposed solutions

**Assign to human**:
- Value-laden trade-off decisions (cost vs. performance vs. team capability)
- Organizational context and political feasibility
- Embodied domain knowledge not in training data
- Final prioritization and commitment
- Detecting surface-plausible but subtly wrong AI output
- Problem framing before AI generation begins

**Boundary (both required)**:
- Evaluation of candidates against requirements (AI scores, human spot-checks)
- Assumption surfacing (AI lists, human validates)
- Risk identification (AI generates taxonomy, human weights for context)

### 6. Mandatory Incubation

Neuroscience research confirms DMN (Default Mode Network) activity during disengagement produces qualitatively different idea connections than sustained focused work. REM sleep provides the most powerful incubation.

**Rule**: Never conduct evaluation and selection in the same session as generation. Generate options in session N; evaluate in session N+1. This applies to:
- ADR creation: generate alternatives in one session, decide in the next
- Architecture reviews: generate findings in Round 1, deliberate in Round 2 (already structurally enforced by the Ralph-Loop)
- Spec-Driven Development: spec.md review should have at least one incubation gap before plan.md

### 7. Decision Logging

Record the full idea space, not just the chosen option:

- **What options were considered** and why each was rejected
- **Assumptions** that drove the decision (explicitly tracked for future invalidation)
- **Confidence level** at time of decision
- **Dissenting positions** preserved — these become valuable when requirements change

This maps to the ADR template's "Alternatives Considered" section and the PR Council's rejected findings documentation.

## Consequences

### Positive

- Anti-sycophancy protocols counter the 78.5% agreement persistence rate
- Structured ideation methods produce measurably more and better ideas than unstructured brainstorming
- Reasoning framework selection optimizes accuracy/cost/latency per task type
- Mandatory incubation leverages neuroscience for higher-quality decisions
- Decision logging preserves the full option space for future change

### Negative

- Anti-sycophancy prompts add token overhead to every evaluation interaction
- Mandatory incubation slows the decision pipeline (by design)
- Structured methods require facilitator skill or prompt engineering
- Human–AI role boundaries require discipline to maintain

### Risks

- Anti-sycophancy overcompensation could make agents contrarian rather than accurate
- Incubation mandate may be skipped under time pressure (mitigated: enforce structurally via round separation)
- Reasoning framework selection adds cognitive overhead to task planning

## Evidence

- Brainwriting vs. verbal brainstorming: consistent quantity gains (t > 2.00, df = 54)
- Sycophancy persistence rate: ~78.5% across contexts and models (SycEval 2025)
- Multi-agent disagreement collapse: accuracy lower than single-agent baselines with higher token costs (arXiv 2509.23055)
- ToT vs. simpler methods: not consistently better after controlling for compute (arXiv 2410.17820)
- SPIRAL: +16pp over next best baseline on DailyLifeAPIs (arXiv 2512.23167)
- Human–AI complementarity gap: realized CE is small fraction of theoretical CP (EJIS 2025)
- DMN incubation: mind-wandering during disengagement predicts creative improvement magnitude
- Six Thinking Hats Green Hat: highest originality; time pressure amplifies effect
- CONSENSAGENT: state-of-the-art across 6 reasoning benchmarks by sustaining productive disagreement (ACL 2025)
- Minority correction asymmetry: agents maintain correct minority positions but fail to correct incorrect consensus (arXiv 2511.07784)

## Validation

- PR Council reviews include explicit anti-sycophancy checks (Devil's Advocate and Skeptic roles active)
- ADR proposals include "Alternatives Considered" with rejection reasoning (decision logging)
- Architecture sessions separate generation from evaluation (incubation mandate)
- Agent definitions include anti-sycophancy stance in system prompts
- Reasoning framework is explicitly stated in Research Agent output format

## Related

- [ADR-014: Automation Strategy](ADR-014-automation-strategy.md) — Pipeline orchestration, event-driven architecture
- [ADR-015: Application Architecture](ADR-015-application-architecture-patterns.md) — Architectural decision context
- [ADR-018: Agentic Coding](ADR-018-agentic-coding-conventions.md) — Guard Functions, Atomic Action Pairs, retry semantics
- [ADR-020: Spec-Driven Development](ADR-020-spec-driven-development.md) — Structured ideation as specification input, human-AI collaboration model

---

> **Provenance**: Created 2026-03-25 from analysis of [docs/research/ideating.md](../research/ideating.md). Synthesizes brainstorming science, AI reasoning frameworks, multi-agent debate pathologies, and human–AI complementarity research into enforceable decision-making protocols. Added ADR-020 cross-reference.
