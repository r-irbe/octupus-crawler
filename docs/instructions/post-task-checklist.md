# Post-Task Checklist

> Gates G5–G10 from AGENTS.md. Complete after EACH logical change AND after task set completion.

## Gate Checkpoint Properties

Every gate checkpoint MUST be:

- **Machine-verifiable**: Can be checked by a script or CI job (no subjective judgment)
- **Bounded**: Has a clear pass/fail threshold (not "looks good")
- **Committed**: Results are recorded in state tracker (not ephemeral)
- **Rollback-safe**: Failure at any gate allows clean rollback to previous state

## Minimum Gate Sequence

The minimum gate checkpoint sequence that MUST execute for every task:

1. **G5** → Guard Functions (typecheck + lint + test)
2. **G6** → Commit (conventional commit on feature branch)
3. **G7** → State Update (state tracker reflects current reality)

Skipping or reordering gates is a protocol violation.

## Per-Task (G5–G7)

### G5: Guard Functions

- [ ] `pnpm turbo typecheck` passes
- [ ] `pnpm turbo lint` passes
- [ ] `pnpm turbo test` passes
- [ ] Failures: fix + retry (max 3 total). After 3 → **STOP**, escalate.

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

- [ ] Self-review: no `any`, explicit types, ≤300 lines, no barrel imports, no unjustified `eslint-disable`, tests exist, ADR compliance
- [ ] Multi-file: launch Review Agent or full self-review

### G9: Worklog

- [ ] Create `docs/worklogs/YYYY-MM-DD-topic.md` with: what changed, tests, ADRs followed, gaps, commits

### G10: Report

- [ ] Summary to user: changes, tests, ADR compliance, gaps, commits

**Failure**: Never skip a gate. STOP and report which gate, why, what you need.

---

> **Provenance**: Created 2026-03-25. Condensed 2026-03-25.
