# CLAUDE.md — Claude Code Extensions for IPF Crawler

> Extends [AGENTS.md](AGENTS.md) (binding). This file adds **only** Claude Code-specific rules.

## Boundaries

### Always Do

- Run `pnpm verify:guards` (NOT raw turbo commands) before every commit
- Run `pnpm verify:gates` before merging to main
- Run `pnpm verify:session` before declaring work complete
- Run `pnpm verify:specs` after G10 to ensure living specs are current
- Create feature branch `work/<task-slug>` before writing code
- Create/update state tracker in `docs/memory/session/`
- Use separate subagents for implementation vs review (multi-package work)
- Re-read state tracker before every task
- Use `.claude/skills/` for scripted workflows (TDD, guard functions, planning)

### Ask First

- Changes to shared interfaces in `packages/core/src/`
- Tasks touching >1 package (present plan, wait for confirmation)
- Architectural decisions not covered by existing ADRs
- Database schema changes or new dependency additions

### Never Do

- Commit directly to `main`
- Implement AND review own code without user waiver
- Skip guard functions before committing
- Push with `--force` on shared branches
- Generate code before spec validation (Brief→Plan→Tasks→Implement)

## ⛔ STOP Conditions

- Belief < 80% on any architectural decision
- Guard Functions fail after 3 attempts (1 initial + 2 retries)
- A MUST rule from AGENTS.md would be violated
- Work touches >3 packages without user-approved plan
- Any ADR is ambiguous or contradictory
- Runtime lacks subagent support for multi-package work → request user waiver

## Context Degradation Signals

Recommend fresh session when ≥2 of these appear:

- Repeating instructions already given in the conversation
- Contradicting earlier decisions without acknowledging the change
- Forgetting file paths or variable names from earlier
- Generating code that violates rules stated at session start
- Response length deviating >25% from task complexity

Recovery: re-read state tracker → re-anchor on Boundaries section → if signals persist, recommend fresh session to user.

## Required Artifacts

| Artifact | Location | Gate |
| --- | --- | --- |
| Feature branch | `work/<task-slug>` | G2 |
| State tracker | `docs/memory/session/YYYY-MM-DD-<slug>-state.md` | G4, G7 |
| Guard function output | Terminal | G5 |
| Conventional commits | Git log | G6 |
| Worklog | `docs/worklogs/YYYY-MM-DD-topic.md` | G9 |
| Summary to user | Chat message | G10 |
| Updated spec files | `docs/specs/<feature>/tasks.md` checkboxes | G11 |

## Hooks (`.claude/settings.json`)

- **PreToolUse** `git commit`: runs guard function chain — blocks commit if any check fails
- **PreToolUse** `git push`: blocks push to `main` — forces feature branch
- **PostToolUse** `Write`: runs `pnpm tsc --noEmit` — feeds type errors back
- **PostToolUse** `Write`: warns if file exceeds 300-line hard limit
- **Stop**: verifies guard functions passed, changes committed, state tracker updated

## Capabilities

- **Thinking modes**: `think` (~4k), `think hard` (~10k), `think hardest` (~32k) — reserve higher modes for genuine complexity
- **Agent Teams**: git worktree isolation for parallel subagent work
- **Skills**: `.claude/skills/` — TDD cycle, guard functions, feature planning, code review, orchestration
- **Commands**: `/project:preflight` (G1–G4), `/project:post-task` (G5–G7)

## Document Index

| Category | Documents |
| --- | --- |
| Agents & orchestration | [agents/](docs/agents/index.md), [orchestration](docs/agents/orchestration-protocol.md) |
| Instructions (always active) | [instructions/](docs/instructions/index.md) |
| Skills (loaded per-task) | [skills/](docs/skills/index.md) |
| Conventions | [PR Review Council](docs/conventions/pr-review-council.md) |
| Guidelines | [Doc Standards](docs/guidelines/documentation-standards.md), [Memory Promotion](docs/guidelines/memory-promotion-workflow.md) |
| Automation | [automation/](docs/automation/index.md) |

## Quick Reference

1. Belief < 80%? → STOP, ask user
2. ADR exists? → follow it
3. Memory has patterns? → apply them
4. No guidance? → propose new ADR
5. Conflict? → raise in PR review council

---

> **Provenance**: Created 2026-03-24. Updated 2026-03-25: added three-tier boundaries, hooks reference, skills/commands reference per REQ-AGENT-001, REQ-AGENT-004, REQ-AGENT-005.
