---
description: Run pre-flight gates (G1-G4) before starting implementation work
---

> **Canonical**: [docs/instructions/pre-flight-checklist.md](../../docs/instructions/pre-flight-checklist.md) | Copilot pre-flight prompt

## Pre-Flight Gates (G1–G4)

Run these gates before writing any implementation code.

### G1: Plan

1. State what you will build
2. Identify which ADRs and specs apply (check routing table in AGENTS.md)
3. List which packages will change
4. If >1 package: **STOP** and wait for user confirmation

### G2: Branch

```bash
git checkout -b work/<task-slug>
```

Verify you are NOT on `main`.

### G3: Spec

1. Read `docs/specs/<feature>/requirements.md`
2. Read `docs/specs/<feature>/design.md`
3. Read `docs/specs/<feature>/tasks.md`
4. If specs don't exist, use the Spec Writer agent first

### G4: State Tracker

1. Create `docs/memory/session/YYYY-MM-DD-<slug>-state.md`
2. Copy template from `docs/memory/session/STATE-TRACKER-TEMPLATE.md`
3. Fill in: session identity, applicable ADRs, task queue

All four gates must pass before proceeding to implementation.
