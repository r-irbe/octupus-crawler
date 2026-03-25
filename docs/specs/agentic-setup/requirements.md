# Agentic Setup Improvement — Requirements

> EARS-format requirements for improving AI agent configuration, enforcement, workflows, and collaboration.
> Source: [copilot_claude_code.md](../../research/copilot_claude_code.md), [ai_coding.md](../../research/ai_coding.md), [collapse.md](../../research/collapse.md), [ideating.md](../../research/ideating.md), [spec.md](../../research/spec.md), [2026-03-25-implementation-postmortem.md](../../worklogs/2026-03-25-implementation-postmortem.md)
> Post-mortem root causes addressed: RC-1 (no enforcement), RC-2 (no subagents), RC-3 (prose not checklists), RC-4 (guard functions as SHOULD), RC-5 (no post-task verification), RC-6 (git safety not enforced)

---

## 1. Context File Optimization

**REQ-AGENT-001** (Ubiquitous)
CLAUDE.md shall contain at most 200 lines of human-written content. It shall contain only: exact CLI invocations, project-specific naming conventions, auto-generated file warnings, critical invariants, and three-tier boundary lists. It shall not contain architectural overviews, general TypeScript best practices, or LLM-generated content.

**REQ-AGENT-002** (Ubiquitous)
AGENTS.md shall contain at most 1,000 lines of human-written content. It shall be the canonical source of truth for all AI agent tools and shall not duplicate content from CLAUDE.md or copilot-instructions.md.

**REQ-AGENT-003** (Ubiquitous)
`.github/copilot-instructions.md` shall contain at most 1,000 lines. It shall extend AGENTS.md with Copilot-specific guidance only — no duplication of rules already in AGENTS.md.

**REQ-AGENT-004** (Ubiquitous)
All context files shall use a three-tier boundary system with clearly labeled sections: "Always Do" (actions without asking), "Ask First" (actions requiring confirmation), and "Never Do" (hard prohibitions with zero ambiguity).

**REQ-AGENT-005** (Ubiquitous)
Context files shall use imperative bullet points, not narrative paragraphs. Each directive shall be a single actionable statement. Prose paragraphs explaining rationale shall be in linked ADRs, not inline.

**REQ-AGENT-006** (Ubiquitous)
Modular context loading shall be implemented via: `.claude/rules/*.md` for Claude Code rule files, `.github/instructions/**/*.instructions.md` with `applyTo:` globs for Copilot path-scoped instructions.

**REQ-AGENT-007** (Event-driven)
When a context file exceeds its line limit, the system shall emit a lint warning during CI and the offending content shall be extracted to a linked rule file or instruction file.

### Acceptance Criteria — Context File Optimization

```gherkin
Given CLAUDE.md in the repository
When its line count is measured
Then it shall be ≤ 200 lines
And it shall contain no architectural overview sections
And it shall contain a "Boundaries" section with Always/Ask/Never tiers

Given AGENTS.md in the repository
When its line count is measured
Then it shall be ≤ 1,000 lines
And no section duplicates content from CLAUDE.md or copilot-instructions.md

Given all context files
When reviewed for content type
Then every directive is an imperative bullet point
And rationale paragraphs link to ADR documents
```

---

## 2. Enforcement Mechanisms

**REQ-AGENT-008** (Ubiquitous)
The system shall provide Claude Code hooks in `.claude/settings.json` that enforce Guard Function gates programmatically. A `PreToolUse` hook matching `git commit` shall run `pnpm turbo typecheck && pnpm turbo lint && pnpm turbo test` and block the commit (exit code 2) if any check fails.

**REQ-AGENT-009** (Ubiquitous)
The system shall provide a `PostToolUse` hook matching the `Write` tool that runs `pnpm tsc --noEmit` and feeds type errors back to the agent as stderr.

**REQ-AGENT-010** (Ubiquitous)
The system shall provide a `PreToolUse` hook matching `git push` that verifies the current branch is not `main`. If on `main`, it shall block with exit code 2 and message "Push to main blocked — use feature branch work/`<slug>`".

**REQ-AGENT-011** (Ubiquitous)
The system shall provide a `Stop` hook that verifies: (a) guard functions passed in current session, (b) all changes are committed, (c) state tracker was updated. If any check fails, the hook shall prevent session termination with a diagnostic message.

**REQ-AGENT-012** (Ubiquitous)
All enforcement hooks shall be defined in `.claude/settings.json` committed to version control. Personal overrides shall be in `.claude/settings.local.json` (gitignored).

**REQ-AGENT-013** (Event-driven)
When the agent attempts to write a file that exceeds 300 lines, a `PostToolUse` hook shall emit a warning: "File exceeds 300-line hard limit (MUST #4) — split along responsibility boundaries."

### Acceptance Criteria — Enforcement Mechanisms

```gherkin
Given a Claude Code session with hooks configured
When the agent runs "git commit" without passing guard functions
Then the PreToolUse hook exits with code 2
And the commit is blocked
And the agent receives feedback to run guard functions first

Given a Claude Code session
When the agent pushes to main
Then the PreToolUse hook blocks the push
And the agent receives "use feature branch" feedback

Given a Claude Code session completing work
When the agent attempts to stop
Then the Stop hook verifies guard functions, commits, and state tracker
And prevents termination if any check fails
```

---

## 3. Specification Engineering Workflow

**REQ-AGENT-014** (Ubiquitous)
The agentic workflow shall follow a four-phase gated structure: Brief → Plan → Tasks → Implement. No phase shall begin until the previous phase is explicitly validated by the user.

**REQ-AGENT-015** (Ubiquitous)
The Brief phase shall produce a 1–2 paragraph vision statement with goal, constraints, and success criteria. The agent shall not generate code during this phase.

**REQ-AGENT-016** (Ubiquitous)
The Plan phase shall produce a `plan.md` file via Plan Mode (Claude Code: `Shift+Tab` twice; Copilot: Plan agent mode). The plan shall reference relevant ADRs and existing specs. Multiple plan variations shall be generated and compared before selection.

**REQ-AGENT-017** (Ubiquitous)
The Tasks phase shall decompose the plan into self-contained work packages. Each task shall be: single-concern, test-verifiable, file-scoped (or explicitly multi-file with defined interface boundaries), and complete with "done" criteria traceable to requirements.

**REQ-AGENT-018** (Event-driven)
When requirements change during implementation, the agent shall update the spec first (requirements.md → design.md → tasks.md), then propagate changes to code. The spec shall always reflect what is actually built (living spec).

**REQ-AGENT-019** (Ubiquitous)
Every task prompt shall contain all three dimensions of the Prompts Triangle: (1) functionality and quality — what the feature must do, (2) general solution — architectural strategy, (3) specific solution — file paths, function names, interface contracts.

### Acceptance Criteria — Specification Engineering Workflow

```gherkin
Given a new feature request
When the agent begins work
Then it produces a Brief (1-2 paragraphs) and STOPs for user validation
And no code is generated until the Plan phase is validated
And the Plan references relevant ADRs
And Tasks are traceable to requirements with "done" criteria

Given a requirement change during implementation
When the agent identifies the change
Then it updates specs before modifying code
And the spec reflects the actual implementation state
```

---

## 4. TDD-First Agentic Workflow

**REQ-AGENT-020** (Ubiquitous)
Every implementation task shall follow a RED → GREEN → REFACTOR cycle. Each phase shall have a machine-verifiable success criterion: RED (`pnpm test` exits non-zero with expected failures), GREEN (`pnpm test` exits zero), REFACTOR (`pnpm test` exits zero and `pnpm lint` passes).

**REQ-AGENT-021** (Ubiquitous)
The RED phase agent (test writer) shall have no access to production implementation files. It shall work from the feature specification and interface contracts only.

**REQ-AGENT-022** (Ubiquitous)
The GREEN phase agent (implementer) shall not modify test files. Implementation shall satisfy the existing test contracts.

**REQ-AGENT-023** (Ubiquitous)
The REFACTOR phase agent (quality) shall see the full codebase. Success criterion: `pnpm test` still exits zero, `pnpm lint` passes, no regressions.

**REQ-AGENT-024** (Ubiquitous)
Context isolation between TDD phases shall be enforced. The GREEN agent shall not see the REFACTOR agent's prior work. For Claude Code, this shall use separate subagent sessions or git worktrees. For Copilot, this shall use custom agent handoffs via `.github/chatmodes/`.

**REQ-AGENT-025** (Ubiquitous)
The system shall provide custom agent definitions for TDD phases: `tdd-red.chatmode.md` (test writer), `tdd-green.chatmode.md` (implementer), `tdd-refactor.chatmode.md` (quality). Each shall include a `handoffs` property for sequential workflow.

### Acceptance Criteria — TDD-First Agentic Workflow

```gherkin
Given a new feature implementation
When the RED phase completes
Then all new tests fail for expected reasons
And no production code was generated in this phase

When the GREEN phase completes
Then all tests pass
And no test files were modified

When the REFACTOR phase completes
Then all tests still pass
And lint passes
And no new test failures were introduced
```

---

## 5. Multi-Agent Orchestration

**REQ-AGENT-026** (Ubiquitous)
Tasks touching more than one package shall use the orchestrator–specialist topology: a high-capability orchestrator decomposes tasks and delegates to specialized subagents. The orchestrator shall never generate code directly.

**REQ-AGENT-027** (Ubiquitous)
A single agent shall not implement AND review its own code. Review shall use a separate subagent (Claude Code) or Copilot code review with path-scoped instructions. Exception: single-file changes with explicit user waiver.

**REQ-AGENT-028** (Ubiquitous)
For parallel module implementation, git worktree isolation shall be used. Each subagent shall operate in its own worktree. File changes from one subagent shall not be visible to another until explicit merge.

**REQ-AGENT-029** (Ubiquitous)
Review subagents shall use role differentiation: each reviewer has an explicitly different perspective (security auditor, performance reviewer, API consistency checker). Generic "reviewer" roles are prohibited.

**REQ-AGENT-030** (Ubiquitous)
Review subagents shall perform blind evaluation: the reviewing agent shall see the code but not the implementing agent's stated rationale. Review agents shall be instructed to identify at least one genuine concern before approving (dissent requirement).

**REQ-AGENT-031** (Ubiquitous)
The system shall provide Claude Code skill definitions in `.claude/skills/` for the orchestrator, test writer, implementer, reviewer, and documentation writer roles.

### Acceptance Criteria — Multi-Agent Orchestration

```gherkin
Given a task touching >1 package
When the orchestrator receives the task
Then it decomposes into specialist subtasks
And delegates each to a separate subagent
And never generates code itself

Given a completed implementation
When review is triggered
Then the reviewer is a separate subagent from the implementer
And the reviewer has a specific perspective (not generic)
And the reviewer does not see the implementer's rationale
And the reviewer finds at least one concern before approving
```

---

## 6. Failure Recovery

**REQ-AGENT-032** (Event-driven)
When a guard function fails, the agent shall classify the failure using the structured taxonomy: specification failure, format error, logic failure, or tool/infra failure.

**REQ-AGENT-033** (Event-driven)
When a guard function fails after 3 attempts (1 initial + 2 retries), the agent shall STOP and escalate to the user with: failure classification, attempted fixes, and the specific guard that failed.

**REQ-AGENT-034** (Event-driven)
When a task fails due to specification ambiguity, the agent shall ask clarifying questions rather than proceeding with assumptions. Silent progress on ambiguous requirements is prohibited.

**REQ-AGENT-035** (Event-driven)
When a session exceeds context degradation signals (repeated failures on previously-working code, contradictory actions, inability to locate files it previously read), the agent shall recommend a fresh session with the current spec and failure description as context.

**REQ-AGENT-036** (Event-driven)
When a recovery is needed, the agent shall reduce task scope by 50% and restart with a tighter specification. It shall not attempt the same approach more than twice.

### Acceptance Criteria — Failure Recovery

```gherkin
Given a guard function failure
When the agent classifies the failure
Then it uses one of: specification, format, logic, tool/infra
And applies the taxonomy-specific recovery strategy

Given 3 consecutive guard function failures
When escalation triggers
Then the agent STOPs
And presents: failure type, attempted fixes, specific failing guard

Given an ambiguous requirement
When the agent detects ambiguity
Then it asks a clarifying question
And does not proceed until the user responds
```

---

## 7. CI/CD Integration for Agent PRs

**REQ-AGENT-037** (Ubiquitous)
The CI pipeline shall include a specification validation stage that lints CLAUDE.md, AGENTS.md, and `copilot-instructions.md` for anti-patterns: prose paragraphs without linked ADRs, conflicting priorities without explicit ordering, missing "done" criteria.

**REQ-AGENT-038** (Ubiquitous)
The CI pipeline shall include a TDD gate that blocks agent PRs with less than 80% line coverage and 75% branch coverage on new code.

**REQ-AGENT-039** (Ubiquitous)
The CI pipeline shall include a security scan (Trivy + Semgrep) on all agent-generated diffs. Agent-generated code shall receive heightened scrutiny for injection, hardcoded secrets, and insecure defaults.

**REQ-AGENT-040** (Ubiquitous)
The CI pipeline shall include architecture conformance checks verifying layer boundary compliance and zero circular dependencies on all PRs.

**REQ-AGENT-041** (Ubiquitous)
A GitHub Actions workflow `copilot-agent.yml` shall run on PRs from branches matching `work/*`, `copilot/*`, and `agent/*`. It shall execute: tests, lint, typecheck, security scan, and request Copilot code review.

### Acceptance Criteria — CI/CD Integration

```gherkin
Given an agent-generated PR
When CI runs
Then specification validation checks context files for anti-patterns
And coverage gate enforces ≥80% line / ≥75% branch on new code
And security scan runs on all diffs
And architecture conformance verifies layer boundaries
And the PR is blocked if any gate fails
```

---

## 8. Human–AI Collaboration

**REQ-AGENT-042** (Ubiquitous)
The system shall define three autonomy tiers: Tier 1 (suggestion only — human decides), Tier 2 (constrained edits — human reviews all diffs), Tier 3 (supervised multi-file — human reviews PR). Task assignment shall specify which tier applies.

**REQ-AGENT-043** (Ubiquitous)
Before approving AI-generated code, the human reviewer shall demonstrate they can explain the implementation rationale (review-by-explanation protocol). This shall be documented as a gate in the PR review checklist.

**REQ-AGENT-044** (Ubiquitous)
Gate checkpoints shall have four properties: (1) machine-verifiable exit criterion, (2) bounded review scope with a focused artifact, (3) explicit yes/no commitment recorded in the state tracker, (4) clear rollback path to last stable state.

**REQ-AGENT-045** (Ubiquitous)
The system shall define minimum gate checkpoints for every feature cycle: after specification (before code), after plan (before implementation), after RED phase (before GREEN), after implementation (before merge), after merge (smoke test).

**REQ-AGENT-046** (Event-driven)
When an architectural decision is made by or with an AI agent, an ADR entry explaining "why" shall be created or updated. Chat history shall not serve as the record of architectural decisions.

### Acceptance Criteria — Human–AI Collaboration

```gherkin
Given a feature cycle
When progress reaches a gate checkpoint
Then the gate has a machine-verifiable exit criterion
And the review scope is bounded to a specific artifact
And the human makes an explicit yes/no recorded in the state tracker
And a rollback path is documented

Given an AI-assisted architectural decision
When the decision is finalized
Then an ADR is created or updated
And the decision rationale is not only in chat history
```

---

## 9. Context Architecture (Modular Loading)

**REQ-AGENT-047** (Ubiquitous)
Context shall be loaded hierarchically: global (CLAUDE.md / copilot-instructions.md) → section-level (relevant spec for current task) → file-level (agent discovers via tool calls) → JIT retrieval (fetched at execution time). Global context shall contain only universal constraints.

**REQ-AGENT-048** (Ubiquitous)
Path-scoped instructions shall be defined for each major code area: `src/api/**/*.ts` (API standards), `src/domain/**/*.ts` (domain rules), `src/infra/**/*.ts` (infrastructure patterns), `**/*.test.ts` (testing conventions).

**REQ-AGENT-049** (Ubiquitous)
Computation that can be scripted (date calculations, file moves, pattern matching) shall be implemented as scripts attached to skills, not as natural language instructions. Natural language instructions for deterministic operations are prohibited.

**REQ-AGENT-050** (Ubiquitous)
Claude Code skills in `.claude/skills/` shall use YAML frontmatter defining: name, description, triggers, allowed tools. The execution body shall contain numbered step-by-step instructions with explicit verification steps.

### Acceptance Criteria — Context Architecture

```gherkin
Given a coding task in src/api/
When the agent loads context
Then global context (CLAUDE.md) is loaded
And path-scoped instructions for src/api/**/*.ts are loaded
And the relevant feature spec is loaded for the current task
And file-level context is discovered via tool calls (not pre-loaded)

Given a Claude Code skill definition
When the skill file is inspected
Then it has YAML frontmatter with name, description, triggers, tools
And the body has numbered steps with verification checkpoints
And deterministic operations are scripts, not natural language
```

---

## 10. Anti-Sycophancy and Review Quality

**REQ-AGENT-051** (Ubiquitous)
Multi-agent review workflows shall use structural anti-sycophancy interventions: role differentiation, blind evaluation, dissent requirement, and human commitment gate. Agent consensus alone shall not be sufficient for approval.

**REQ-AGENT-052** (Ubiquitous)
When an agent explains its implementation approach, that explanation shall be validated independently — not just the code. Agents can generate plausible-sounding but incorrect architectural rationale.

**REQ-AGENT-053** (Ubiquitous)
The PR Review Council (6 voting members, >75% consensus) shall include at least one member explicitly tasked with finding problems (adversarial reviewer). Unanimous agreement on the first pass shall trigger additional scrutiny, not immediate approval.

### Acceptance Criteria — Anti-Sycophancy

```gherkin
Given a multi-agent review workflow
When the review completes
Then at least one reviewer had an adversarial perspective
And at least one genuine concern was raised
And the implementing agent's rationale was validated independently
And a human made the final approval decision

Given unanimous first-pass agreement among review agents
When the result is evaluated
Then additional scrutiny is triggered
And a human reviews the consensus for potential sycophancy
```

---

## 11. Context Collapse Prevention

> Source: [collapse.md](../../research/collapse.md) — 10 failure modes in 3 clusters, ACE framework, SSGM, attention basin mechanism

**REQ-AGENT-054** (Ubiquitous)
The system shall enforce a token budget governance policy for context windows. Instructions shall consume ≤5% of the context window, system prompts ≤28%, task/spec context ≤32%, working memory ≤20%, tool outputs ≤10%, and safety margin ≥5%. A context budget linter shall enforce these allocations.

**REQ-AGENT-055** (Ubiquitous)
Critical instructions (boundaries, invariants, guard function requirements) shall be placed at both the start and end of context files to exploit primacy and recency bias in attention mechanisms. Middle sections shall contain reference material that tolerates reduced attention. This positional anti-bias pattern shall be verified by the context file linter.

**REQ-AGENT-056** (Event-driven)
When context utilization exceeds 40% of the window, the system shall trigger intelligent compression using deterministic deduplication (ACE Curator pattern), not LLM-based summarization. LLM-to-LLM context summarization without deterministic deduplication is prohibited — it causes progressive plan fidelity loss.

**REQ-AGENT-057** (Event-driven)
When an agent session exhibits context degradation signals (instruction fade: repeated violations of previously-followed rules; performance cliffs: failures on tasks identical to earlier successes; contradictory actions within the same session), the agent shall checkpoint progress to the state tracker and recommend a fresh session with the current spec and state tracker as context.

**REQ-AGENT-058** (Ubiquitous)
Persona drift shall be monitored via proxy metrics: instruction compliance rate per task, refusal consistency, and boundary violation frequency. When instruction compliance drops below 80% in a sliding window of 5 tasks, the agent shall re-anchor by re-reading the context file boundaries section and acknowledging the constraints before proceeding.

**REQ-AGENT-059** (Ubiquitous)
Long-running sessions shall use a sliding window context strategy with differential snapshots. Only the current task's full context plus compressed summaries of completed tasks shall be in the active window. The state tracker (`docs/memory/session/`) serves as the external memory tier.

**REQ-AGENT-060** (Ubiquitous)
Context file content shall be human-written only. LLM-generated AGENTS.md, CLAUDE.md, or copilot-instructions.md content reduces task success rates by 0.5–2% and increases inference costs ~20% (ETH Zurich, 2026). AI may draft content, but a human shall review and rewrite before committing to context files.

### Acceptance Criteria — Context Collapse Prevention

```gherkin
Given a context file
When its structure is analyzed
Then critical instructions appear in the first and last 10% of the file
And reference material is in the middle sections
And the file is verified as human-written (not LLM-generated)

Given an agent session exceeding 40% context utilization
When compression triggers
Then it uses deterministic deduplication (not LLM summarization)
And plan fidelity is preserved

Given an agent session with declining instruction compliance
When compliance drops below 80% over 5 tasks
Then the agent re-reads boundaries and re-anchors
And if degradation persists, recommends a fresh session
```

---

## 12. OWASP ASI Security for Agents

> Source: [collapse.md](../../research/collapse.md) — OWASP Top 10 for Agentic Systems (ASI), 2026

**REQ-AGENT-061** (Ubiquitous)
Agent memory writes (state tracker updates, memory promotion, session notes) shall pass SSGM gates before persistence: (1) relevance — new entry relates to current task, (2) evidence — entry is grounded in verifiable artifacts (commit hashes, test results, file paths), (3) coherence — entry does not contradict existing memory. Entries failing any gate are rejected with a logged reason.

**REQ-AGENT-062** (Ubiquitous)
Multi-agent communication shall validate message provenance. Each subagent's output shall include: originating agent identity, task scope, artifacts produced (file paths, commit hashes). The orchestrator shall verify claimed artifacts exist before accepting subagent results. This prevents ASI07 (Inter-Agent Trust Exploitation).

**REQ-AGENT-063** (Ubiquitous)
The system shall implement cascade failure prevention (ASI08). Agent task depth shall be bounded: maximum 3 levels of subagent delegation. Each delegation level shall have independent guard function gates. A subagent failure at depth N shall not propagate to depth N-1 without explicit error classification and escalation.

**REQ-AGENT-064** (Ubiquitous)
Tool call results and external data (file contents, web responses, MCP server outputs) shall be treated as untrusted input. Agents shall not execute instructions embedded in tool outputs. Prompt injection defense shall use the isolation pattern: untrusted content is processed for data extraction only, never as command input. This prevents ASI01 (Agent Goal Hijack).

**REQ-AGENT-065** (Ubiquitous)
All agent actions shall be traceable. Every file modification, git operation, and tool invocation shall be logged in the state tracker with: agent identity, timestamp, action type, affected files, and the requirement being addressed. This prevents ASI10 (Agent Untraceability) and enables post-incident audit.

### Acceptance Criteria — OWASP ASI Security

```gherkin
Given an agent attempting to write to the state tracker
When the SSGM gates evaluate the entry
Then relevance, evidence, and coherence checks all pass
And rejected entries are logged with rejection reason

Given a multi-agent workflow
When a subagent reports completion
Then the orchestrator verifies all claimed artifacts exist
And subagent delegation depth never exceeds 3 levels
And a subagent failure does not silently propagate upward

Given tool call results containing instruction-like content
When the agent processes the results
Then it extracts data only
And does not execute embedded instructions
```

---

## 13. Property-Based Testing from Specifications

> Source: [spec.md](../../research/spec.md) — EARS → PBT pipeline, fast-check, PromptPex, property coverage

**REQ-AGENT-066** (Ubiquitous)
EARS requirements shall be systematically translated to property-based test properties using fast-check. Each `shall` clause in a requirement maps to at least one fast-check property. The mapping shall be documented in the test file as a comment referencing the requirement ID (`// Property for REQ-XXX-NNN`).

**REQ-AGENT-067** (Event-driven)
When the system includes prompt-using components (LLM classification, summarization, etc.), PromptPex-style specification testing shall be applied: test cases derived from prompt specifications to verify input/output contracts, edge cases, and failure modes.

**REQ-AGENT-068** (Ubiquitous)
The CI quality gate shall enforce property coverage: ≥85% of EARS `shall` clauses shall have corresponding fast-check properties. Property coverage shall be tracked alongside line/branch coverage and shall be a blocking gate for agent PRs.

**REQ-AGENT-069** (Ubiquitous)
Critical algorithm implementations (rate limiting, circuit breaker state machines, token bucket, sliding window) shall have formal property specifications. Properties shall encode invariants (`forAll` — the property holds for all generated inputs), preconditions, and postconditions derived from the EARS requirements.

### Acceptance Criteria — Property-Based Testing

```gherkin
Given an EARS requirement with a "shall" clause
When test generation runs
Then at least one fast-check property exists for that clause
And the test file contains a comment referencing the requirement ID

Given a CI pipeline run on an agent PR
When property coverage is calculated
Then ≥85% of EARS "shall" clauses have fast-check properties
And the PR is blocked if coverage is below threshold
```

---

## 14. Runtime Constraints and Quality Gates

> Source: [spec.md](../../research/spec.md) — AgentSpec runtime DSL, 5-dimension quality gates, spec drift detection

**REQ-AGENT-070** (Ubiquitous)
Agent operating boundaries shall be defined as runtime-verifiable predicates (AgentSpec pattern). Each predicate shall be a boolean function checkable before/after agent actions: file count bounds, directory scope limits, dependency additions, and API surface changes. Predicates failing shall block the action with a diagnostic message.

**REQ-AGENT-071** (Ubiquitous)
Quality gates for agent PRs shall assess five dimensions: (1) task success — requirements satisfied per acceptance criteria, (2) context preservation — no spec drift between requirements and implementation, (3) P95 latency — guard function chain completes in <60 seconds, (4) safety pass rate — 100% of security scan checks pass, (5) evidence coverage — property + line coverage meet thresholds.

**REQ-AGENT-072** (Ubiquitous)
The CI pipeline shall include a spec drift detection stage. When code changes are made, the corresponding spec (requirements.md, design.md) shall be checked for consistency. API endpoints shall match OpenAPI/TypeSpec contracts. Domain types shall match design.md interfaces. Drift shall block the PR with a diagnostic.

**REQ-AGENT-073** (Ubiquitous)
Specs shall be living documents that reflect what is actually built. When implementation diverges from the spec — deliberately, due to discovered constraints — the spec shall be updated in the same commit as the code change. Stale specs are worse than no specs.

### Acceptance Criteria — Runtime Constraints and Quality Gates

```gherkin
Given an agent PR ready for quality gate evaluation
When the five-dimension gate runs
Then task success, context preservation, latency, safety, and evidence coverage are all assessed
And the PR is blocked if any dimension fails

Given a code change modifying an API endpoint
When spec drift detection runs
Then it verifies the endpoint matches the OpenAPI/TypeSpec contract
And blocks the PR if drift is detected
And the spec update is in the same commit if the change was deliberate
```

---

## 15. Reasoning and Ideation Protocols

> Source: [ideating.md](../../research/ideating.md) — reasoning frameworks, anti-sycophancy (78.5% persistence), incubation mandate, method selection

**REQ-AGENT-074** (Ubiquitous)
Architectural brainstorming sessions shall separate divergent generation from convergent evaluation. Generation prompts shall explicitly prohibit ranking; evaluation prompts shall explicitly require critique. Never generate and evaluate in the same prompt or session.

**REQ-AGENT-075** (Ubiquitous)
For major architectural decisions (framework selection, data model design, infrastructure strategy), an incubation period shall be mandatory between generation and selection. Generate options in session N; evaluate in session N+1 (minimum: sleep on it). This is documented in the state tracker as "INCUBATION: decision X generated, evaluation deferred to next session."

**REQ-AGENT-076** (Ubiquitous)
AI agents in brainstorming roles shall be assigned specific epistemic identities ("distributed systems architect who specializes in failure modes"), not generic roles ("helpful assistant"). Specific role assignment resists sycophantic drift — sycophancy persists at 78.5% even after initial correction without structural intervention.

**REQ-AGENT-077** (Ubiquitous)
The idea space shall be logged, not just the decision. ADRs and design docs shall record what options were considered, why each was rejected, and the assumptions underlying the chosen approach. This assumption-tracking becomes invaluable when requirements change.

**REQ-AGENT-078** (Ubiquitous)
Multi-agent ideation shall use the structured adversarial debate pattern: assign different framings to different agents (standard industry approach, startup optimization, 5-year maintenance perspective). Compare outputs before human synthesis. Single-framing ideation is prohibited for architectural decisions.

### Acceptance Criteria — Reasoning and Ideation

```gherkin
Given a major architectural decision
When ideation begins
Then generation and evaluation are in separate sessions
And an incubation period is documented in the state tracker
And the ADR records considered options, rejections, and assumptions

Given a multi-agent brainstorming workflow
When agents generate options
Then each agent has a specific epistemic identity (not generic)
And at least 3 different framings are used
And the human makes the final synthesis decision
```

---

## 16. Atomic Action Pairs and Token Economics

> Source: [ai_coding.md](../../research/ai_coding.md) — Atomic Action Pairs (+66pp success), Dual-State loop, token budget as architecture, ETH Zurich AGENTS.md study

**REQ-AGENT-079** (Ubiquitous)
Every code generation action shall be paired with an immediate verification action as an atomic unit (Atomic Action Pair pattern). Generate → verify (typecheck/lint/test) shall be treated as one indivisible operation. The agent shall never generate multiple files without intermediate verification. This pattern increases task success rate by 66 percentage points.

**REQ-AGENT-080** (Ubiquitous)
File size shall be treated as a token budget decision, not just a readability concern. A 500-line TypeScript file consumes 9–10K tokens of context. The 200-line target (≈4K tokens) and 300-line hard limit (≈6K tokens) shall be enforced as token budget constraints, not style preferences.

**REQ-AGENT-081** (Ubiquitous)
The agentic code loop shall follow the Dual-State pattern: spec → plan → task → generate → guard chain → commit (success) or retry with reduced scope (failure). Each state transition shall be explicit and logged in the state tracker. The agent shall never skip from spec directly to generate.

**REQ-AGENT-082** (Ubiquitous)
Vertical Slice Architecture (VSA) shall be the default feature organization pattern. Each feature slice shall be self-contained with handler, service, schema, types, and tests co-located. VSA produces 44% smaller PRs and reduces cross-feature coupling.

### Acceptance Criteria — Atomic Action Pairs and Token Economics

```gherkin
Given an agent generating code
When a file is written
Then an immediate verification (typecheck) follows before the next file write
And no multi-file generation occurs without intermediate verification

Given the agent planning file structure
When file boundaries are decided
Then the 200-line target and 300-line limit are justified as token budget constraints
And each file consumes ≤6K tokens of context

Given a feature implementation
When the agentic code loop runs
Then it follows spec → plan → task → generate → guard → commit/retry
And each state transition is logged in the state tracker
```

---

## 17. Spec Authorship and Lifecycle

> Gap: No agent or skill explicitly owns spec creation. Architect handles "design" but not the full requirements.md → design.md → tasks.md pipeline. Gate G3 reads specs but nothing writes them.
> Source: [spec.md](../../research/spec.md) — asymmetric authorship model, Kiro/Spec Kit collaborative workflow, living specs

**REQ-AGENT-083** (Ubiquitous)
The Architect agent shall own specification creation as an explicit responsibility. Before any implementation begins, the Architect shall produce the three-document spec (requirements.md, design.md, tasks.md) following the EARS format (ADR-020). The spec creation phase is a mandatory prerequisite for Stage 4 (Implement) in the development lifecycle pipeline.

**REQ-AGENT-084** (Ubiquitous)
A dedicated spec-writer skill shall exist for both Claude Code (`.claude/skills/spec-writer/SKILL.md`) and Copilot (`.github/chatmodes/spec-writer.chatmode.md`). The skill shall implement the collaborative authorship model: AI drafts, human validates at each gate (requirements → design → tasks). No document shall advance to the next phase without explicit user approval.

**REQ-AGENT-085** (Ubiquitous)
Spec authorship shall follow the asymmetric model: humans own the "what" (requirements, constraints, acceptance criteria), AI assists with drafting EARS syntax, design architecture, and task decomposition. The human shall frame the problem before AI generation begins. AI-generated spec content shall be reviewed and rewritten by the human before serving as implementation input.

**REQ-AGENT-086** (Event-driven)
When a new feature request arrives, the development lifecycle pipeline Stage 2 (Design) shall trigger the spec-writer skill automatically. The stage shall not complete until: (a) requirements.md exists with EARS requirements and acceptance criteria, (b) design.md exists with architecture and interfaces, (c) tasks.md exists with dependency-ordered implementation tasks, (d) all three documents are validated by the user.

**REQ-AGENT-087** (Event-driven)
When implementation diverges from the spec during coding, the Implementation agent shall signal the Architect agent to update the spec before proceeding. The spec update and the code change shall be in the same commit. The Implementation agent shall never update specs directly — spec ownership remains with the Architect.

**REQ-AGENT-088** (Ubiquitous)
The Architect agent definition in `docs/agents/architect.md` shall list spec creation (requirements.md, design.md, tasks.md) as an explicit capability in its "Can Do" column. The orchestration protocol shall route `feature.new` and `feature.change` events to the Architect for spec creation before routing to Implementation.

### Acceptance Criteria — Spec Authorship

```gherkin
Given a new feature request
When the Gateway routes the task
Then the Architect agent is invoked first for spec creation
And requirements.md is produced with EARS requirements
And the user validates requirements before design.md is drafted
And design.md is produced and validated before tasks.md
And tasks.md is produced and validated before implementation begins

Given a spec divergence during implementation
When the Implementation agent detects the divergence
Then it signals the Architect (not updating spec itself)
And the Architect updates the spec
And the spec update is in the same commit as the code change

Given the development lifecycle pipeline
When Stage 2 (Design) runs for a feature
Then the spec-writer skill is invoked
And Stage 2 does not complete until all three documents are validated
```

---

## 18. TypeScript & Architecture Enforcement

> Gap: ADR-016 mandates strict TypeScript and ADR-015 mandates hexagonal architecture, but the agentic workflow documents these as patterns without lint enforcement. arch.md Phase 3 requires layer boundary enforcement. Research coverage: ai_coding.md 62%, missing TypeScript discipline requirements.

**REQ-AGENT-089** (Ubiquitous)
Path-scoped Copilot instructions and Claude rules shall explicitly enforce TypeScript strict mode patterns: `strict: true`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `noImplicitOverride`. Each instruction file for a code area shall include strict mode reminders as the first directive.

**REQ-AGENT-090** (Ubiquitous)
The Zod schema-first pattern shall be enforced in path-scoped instructions for API and config layers. Agents shall be instructed to define the Zod schema before writing handler code. Code reviews shall verify schema-first ordering in all new endpoint implementations.

**REQ-AGENT-091** (Ubiquitous)
Layer boundary compliance shall be lint-enforced, not just documented. ESLint rules shall prevent: `domain/` importing from `infrastructure/`, `infrastructure/` importing from `application/`, and direct infrastructure imports outside composition root. These rules shall be part of `packages/eslint-config/` and run in CI.

**REQ-AGENT-092** (Ubiquitous)
The first import in every service entry point (`main.ts`) shall be the OpenTelemetry initialization (`import './otel'`). An ESLint rule shall enforce this ordering. Violations shall be CI-blocking errors, not warnings.

**REQ-AGENT-093** (Ubiquitous)
Discriminated unions shall use the `_tag` literal field pattern for all variant types in the domain layer. Path-scoped instructions for `packages/core/src/**/*.ts` shall include this as a mandatory pattern with examples.

**REQ-AGENT-094** (Ubiquitous)
The `no-explicit-any` ESLint rule shall be enforced as an error (not warning) across all packages. Path-scoped instructions shall include the alternative pattern: `unknown` + Zod `.parse()` or type narrowing. Agents shall never use `any` as a workaround.

### Acceptance Criteria — TypeScript & Architecture Enforcement

```gherkin
Given a file in packages/core/src/domain/
When it imports from packages/redis/src/infra/
Then the ESLint layer boundary rule fails
And CI blocks the PR

Given a main.ts file in any service
When its import order is analyzed
Then the first import is './otel'
And an ESLint rule verifies this ordering

Given an agent generating code for an API endpoint
When it creates a handler file
Then the Zod schema is defined before the handler function
And the TypeScript strict patterns are followed
```

---

## 19. API Contract & Resilience Enforcement

> Gap: arch.md Phase 5 (API Design) requires contract-first development. Phase 7 (Resilience) requires graceful shutdown, health endpoints, and idempotency. These are documented in AGENTS.md but not lint-enforced or pre-commit verified.

**REQ-AGENT-095** (Ubiquitous)
API development shall follow the contract-first pattern: OpenAPI/TypeSpec contract defined before handler implementation. CI shall include a Spectral lint job that validates all API routes match their contract definitions. Contract drift shall block the PR.

**REQ-AGENT-096** (Ubiquitous)
Every deployable service (`apps/*/`) shall implement a SIGTERM handler that drains in-flight work, closes connections, and flushes telemetry. A pre-merge CI check shall verify the presence of SIGTERM handling in each service entry point.

**REQ-AGENT-097** (Ubiquitous)
Every deployable service shall expose health endpoints: `/health/live` (liveness) and `/health/ready` (readiness). A CI check shall verify these endpoints exist in each service's route configuration. Services without health endpoints shall not pass the architecture conformance gate.

**REQ-AGENT-098** (Ubiquitous)
Resource cleanup for connections, locks, and file handles shall use the TC39 `using` keyword with `Symbol.dispose`. Path-scoped instructions for infrastructure code shall include this as the default cleanup pattern. An ESLint rule shall warn when disposable resources are not acquired with `using`.

**REQ-AGENT-099** (Ubiquitous)
Distributed operations that may be retried (job processing, event handling) shall include idempotency verification. The CI architecture conformance check shall verify that BullMQ job processors implement idempotency keys. Path-scoped instructions for worker code shall include idempotency as a mandatory pattern.

### Acceptance Criteria — API Contract & Resilience Enforcement

```gherkin
Given a new API endpoint implementation
When CI runs the Spectral lint job
Then the endpoint matches its OpenAPI/TypeSpec contract
And drift between contract and code blocks the PR

Given a deployable service in apps/
When CI runs the architecture conformance check
Then the service has SIGTERM handling in its entry point
And /health/live and /health/ready routes exist
And resources use the 'using' keyword for cleanup
```

---

## 20. Security Property Testing

> Gap: REQUIREMENTS-AGNOSTIC §12 identifies 5 security gaps (GAP-SEC-001 to 005) — IPv4-mapped IPv6, CGNAT ranges, DNS rebinding TOCTOU, DNS fail-open, metrics error leaks — none have property tests. The agentic-setup provides property-based testing framework (Phase 15) but no security-specific property generators.

**REQ-AGENT-100** (Ubiquitous)
Security-critical validation logic (SSRF protection, IP validation, DNS resolution) shall have fast-check property test generators. Generators shall cover: IPv4-mapped IPv6 addresses (`::ffff:127.0.0.1`), CGNAT ranges (`100.64.0.0/10`), multicast/broadcast ranges, and DNS rebinding payloads. These generators shall live in `packages/testing/src/generators/`.

**REQ-AGENT-101** (Ubiquitous)
A security properties instruction file (`.github/instructions/security-properties.instructions.md`) shall map each security gap (GAP-SEC-001 to GAP-SEC-005) to required property tests. The instruction file shall apply to `**/*.property.test.ts` and `packages/*/src/**/*.test.ts` files touching security-related modules.

**REQ-AGENT-102** (Ubiquitous)
IP validation shall comply with RFC 6890 (Special-Purpose IP Address Registries). The property specification shall encode all RFC 6890 reserved ranges as inputs that must be rejected. Compliance shall be verified by fast-check properties generating addresses from each reserved range.

### Acceptance Criteria — Security Property Testing

```gherkin
Given the SSRF protection module
When property tests run
Then fast-check generates IPv4-mapped IPv6 addresses and they are blocked
And CGNAT range addresses (100.64.0.0/10) are blocked
And DNS rebinding payloads are detected and rejected
And all RFC 6890 reserved ranges are tested

Given a security-related test file
When the security-properties instruction file applies
Then the agent is guided to include property generators for edge cases
And each property references the gap ID it addresses
```

---

## 21. Advanced Reasoning & Cross-Cutting Enforcement

> Gap: ideating.md 60% coverage — missing reasoning framework selection guidance (CoT vs ToT vs SPIRAL). ai_coding.md 62% — missing test pyramid enforcement. Code provenance (agent attribution) not addressed.

**REQ-AGENT-103** (Ubiquitous)
The orchestration protocol shall include reasoning framework selection guidance: Chain-of-Thought (CoT) for sequential logic debugging, Tree-of-Thought (ToT) for multi-path architectural exploration, SPIRAL/MCTS for optimization decisions with large solution spaces. The agent shall select the framework before beginning ideation and log the selection in the state tracker.

**REQ-AGENT-104** (Ubiquitous)
Human-AI task allocation shall be reviewed periodically for complementarity. Tasks requiring creativity, ethical judgment, and novel problem framing shall be human-led. Tasks requiring consistency, exhaustive search, and pattern application shall be AI-led. The allocation shall be documented in the feature spec's tasks.md.

**REQ-AGENT-105** (Ubiquitous)
The CI pipeline shall measure and enforce test pyramid breakdown: ≥65% unit tests, ≥20% integration tests, ≥10% contract/API tests, ≤5% e2e tests (by test count per category). A CI job shall classify tests by directory convention (`*.unit.test.ts`, `*.integration.test.ts`, `*.contract.test.ts`, `*.e2e.test.ts`) and report the breakdown. Violation shall be a non-blocking warning for the first 3 months, then blocking.

**REQ-AGENT-106** (Ubiquitous)
Agent-generated commits shall include provenance metadata in the commit trailer: `Agent: <agent-name>`, `Requirement: <REQ-ID>`, `Tool: <copilot|claude-code>`. This enables post-incident audit of which agent produced which code. The commit hook shall verify trailer presence for commits on `work/*` branches.

### Acceptance Criteria — Advanced Reasoning & Cross-Cutting Enforcement

```gherkin
Given an architectural decision requiring ideation
When the agent begins brainstorming
Then it selects a reasoning framework (CoT/ToT/SPIRAL) before generating
And logs the framework selection in the state tracker

Given a CI pipeline run
When test pyramid analysis runs
Then tests are classified by naming convention
And the breakdown is reported (unit/integration/contract/e2e)
And the target ratios are checked

Given an agent commit on a work/* branch
When the commit is created
Then it includes Agent, Requirement, and Tool trailers
And the commit hook verifies trailer presence
```

---

## Requirement Count Summary

| Domain | Count |
| --- | --- |
| Context File Optimization (REQ-AGENT-001 to 007) | 7 |
| Enforcement Mechanisms (REQ-AGENT-008 to 013) | 6 |
| Specification Engineering (REQ-AGENT-014 to 019) | 6 |
| TDD-First Workflow (REQ-AGENT-020 to 025) | 6 |
| Multi-Agent Orchestration (REQ-AGENT-026 to 031) | 6 |
| Failure Recovery (REQ-AGENT-032 to 036) | 5 |
| CI/CD Integration (REQ-AGENT-037 to 041) | 5 |
| Human–AI Collaboration (REQ-AGENT-042 to 046) | 5 |
| Context Architecture (REQ-AGENT-047 to 050) | 4 |
| Anti-Sycophancy (REQ-AGENT-051 to 053) | 3 |
| Context Collapse Prevention (REQ-AGENT-054 to 060) | 7 |
| OWASP ASI Security (REQ-AGENT-061 to 065) | 5 |
| Property-Based Testing (REQ-AGENT-066 to 069) | 4 |
| Runtime Constraints & Quality Gates (REQ-AGENT-070 to 073) | 4 |
| Reasoning & Ideation (REQ-AGENT-074 to 078) | 5 |
| Atomic Actions & Token Economics (REQ-AGENT-079 to 082) | 4 |
| Spec Authorship & Lifecycle (REQ-AGENT-083 to 088) | 6 |
| TypeScript & Architecture Enforcement (REQ-AGENT-089 to 094) | 6 |
| API Contract & Resilience Enforcement (REQ-AGENT-095 to 099) | 5 |
| Security Property Testing (REQ-AGENT-100 to 102) | 3 |
| Advanced Reasoning & Cross-Cutting (REQ-AGENT-103 to 106) | 4 |
| **Total** | **106** |

---

## Post-Mortem Traceability

| Root Cause | Requirements Addressing It |
| --- | --- |
| RC-1: No enforcement mechanism | REQ-AGENT-008 to 013, REQ-AGENT-070 |
| RC-2: No subagents launched | REQ-AGENT-026 to 031, REQ-AGENT-062, REQ-AGENT-063 |
| RC-3: Aspirational prose, not checklists | REQ-AGENT-001 to 007, REQ-AGENT-047 to 050, REQ-AGENT-055, REQ-AGENT-060 |
| RC-4: Guard Functions as SHOULD | REQ-AGENT-008, REQ-AGENT-020, REQ-AGENT-079 |
| RC-5: No post-task verification | REQ-AGENT-011, REQ-AGENT-044, REQ-AGENT-045, REQ-AGENT-065, REQ-AGENT-071 |
| RC-6: Git safety not enforced | REQ-AGENT-010, REQ-AGENT-041 |

### Research-Derived Traceability

| Research Finding | Requirements Addressing It |
| --- | --- |
| Context rot: 113K→300 tokens = 30% accuracy gain (collapse.md) | REQ-AGENT-054, REQ-AGENT-056, REQ-AGENT-059 |
| Attention basin: primacy/recency bias is structural (collapse.md) | REQ-AGENT-055 |
| Persona drift: interceptable via proxy metrics (collapse.md) | REQ-AGENT-058 |
| SSGM: 3-gate memory governance (collapse.md) | REQ-AGENT-061 |
| OWASP ASI Top 10 threat model (collapse.md) | REQ-AGENT-061 to 065 |
| ACE: deterministic Curator prevents brevity collapse (collapse.md) | REQ-AGENT-056 |
| ETH Zurich: LLM-generated context files reduce success (ai_coding.md) | REQ-AGENT-060 |
| Atomic Action Pairs: +66pp success rate (ai_coding.md) | REQ-AGENT-079 |
| VSA: 44% smaller PRs (ai_coding.md) | REQ-AGENT-082 |
| Token budget as architecture constraint (ai_coding.md) | REQ-AGENT-080 |
| Dual-State agentic code loop (ai_coding.md) | REQ-AGENT-081 |
| Sycophancy persistence: 78.5% after correction (ideating.md) | REQ-AGENT-076, REQ-AGENT-078 |
| Incubation mandate: neuroscience-backed (ideating.md) | REQ-AGENT-075 |
| EARS → PBT property derivation (spec.md) | REQ-AGENT-066 to 069 |
| AgentSpec runtime predicates: >90% unsafe prevention (spec.md) | REQ-AGENT-070 |
| 5-dimension quality gate framework (spec.md) | REQ-AGENT-071 |
| Spec drift detection (spec.md) | REQ-AGENT-072, REQ-AGENT-073 |
| Property coverage > code coverage (spec.md) | REQ-AGENT-068 |
| Asymmetric authorship: human owns spec, AI assists (spec.md) | REQ-AGENT-083 to 088 |
| Kiro/Spec Kit collaborative spec workflow (spec.md) | REQ-AGENT-084, REQ-AGENT-086 |
| Living specs: spec-code sync in same commit (spec.md) | REQ-AGENT-073, REQ-AGENT-087 |
| No agent owns spec creation (gap analysis) | REQ-AGENT-083, REQ-AGENT-088 |
| TypeScript strict mode discipline (ai_coding.md, ADR-016) | REQ-AGENT-089, REQ-AGENT-094 |
| Layer boundary enforcement (arch.md Phase 3, ADR-015) | REQ-AGENT-091, REQ-AGENT-093 |
| OTel first-import (AGENTS.md MUST #9, arch.md Phase 8) | REQ-AGENT-092 |
| Zod schema-first pattern (ADR-011, ADR-016) | REQ-AGENT-090 |
| Contract-first API development (arch.md Phase 5, ADR-017) | REQ-AGENT-095 |
| Graceful shutdown enforcement (arch.md Phase 7, ADR-009) | REQ-AGENT-096 |
| Health endpoint verification (arch.md Phase 7) | REQ-AGENT-097 |
| Resource cleanup `using` keyword (arch.md Phase 3) | REQ-AGENT-098 |
| Idempotency verification (ADR-009, REQUIREMENTS-AGNOSTIC §6) | REQ-AGENT-099 |
| SSRF property testing (REQUIREMENTS-AGNOSTIC §12 GAP-SEC-001 to 005) | REQ-AGENT-100, REQ-AGENT-101, REQ-AGENT-102 |
| Reasoning framework selection (ideating.md) | REQ-AGENT-103 |
| Human-AI complementarity (ai_coding.md, collapse.md) | REQ-AGENT-104 |
| Test pyramid enforcement (ADR-007, REQUIREMENTS-AGNOSTIC §11) | REQ-AGENT-105 |
| Agent code provenance (ai_coding.md, spec.md Agent Trace RFC) | REQ-AGENT-106 |

### Cross-Validation Coverage

| Source Document | Sections Validated | Coverage |
| --- | --- | --- |
| REQUIREMENTS-AGNOSTIC.md | §3–§12 (crawler domain correctly out of scope; §12 gaps → REQ-AGENT-100–102) | 95% |
| arch.md (12 phases) | Phases 1–12 (Phases 3,5,7,8 enforcement gaps → REQ-AGENT-089–099) | 90% |
| code.md | File size, FOOP, VSA, cleanup patterns → REQ-AGENT-080, 082, 098 | 85% |
| ADR-001 to ADR-022 | All 22 ADRs cross-referenced against requirements | 95% |
| copilot_claude_code.md | 46 findings, 39 covered (85%) + new coverage in §18–21 | 92% |
| ai_coding.md | 63 findings, 39+6 covered (71%) via §16, §18, §21 | 80% |
| collapse.md | 54 findings, 32+2 covered (63%) via §11, §14, §18 | 72% |
| ideating.md | 45 findings, 27+2 covered (64%) via §15, §17, §21 | 70% |
| spec.md | 58 findings, 43+2 covered (78%) via §13–17, §20 | 82% |
| Feature specs (13) | All feature specs verified for TDD, PBT, multi-package support | 90% |
| Docs infrastructure | Agents, skills, instructions, automation, conventions validated | 90% |

---

> **Provenance**: Created 2026-03-25. Updated 2026-03-25: added sections 11–16 from research. Updated 2026-03-26: added sections 18–21 (18 new requirements, REQ-AGENT-089 to 106) from cross-validation against all 22 ADRs, REQUIREMENTS-AGNOSTIC.md §12 security gaps, arch.md 12-phase plan, code.md patterns, 13 feature specs, and full docs infrastructure (agents, skills, instructions, automation, conventions, guidelines, memory, patterns). Total: 106 requirements.
