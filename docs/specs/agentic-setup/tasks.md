# Agentic Setup Improvement — Tasks

> Implementation tasks traceable to [requirements.md](requirements.md). Dependency-ordered.
> Design: [design.md](design.md)
> Research: [copilot_claude_code.md](../../research/copilot_claude_code.md), [ai_coding.md](../../research/ai_coding.md), [collapse.md](../../research/collapse.md), [ideating.md](../../research/ideating.md), [spec.md](../../research/spec.md)

---

## MVP Critical Path

> **Problem**: 109 tasks across 24 phases creates analysis paralysis. Not all phases are needed to start gaining value.
> **Solution**: Phase 0 bootstraps the minimum viable agentic setup. Tasks marked `[MVP]` form the critical path — implement these first.
> The remaining tasks are enhancements that increase coverage, automation, and enforcement progressively.

## Phase 0: Bootstrap (prerequisite for all other phases)

> Solves the chicken-and-egg problem: the spec requires tooling that doesn't exist yet. Phase 0 creates the minimum viable infrastructure for agents to operate safely.

- [x] **T-AGENT-000a** `[MVP]`: Create `.claude/settings.json` with a single PreToolUse hook blocking `git push` to `main` → REQ-AGENT-010 (minimal safety)
- [x] **T-AGENT-000b** `[MVP]`: Add three-tier boundary section (Always Do / Ask First / Never Do) to existing AGENTS.md — do NOT restructure, just append → REQ-AGENT-004
- [x] **T-AGENT-000c** `[MVP]`: Create `docs/memory/session/STATE-TRACKER-TEMPLATE.md` if it doesn't exist → REQ-AGENT-065 (traceability)
- [x] **T-AGENT-000d** `[MVP]`: Create `.gitignore` entry for `.claude/settings.local.json` → REQ-AGENT-012
- [x] **T-AGENT-000e** `[MVP]`: Verify `pnpm turbo typecheck && pnpm turbo lint && pnpm turbo test` works from repo root → prereq for all guard functions

> **Exit criterion**: Agent can operate with branch protection, boundary awareness, and state tracking. Total effort: ~30 minutes.

## Phase 1: Context File Restructuring

- [x] **T-AGENT-001** `[MVP]`: Audit CLAUDE.md — remove architectural overviews, general TS practices, LLM-generated content. Restructure to: CLI commands, naming conventions, critical invariants, three-tier boundaries. Target ≤200 lines → REQ-AGENT-001, REQ-AGENT-004, REQ-AGENT-005
- [x] **T-AGENT-002** `[MVP]`: Audit AGENTS.md — remove CLAUDE.md duplication, replace prose rationale with ADR links, add three-tier boundary section. Target ≤1,000 lines → REQ-AGENT-002, REQ-AGENT-004, REQ-AGENT-005
- [x] **T-AGENT-003**: Audit `.github/copilot-instructions.md` — remove AGENTS.md duplication, add three-tier boundary section, ensure Copilot-specific content only. Target ≤1,000 lines → REQ-AGENT-003, REQ-AGENT-004, REQ-AGENT-005

## Phase 2: Path-Scoped Instructions (Copilot)

- [x] **T-AGENT-004**: Create `.github/instructions/api-layer.instructions.md` with `applyTo: "apps/api-gateway/src/**/*.ts"` — API handler standards, Zod validation, error response rules → REQ-AGENT-006, REQ-AGENT-048
- [x] **T-AGENT-005**: Create `.github/instructions/domain-layer.instructions.md` with `applyTo: "packages/core/src/**/*.ts"` — neverthrow, pure functions, no infra imports → REQ-AGENT-006, REQ-AGENT-048
- [x] **T-AGENT-006**: Create `.github/instructions/infra-layer.instructions.md` with `applyTo: "packages/*/src/infra/**/*.ts"` — Testcontainers, circuit breakers, connection cleanup → REQ-AGENT-006, REQ-AGENT-048
- [x] **T-AGENT-007**: Create `.github/instructions/test-files.instructions.md` with `applyTo: "**/*.test.ts"` — Vitest conventions, no mocks for infra, co-location → REQ-AGENT-006, REQ-AGENT-048
- [x] **T-AGENT-008**: Create `.github/instructions/config-files.instructions.md` with `applyTo: "packages/config/src/**/*.ts"` — Zod schema-first, Result return, narrow types → REQ-AGENT-006, REQ-AGENT-048

## Phase 3: Claude Code Rules (Modular)

- [x] **T-AGENT-009**: Create `.claude/rules/code-style.md` — TypeScript strict conventions, naming, file size limits → REQ-AGENT-006, REQ-AGENT-047
- [x] **T-AGENT-010**: Create `.claude/rules/testing.md` — Vitest, Testcontainers, TDD cycle, coverage thresholds → REQ-AGENT-006, REQ-AGENT-047
- [x] **T-AGENT-011**: Create `.claude/rules/security.md` — SSRF, Zod validation, no secrets, error message rules → REQ-AGENT-006, REQ-AGENT-047
- [x] **T-AGENT-012**: Create `.claude/rules/git-workflow.md` — Feature branches, conventional commits, guard functions before commit → REQ-AGENT-006, REQ-AGENT-047

## Phase 4: Claude Code Enforcement Hooks

- [x] **T-AGENT-013** `[MVP]`: Create `.claude/settings.json` with PreToolUse hook: block `git commit` unless guard functions pass → REQ-AGENT-008
- [x] **T-AGENT-014** `[MVP]`: Add PreToolUse hook: block `git push` to `main` branch → REQ-AGENT-010
- [x] **T-AGENT-015**: Add PostToolUse hook: run `pnpm tsc --noEmit` after Write tool → REQ-AGENT-009
- [x] **T-AGENT-016**: Add PostToolUse hook: warn on file >300 lines after Write tool → REQ-AGENT-013
- [x] **T-AGENT-017**: Add Stop hook: verify guard functions, commits, state tracker before session end → REQ-AGENT-011
- [x] **T-AGENT-018**: Add `.claude/settings.local.json` to `.gitignore` → REQ-AGENT-012

## Phase 5: Claude Code Skills

- [x] **T-AGENT-019** `[MVP]`: Create `.claude/skills/tdd-cycle/SKILL.md` — RED→GREEN→REFACTOR with context isolation, verification steps → REQ-AGENT-020 to 024, REQ-AGENT-050
- [x] **T-AGENT-020** `[MVP]`: Create `.claude/skills/guard-functions/SKILL.md` — scripted typecheck+lint+test chain with retry logic → REQ-AGENT-008, REQ-AGENT-049, REQ-AGENT-050
- [x] **T-AGENT-021**: Create `.claude/skills/plan-feature/SKILL.md` — four-phase gated workflow (Brief→Plan→Tasks→Implement) → REQ-AGENT-014 to 017, REQ-AGENT-050
- [x] **T-AGENT-022**: Create `.claude/skills/review-code/SKILL.md` — multi-perspective review with anti-sycophancy, dissent requirement → REQ-AGENT-029, REQ-AGENT-030, REQ-AGENT-051 to 053
- [x] **T-AGENT-023**: Create `.claude/skills/orchestrate/SKILL.md` — multi-package task decomposition and specialist delegation → REQ-AGENT-026 to 028, REQ-AGENT-031

## Phase 6: Claude Code Commands

- [x] **T-AGENT-024**: Create `.claude/commands/preflight.md` — `/project:preflight` runs all pre-flight gates (G1–G4) → REQ-AGENT-014, REQ-AGENT-044
- [x] **T-AGENT-025**: Create `.claude/commands/post-task.md` — `/project:post-task` runs post-task checklist (G5–G7) → REQ-AGENT-044, REQ-AGENT-045

## Phase 7: Copilot Custom Agents (Chat Modes)

- [x] **T-AGENT-026**: Create `.github/agents/tdd-red.agent.md` — test writer with handoff to tdd-green → REQ-AGENT-025 — *format changed: agents not chatmodes*
- [x] **T-AGENT-027**: Create `.github/agents/tdd-green.agent.md` — implementer with handoff to tdd-refactor → REQ-AGENT-025
- [x] **T-AGENT-028**: Create `.github/agents/tdd-refactor.agent.md` — quality agent (terminal phase) → REQ-AGENT-025

## Phase 8: Copilot Prompt Templates

- [x] **T-AGENT-029**: Create `.github/prompts/plan-feature.prompt.md` — feature planning template with ADR references → REQ-AGENT-016, REQ-AGENT-019
- [x] **T-AGENT-030**: Create `.github/prompts/review-pr.prompt.md` — PR review template with review-by-explanation protocol → REQ-AGENT-043, REQ-AGENT-052

## Phase 9: CI/CD Pipeline

- [x] **T-AGENT-031** `[MVP]`: Create `.github/workflows/agent-pr-validation.yml` — guard functions job (typecheck, lint, test) → REQ-AGENT-041
- [x] **T-AGENT-032**: Add coverage-gate job to agent-pr-validation.yml (≥80% line, ≥75% branch) → REQ-AGENT-038
- [x] **T-AGENT-033**: Add security-scan job (Trivy + Semgrep) to agent-pr-validation.yml → REQ-AGENT-039
- [x] **T-AGENT-034**: Add context-file-lint job (line count enforcement) to agent-pr-validation.yml → REQ-AGENT-007, REQ-AGENT-037
- [x] **T-AGENT-035**: Add architecture-conformance job (circular deps, layer boundaries) to agent-pr-validation.yml → REQ-AGENT-040

## Phase 10: Failure Recovery Documentation

- [x] **T-AGENT-036**: Add failure taxonomy reference to `.claude/rules/` — classification guide (specification, format, logic, tool/infra) with recovery strategies → REQ-AGENT-032
- [x] **T-AGENT-037**: Add escalation protocol to AGENTS.md — 3-attempt limit, STOP conditions, user escalation format → REQ-AGENT-033, REQ-AGENT-036
- [x] **T-AGENT-038**: Add ambiguity detection protocol to AGENTS.md — explicit instruction to ask clarifying questions, not proceed silently → REQ-AGENT-034
- [x] **T-AGENT-039**: Add context degradation signals to CLAUDE.md — when to recommend fresh session → REQ-AGENT-035

## Phase 11: Human–AI Collaboration Protocols

- [x] **T-AGENT-040**: Add autonomy tier definitions to AGENTS.md — Tier 1/2/3 with selection criteria → REQ-AGENT-042
- [x] **T-AGENT-041**: Add review-by-explanation gate to PR review checklist in `docs/conventions/pr-review-council.md` → REQ-AGENT-043
- [x] **T-AGENT-042**: Add gate checkpoint properties (machine-verifiable, bounded, committed, rollback) to `docs/instructions/post-task-checklist.md` → REQ-AGENT-044
- [x] **T-AGENT-043**: Add minimum gate checkpoint sequence to AGENTS.md execution protocol → REQ-AGENT-045
- [x] **T-AGENT-044**: Add ADR creation requirement for AI-assisted architectural decisions to AGENTS.md → REQ-AGENT-046

## Phase 12: Validation

- [x] **T-AGENT-045**: Verify CLAUDE.md ≤200 lines after restructuring → REQ-AGENT-001 — *99 lines*
- [x] **T-AGENT-046**: Verify AGENTS.md ≤1,000 lines after restructuring → REQ-AGENT-002 — *300 lines*
- [x] **T-AGENT-047**: Verify copilot-instructions.md ≤1,000 lines after restructuring → REQ-AGENT-003 — *97 lines*
- [ ] **T-AGENT-048**: ⏸️ DEFERRED — Verify all hooks execute correctly: commit blocked without guards, push to main blocked, type errors reported, file size warned → REQ-AGENT-008 to 013 — *requires live Claude Code session*
- [ ] **T-AGENT-049**: ⏸️ DEFERRED — Verify TDD chat modes hand off correctly: red→green→refactor → REQ-AGENT-025 — *requires live Copilot agent session*
- [ ] **T-AGENT-050**: ⏸️ DEFERRED — Verify CI workflow triggers on `work/*` branches and all jobs pass → REQ-AGENT-041 — *requires actual PR*
- [ ] **T-AGENT-051**: ⏸️ DEFERRED — Run end-to-end test: implement a small feature using the full workflow (spec→plan→TDD→review→merge) to validate all mechanisms work together → REQ-AGENT-014, REQ-AGENT-020, REQ-AGENT-027 — *requires real feature*

## Phase 13: Context Collapse Prevention

- [x] **T-AGENT-052**: Restructure CLAUDE.md and AGENTS.md with positional layout: boundaries at start, reference in middle, quick-reference at end → REQ-AGENT-055
- [x] **T-AGENT-053**: Add context degradation detection instructions to `.claude/rules/` — proxy metrics (instruction compliance rate, refusal consistency), re-anchoring protocol, fresh session recommendation → REQ-AGENT-057, REQ-AGENT-058
- [x] **T-AGENT-054**: Add context compression guidelines to `.claude/rules/` — deterministic deduplication only, no LLM summarization, ACE Curator pattern → REQ-AGENT-056
- [x] **T-AGENT-055**: Add sliding window context strategy to AGENTS.md — current task full context, completed tasks as compressed summaries, state tracker as external memory → REQ-AGENT-059
- [x] **T-AGENT-056**: Add human-written context file policy to AGENTS.md — AI may draft, human reviews and rewrites, ETH Zurich finding documented → REQ-AGENT-060
- [x] **T-AGENT-057**: Create context file lint script (`scripts/lint-context-files.sh`) — checks line counts, positional layout, token budget estimation, human-written assertion → REQ-AGENT-054, REQ-AGENT-055, REQ-AGENT-007

## Phase 14: OWASP ASI Security

- [x] **T-AGENT-058**: Add SSGM gate checks to memory promotion workflow in `docs/guidelines/memory-promotion-workflow.md` — relevance, evidence, coherence gates with rejection logging → REQ-AGENT-061
- [x] **T-AGENT-059**: Add subagent artifact verification protocol to `.claude/skills/orchestrate/SKILL.md` — verify files/commits exist before accepting subagent results → REQ-AGENT-062
- [x] **T-AGENT-060**: Add cascade depth limits to orchestration protocol — max 3 delegation levels, independent guard gates per level, failure isolation → REQ-AGENT-063
- [x] **T-AGENT-061**: Add tool output isolation instructions to `.claude/rules/security.md` — untrusted content processed for data extraction only, never as command input → REQ-AGENT-064
- [x] **T-AGENT-062**: Add action traceability requirements to state tracker template — agent identity, timestamp, action type, affected files, requirement ID for every modification → REQ-AGENT-065

## Phase 15: Property-Based Testing

- [x] **T-AGENT-063**: Create property test template in `packages/testing/src/property-test-template.ts` — fast-check + Vitest pattern with requirement ID comments → REQ-AGENT-066
- [x] **T-AGENT-064**: Add property coverage tracking to CI pipeline (`agent-pr-validation.yml`) — ≥85% of EARS `shall` clauses must have fast-check properties → REQ-AGENT-068
- [x] **T-AGENT-065**: Create `.github/instructions/property-tests.instructions.md` with `applyTo: "**/*.property.test.ts"` — fast-check conventions, EARS mapping, arbitrary generation patterns → REQ-AGENT-066
- [x] **T-AGENT-066**: Document critical algorithm property requirements (rate limiter, circuit breaker, token bucket, URL dedup) in relevant feature specs → REQ-AGENT-069 — *documented in agentic-setup/design.md §critical-algorithm-properties table*

## Phase 16: Quality Gates and Runtime Constraints

- [x] **T-AGENT-067**: Add five-dimension quality gate to CI pipeline — task success, context preservation, P95 latency, safety pass rate, evidence coverage → REQ-AGENT-071
- [x] **T-AGENT-068**: Add spec drift detection job to `agent-pr-validation.yml` — Spectral for API contracts, custom script for design.md type consistency, living spec update check → REQ-AGENT-072 — *concrete implementation: `scripts/verify-spec-update.sh` + `pnpm verify:specs`*
- [x] **T-AGENT-069**: Create runtime predicate script (`scripts/agent-constraints.sh`) — file count bounds, directory scope, dependency additions, API surface changes → REQ-AGENT-070
- [x] **T-AGENT-070**: Add living spec policy to AGENTS.md — spec updated in same commit as divergent code, stale specs flagged in CI → REQ-AGENT-073 — *enforced via G11 gate in mandatory execution protocol*

## Phase 17: Reasoning and Ideation Protocols

- [x] **T-AGENT-071**: Add structured ideation protocol to `.claude/skills/` — diverge/converge separation, incubation mandate, adversarial framing assignments → REQ-AGENT-074, REQ-AGENT-075
- [x] **T-AGENT-072**: Add agent framing assignments to orchestration protocol — specific epistemic identities for each agent role during brainstorming → REQ-AGENT-076
- [x] **T-AGENT-073**: Add idea space logging requirement to ADR template — considered options, rejection reasons, assumptions — update TEMPLATE.md → REQ-AGENT-077
- [x] **T-AGENT-074**: Add multi-framing requirement to `.claude/skills/orchestrate/SKILL.md` — ≥3 framings for architectural decisions, no single-framing ideation → REQ-AGENT-078

## Phase 18: Atomic Actions and Token Economics

- [x] **T-AGENT-075**: Document Atomic Action Pair pattern in `.claude/rules/code-style.md` — generate→verify as indivisible unit, no multi-file writes without intermediate typecheck → REQ-AGENT-079
- [x] **T-AGENT-076**: Add token budget justification to file size rules in AGENTS.md — 200-line = 4K tokens, 300-line = 6K tokens, framed as context budget constraint → REQ-AGENT-080
- [x] **T-AGENT-077**: Document Dual-State code loop in `.claude/skills/tdd-cycle/SKILL.md` — spec→plan→task→generate→guard→commit/retry with explicit state transitions logged → REQ-AGENT-081
- [x] **T-AGENT-078**: Add VSA as default pattern to `.github/instructions/domain-layer.instructions.md` — co-located features, 44% smaller PRs justification → REQ-AGENT-082

## Phase 19: Spec Authorship Automation

- [x] **T-AGENT-079**: Create `.claude/skills/spec-writer/SKILL.md` — five-phase spec creation workflow (Brief→Requirements→Design→Tasks→Index) with user validation gates between each phase → REQ-AGENT-084
- [x] **T-AGENT-080**: Create `.github/agents/spec-writer.agent.md` — Copilot agent for spec creation with EARS format, Mermaid diagrams, dependency ordering → REQ-AGENT-084 — *format changed: agents not chatmodes*
- [x] **T-AGENT-081**: Update `docs/agents/architect.md` — add spec creation (requirements.md, design.md, tasks.md) as explicit capability → REQ-AGENT-083, REQ-AGENT-088
- [x] **T-AGENT-082**: Update `docs/agents/orchestration-protocol.md` — add spec creation to Architect "Can Do" column, add routing for `feature.new` events to Architect → REQ-AGENT-088
- [x] **T-AGENT-083**: Update `docs/automation/pipelines/development-lifecycle.md` — Stage 2 includes full spec creation, doesn't complete until all three docs validated → REQ-AGENT-086
- [x] **T-AGENT-084**: Add spec ownership rule to AGENTS.md — Implementation agent signals Architect for spec updates, never updates specs directly, update in same commit as code → REQ-AGENT-087

## Phase 20: TypeScript & Architecture Enforcement

- [x] **T-AGENT-085**: Create `.github/instructions/strict-typescript.instructions.md` with `applyTo: "**/*.ts"` — strict mode reminders, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `_tag` discriminated union pattern → REQ-AGENT-089, REQ-AGENT-093
- [x] **T-AGENT-086**: Add Zod schema-first directive to `.github/instructions/api-layer.instructions.md` — schema must be defined before handler function, code review checklist item → REQ-AGENT-090
- [x] **T-AGENT-087**: Create ESLint rule `@ipf/no-infra-in-domain` in `packages/eslint-config/` — block `domain/` from importing `infrastructure/` or `infra/` → REQ-AGENT-091 — *implemented via `import-x/no-restricted-paths` zones in eslint.config.js*
- [x] **T-AGENT-088**: Create ESLint rule `@ipf/no-app-in-infra` in `packages/eslint-config/` — block `infrastructure/` from importing `application/` → REQ-AGENT-091 — *implemented via `import-x/no-restricted-paths` zones in eslint.config.js*
- [x] **T-AGENT-089**: Create ESLint rule `@ipf/otel-first-import` in `packages/eslint-config/` — verify first import in `apps/*/src/main.ts` is `'./otel'` → REQ-AGENT-092 — *custom rule in eslint-config/rules/otel-first-import.js, wired into eslint.config.js for apps/*/src/main.ts*
- [x] **T-AGENT-090**: Verify `@typescript-eslint/no-explicit-any` is configured as error (not warning) across all packages in `packages/eslint-config/` → REQ-AGENT-094 — *verified: eslint.config.js has `'@typescript-eslint/no-explicit-any': 'error'`*

## Phase 21: API Contract & Resilience Enforcement

- [x] **T-AGENT-091**: Add Spectral lint job to `agent-pr-validation.yml` — validate API routes match OpenAPI/TypeSpec contracts → REQ-AGENT-095 — *implemented in CI; graceful no-op when no API specs exist*
- [x] **T-AGENT-092**: Add SIGTERM handler verification to `agent-pr-validation.yml` — grep each `apps/*/src/main.ts` for SIGTERM/gracefulShutdown → REQ-AGENT-096
- [x] **T-AGENT-093**: Add health endpoint verification to `agent-pr-validation.yml` — verify `/health/live` and `/health/ready` routes exist in each service → REQ-AGENT-097
- [x] **T-AGENT-094**: Add `using` keyword directive to `.github/instructions/infra-layer.instructions.md` — `Symbol.dispose` pattern for connections, locks, handles → REQ-AGENT-098
- [x] **T-AGENT-095**: Add idempotency verification to `agent-pr-validation.yml` — verify BullMQ processors include idempotency patterns → REQ-AGENT-099

## Phase 22: Security Property Testing

- [x] **T-AGENT-096**: Create `packages/testing/src/generators/rfc6890.generator.ts` — fast-check arbitrary for all RFC 6890 reserved IP ranges (GAP-SEC-001, GAP-SEC-002) → REQ-AGENT-100, REQ-AGENT-102
- [x] **T-AGENT-097**: Create `packages/testing/src/generators/dns-rebinding.generator.ts` — TOCTOU payloads, rebinding sequences (GAP-SEC-003, GAP-SEC-004) → REQ-AGENT-100
- [x] **T-AGENT-098**: Create `packages/testing/src/generators/ssrf-payload.generator.ts` — redirect chains, IPv4-mapped IPv6, scheme abuse → REQ-AGENT-100
- [x] **T-AGENT-099**: Create `.github/instructions/security-properties.instructions.md` with `applyTo: "**/*.property.test.ts"` — maps GAP-SEC-001 to 005 to required properties → REQ-AGENT-101

## Phase 23: Advanced Reasoning & Cross-Cutting Enforcement

- [x] **T-AGENT-100**: Add reasoning framework selection table to `.claude/skills/orchestrate/SKILL.md` — CoT for debugging, ToT for architecture, SPIRAL for optimization, log selection → REQ-AGENT-103
- [x] **T-AGENT-101**: Add human-AI complementarity matrix to AGENTS.md — task allocation guidance per task type → REQ-AGENT-104
- [x] **T-AGENT-102**: Add test pyramid classification job to `agent-pr-validation.yml` — classify by naming convention, report breakdown, enforce targets → REQ-AGENT-105
- [x] **T-AGENT-103**: Add commit provenance hook to `.claude/settings.json` — verify Agent/Requirement/Tool trailers on `work/*` branch commits → REQ-AGENT-106
- [x] **T-AGENT-104**: Create `.github/prompts/commit-with-provenance.prompt.md` — Copilot prompt template for commits with provenance trailers → REQ-AGENT-106

## Phase 24: Final Validation

- [x] **T-AGENT-105**: Verify ESLint layer boundary rules block cross-layer imports in a test scenario → REQ-AGENT-091 — *8 verification tests in packages/testing/src/eslint-rules-verification.unit.test.ts*
- [x] **T-AGENT-106**: Verify OTel first-import rule catches violations → REQ-AGENT-092 — *8 tests in packages/testing/src/otel-first-import-rule.unit.test.ts using ESLint Linter API*
- [ ] **T-AGENT-107**: ⏏️ DEFERRED — Verify Spectral catches API contract drift → REQ-AGENT-095 — *requires API specs to validate against*
- [x] **T-AGENT-108**: Verify security property generators produce valid fast-check arbitraries for all RFC 6890 ranges → REQ-AGENT-100, REQ-AGENT-102 — *13 tests in packages/testing/src/generators/security-generators.unit.test.ts*
- [ ] **T-AGENT-109**: ⏏️ DEFERRED — Run full end-to-end: feature request → spec-writer → TDD → review → merge using all mechanisms → REQ-AGENT-083, REQ-AGENT-020, REQ-AGENT-071, REQ-AGENT-089 — *requires live environment with implemented features*

## Phase 25: G11 Spec Update Gate

- [x] **T-AGENT-110**: Create `scripts/verify-spec-update.sh` — package→spec mapping, task completion sync, spec freshness checks → REQ-AGENT-072, REQ-AGENT-073
- [x] **T-AGENT-111**: Add `pnpm verify:specs` script alias to root `package.json` and wire into `pnpm verify:all` → REQ-AGENT-072
- [x] **T-AGENT-112**: Add G11 Spec Update gate to AGENTS.md mandatory execution protocol (completion gates table) → REQ-AGENT-073, REQ-AGENT-045
- [x] **T-AGENT-113**: Add G11 to CLAUDE.md (Always Do + Required Artifacts) and `.github/copilot-instructions.md` (Always Do) → REQ-AGENT-001, REQ-AGENT-003
- [x] **T-AGENT-114**: Wire G11 check into `scripts/verify-session-compliance.sh` → REQ-AGENT-071
- [x] **T-AGENT-115**: Backfill stale tasks.md checkboxes for 5 implemented packages (crawl-pipeline, http-fetching, ssrf-guard, testing-quality, url-frontier) → REQ-AGENT-073

## Phase 26: Copilot Hook Parity & Universal Enforcement

- [x] **T-AGENT-116**: Create `.github/hooks/gates.json` with PreToolUse, PostToolUse, Stop hook definitions pointing to shell scripts → REQ-AGENT-107
- [x] **T-AGENT-117**: Create `scripts/hooks/copilot-pre-tool-use.sh` — parse stdin JSON, block `git commit` without G2/G4/G5, block `git push` to main, require confirmation for `--force` → REQ-AGENT-107, REQ-AGENT-108
- [x] **T-AGENT-118**: Create `scripts/hooks/copilot-post-tool-use.sh` — run `pnpm tsc --noEmit` after file-editing tools, warn on files >300 lines → REQ-AGENT-109
- [x] **T-AGENT-119**: Create `scripts/hooks/copilot-stop.sh` — check uncommitted changes and missing state tracker, guard against `stop_hook_active` infinite loop → REQ-AGENT-110
- [x] **T-AGENT-120**: Create `.vscode/settings.json` with `chat.hookFilesLocations` disabling `.claude/settings.json` and `.claude/settings.local.json` → REQ-AGENT-111
- [x] **T-AGENT-121**: Update AGENTS.md and `.github/copilot-instructions.md` with three-layer enforcement documentation (Copilot hooks + Git hooks + Claude hooks) → REQ-AGENT-107, REQ-AGENT-111

---

## Dependencies

| Task | Depends On | Blocks |
| --- | --- | --- |
| Phase 0 (bootstrap) | — | All phases |
| Phase 1 (context restructure) | Phase 0 | Phases 2, 3, 10, 11, 13, 18 |
| Phase 2 (Copilot instructions) | Phase 1 | Phase 7, 8, 15 |
| Phase 3 (Claude rules) | Phase 1 | Phase 4, 5, 14, 18 |
| Phase 4 (hooks) | Phase 3 | Phase 5, 6 |
| Phase 5 (skills) | Phase 3, 4 | Phase 6, 19 |

## MVP Task Summary

| Phase | MVP Tasks | Description |
| --- | --- | --- |
| Phase 0 | T-AGENT-000a to 000e | Bootstrap: branch safety, boundaries, state tracker |
| Phase 1 | T-AGENT-001, 002 | Context file restructuring (CLAUDE.md, AGENTS.md) |
| Phase 4 | T-AGENT-013, 014 | Critical hooks (guard functions, branch protection) |
| Phase 5 | T-AGENT-019, 020 | Core skills (TDD cycle, guard function chain) |
| Phase 9 | T-AGENT-031 | CI workflow for agent PRs |
| **Total MVP** | **11 tasks** | **Minimal viable agentic setup** |

> **MVP exit criterion**: Agents can safely operate with branch protection, guard function enforcement (pre-commit + CI), TDD workflow support, and state tracking. Non-MVP phases add path-scoped instructions, advanced orchestration, security testing, and ideation protocols.

---
| Phase 6 (commands) | Phase 5 | Phase 12 |
| Phase 7 (chat modes) | Phase 2 | Phase 12, 19 |
| Phase 8 (prompt templates) | Phase 2 | Phase 12 |
| Phase 9 (CI/CD) | Phase 1 | Phase 12, 15, 16 |
| Phase 10 (failure recovery) | Phase 1 | Phase 12 |
| Phase 11 (collaboration) | Phase 1 | Phase 12 |
| Phase 12 (validation) | Phases 1–11 | Phase 20 |
| Phase 13 (context collapse) | Phase 1 | Phase 24 |
| Phase 14 (OWASP ASI) | Phase 3, 5 | Phase 24 |
| Phase 15 (property-based testing) | Phase 2, 9 | Phase 24 |
| Phase 16 (quality gates) | Phase 9 | Phase 24 |
| Phase 17 (reasoning/ideation) | Phase 5 | Phase 24 |
| Phase 18 (atomic actions) | Phase 1, 3 | Phase 24 |
| Phase 19 (spec authorship) | Phase 5, 7 | Phase 24 |
| Phase 20 (TS/arch enforcement) | Phase 2, 3, 9 | Phase 24 |
| Phase 21 (API/resilience) | Phase 9 | Phase 24 |
| Phase 22 (security PBT) | Phase 2, 15 | Phase 24 |
| Phase 23 (reasoning/cross-cutting) | Phase 5, 9, 17 | Phase 24 |
| Phase 24 (final validation) | All above | — |

---

## Post-Mortem Root Cause → Task Mapping

| Root Cause | Primary Tasks |
| --- | --- |
| RC-1: No enforcement mechanism | T-AGENT-013 to 018 (hooks), T-AGENT-069 (runtime predicates) |
| RC-2: No subagents launched | T-AGENT-019, 022, 023 (skills), T-AGENT-026 to 028 (chat modes), T-AGENT-059 (artifact verification) |
| RC-3: Aspirational prose | T-AGENT-001 to 003 (restructure), T-AGENT-004 to 012 (modular rules), T-AGENT-052 (positional layout) |
| RC-4: Guard functions as SHOULD | T-AGENT-013 (commit hook), T-AGENT-020 (guard skill), T-AGENT-075 (atomic action pairs) |
| RC-5: No post-task verification | T-AGENT-017 (stop hook), T-AGENT-025 (post-task command), T-AGENT-062 (traceability), T-AGENT-067 (quality gates) |
| RC-6: Git safety not enforced | T-AGENT-014 (push hook), T-AGENT-031 to 035 (CI pipeline) |

### Research-Derived Task Mapping

| Research Finding | Primary Tasks |
| --- | --- |
| Context rot / attention basin (collapse.md) | T-AGENT-052 to 057 (Phase 13) |
| OWASP ASI / SSGM / cascade prevention (collapse.md) | T-AGENT-058 to 062 (Phase 14) |
| EARS → PBT pipeline (spec.md) | T-AGENT-063 to 066 (Phase 15) |
| AgentSpec / 5-dim quality gates / spec drift (spec.md) | T-AGENT-067 to 070 (Phase 16) |
| Anti-sycophancy / incubation / framings (ideating.md) | T-AGENT-071 to 074 (Phase 17) |
| Atomic Action Pairs / token budget / VSA (ai_coding.md) | T-AGENT-075 to 078 (Phase 18) |
| Spec authorship gap / asymmetric model (spec.md, gap) | T-AGENT-079 to 084 (Phase 19) |
| TypeScript strict mode / layer boundaries (ADR-015, ADR-016, arch.md Phase 3) | T-AGENT-085 to 090 (Phase 20) |
| Contract-first API / resilience enforcement (arch.md Phase 5, 7) | T-AGENT-091 to 095 (Phase 21) |
| SSRF property testing / RFC 6890 (REQUIREMENTS-AGNOSTIC §12) | T-AGENT-096 to 099 (Phase 22) |
| Reasoning frameworks / test pyramid / provenance (ideating.md, ADR-007) | T-AGENT-100 to 104 (Phase 23) |

---

## Completion Summary

| Metric | Count |
| --- | --- |
| Total tasks | 121 (T-AGENT-000a to T-AGENT-121) |
| Completed | 103 |
| Deferred | 18 |
| Completion rate | 85.1% |

### Deferred Tasks

| Task | Reason |
| --- | --- |
| T-AGENT-048, 049, 050, 051 | Require live environment/services for validation |
| T-AGENT-066 | Requires feature specs with algorithm requirements |
| T-AGENT-087, 088, 089, 090 | ESLint custom rules need `packages/eslint-config/` source |
| T-AGENT-091 | Spectral needs API specs to validate against |
| T-AGENT-105, 106, 107, 108, 109 | Final validation requires live environment |

### Key Decisions

| # | Decision | Rationale |
| --- | --- | --- |
| D-1 | Agents (`.github/agents/`) not chatmodes | VS Code deprecated chatmodes in favor of agents |
| D-2 | CI grep checks as interim for ESLint rules | Custom ESLint rules deferred until `packages/eslint-config/` source exists |
| D-3 | `agent-constraints.sh` as bash (not .ts) | Shell script for CI pipeline portability |
| D-4 | Security generators in `packages/testing/` | Co-located with other test utilities per project layout |

> **Provenance**: Created 2026-03-25. Updated 2026-03-25: added Phases 13–20 (38 new tasks) from research. Updated 2026-03-26: renumbered original Phase 20 validation tasks, added Phases 20–24 (25 new tasks, T-AGENT-085 to 109) from cross-validation against all 22 ADRs, REQUIREMENTS-AGNOSTIC.md, arch.md, code.md, 13 feature specs, and docs infrastructure. Total: 109 tasks across 24 phases. Updated 2026-03-27: marked 91/109 tasks complete, 18 deferred, added completion summary and key decisions from implementation worklog. Updated 2026-03-27: added Phase 25 (G11 Spec Update Gate — T-AGENT-110 to T-AGENT-115), annotated T-AGENT-068/070 with concrete implementation references. Updated 2026-03-27: added Phase 26 (Copilot Hook Parity — T-AGENT-116 to T-AGENT-121). Total: 121 tasks, 103 complete, 85.1%.
