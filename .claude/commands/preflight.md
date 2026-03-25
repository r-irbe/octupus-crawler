# /project:preflight — Pre-Flight Gates (G1–G4)

Run this command before starting any implementation work.

## Steps

### G1: Plan

1. State what you will build
2. Identify which ADRs and specs apply
3. List which packages will change
4. If >1 package: STOP and wait for user confirmation

### G2: Branch

```bash
git checkout -b work/<task-slug>
```

Verify you are NOT on `main`.

### G3: Spec

1. Read `docs/specs/<feature>/requirements.md`
2. Read `docs/specs/<feature>/design.md`
3. Read `docs/specs/<feature>/tasks.md`
4. If specs don't exist, invoke the spec-writer skill first

### G4: State Tracker

1. Create `docs/memory/session/YYYY-MM-DD-<slug>-state.md` from template
2. Copy template from `docs/memory/session/STATE-TRACKER-TEMPLATE.md`
3. Fill in: session identity, applicable ADRs, task queue

## Exit Criterion

All four gates passed. Ready to begin implementation.
