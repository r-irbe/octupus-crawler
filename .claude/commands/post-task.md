# /project:post-task — Post-Task Checklist (G5–G7)

Run this command after completing each logical change (one task = one commit).

## Steps

### G5: Guard Functions

```bash
pnpm turbo typecheck && pnpm turbo lint && pnpm turbo test
```

All must pass. 3 total attempts (1 initial + 2 retries). If all fail → STOP and escalate.

### G6: Commit

```bash
git add -A && git commit -m "<type>(<scope>): <description>"
```

Use conventional commit format. One logical change per commit.

### G7: State Tracker Update

1. Open `docs/memory/session/YYYY-MM-DD-<slug>-state.md`
2. Mark the completed task as `done` in the task queue
3. Record the commit hash
4. Update the "Current State" section
5. Log any decisions or problems encountered

## Exit Criterion

Guard functions passed, changes committed, state tracker updated. Ready for next task.
