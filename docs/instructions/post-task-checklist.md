# Post-Task Checklist

> Gates G5–G10 from AGENTS.md. Complete after EACH logical change AND after task set completion.

## Gate Checkpoint Properties

Every gate checkpoint MUST be:

- **Machine-verifiable**: Can be checked by a script or CI job (no subjective judgment)
- **Bounded**: Has a clear pass/fail threshold (not "looks good")
- **Committed**: Results are recorded in state tracker (not ephemeral)
- **Rollback-safe**: Failure at any gate allows clean rollback to previous state

## Verification Scripts

These scripts **MUST** be used to verify compliance — no manual shortcuts:

| Script | Command | Purpose |
| --- | --- | --- |
| `verify:guards` | `pnpm verify:guards` | G5: Full typecheck+lint+test with retry (3 attempts) |
| `verify:gates` | `pnpm verify:gates` | G2/G4/G6/G8/G9: Audit git history + artifact compliance |
| `verify:session` | `pnpm verify:session` | All gates: Full session state check |
| `verify:all` | `pnpm verify:all` | Run all verification scripts sequentially |

**MANDATORY**: Run `pnpm verify:guards` (NOT raw turbo commands) for G5. The script enforces retry logic and produces structured output.

## Minimum Gate Sequence

The minimum gate checkpoint sequence that MUST execute for every task:

1. **G5** → `pnpm verify:guards` (typecheck + lint + test with retry)
2. **G6** → Commit (conventional commit on feature branch)
3. **G7** → State Update (state tracker reflects current reality)

Skipping or reordering gates is a protocol violation. **Every gate execution must be visible in terminal output.**

## Per-Task (G5–G7)

### G5: Guard Functions

- [ ] Run `pnpm verify:guards` — must show "✓ ALL GATES PASSED"
- [ ] If it fails after 3 attempts → **STOP**, escalate to user
- [ ] **NEVER** skip this step, even for "trivial" changes

### G6: Commit

- [ ] `git add -A && git commit -m "<type>(<scope>): <desc>"`
- [ ] Verify on feature branch, NOT `main`

### G7: State Tracker

- [ ] Mark task done, record commit hash
- [ ] Update Current State section
- [ ] Log decisions/problems
- [ ] **Re-read state tracker** before next task

## Task Set Completion (G8–G10)

### G8: Review

- [ ] Run `pnpm verify:gates` — check for compliance gaps
- [ ] Self-review: no `any`, explicit types, ≤300 lines, no barrel imports, no unjustified `eslint-disable`, tests exist, ADR compliance
- [ ] Multi-file: launch Review Agent or full self-review

### G9: Worklog

- [ ] Create `docs/worklogs/YYYY-MM-DD-topic.md` with: what changed, tests, ADRs followed, gaps, commits

### G10: Report

- [ ] Run `pnpm verify:session` — full session compliance check
- [ ] Summary to user: changes, tests, ADR compliance, gaps, commits

## Pre-Merge Checklist

Before merging ANY feature branch to main:

- [ ] `pnpm verify:all` passes (all three scripts)
- [ ] State tracker updated with final commit hash
- [ ] Worklog created and indexed
- [ ] Review evidence exists (G8 findings in worklog or spec)

**Failure**: Never skip a gate. STOP and report which gate, why, what you need.

---

> **Provenance**: Created 2026-03-25. Updated 2026-03-26: added verification scripts, pre-merge checklist, mandatory script usage.
