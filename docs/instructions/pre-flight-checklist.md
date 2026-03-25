# Pre-Flight Checklist

> Gates G1–G4 from AGENTS.md. Complete and report to user BEFORE writing any code.

## G1: Plan

- [ ] State what you will build, which ADRs apply, which packages change
- [ ] List governing spec files (`requirements.md` / `design.md` / `tasks.md`)
- [ ] >1 package → **STOP, wait for user confirmation**
- [ ] >3 packages → user must explicitly approve

## G2: Branch

- [ ] Verify NOT on `main`, create `work/<task-slug>`, report branch name

## G3: Spec

- [ ] Read relevant `requirements.md`, `design.md`, `tasks.md`
- [ ] Report which spec sections govern this work
- [ ] No spec → flag to user, consider creating specs first

## G4: State Tracker

- [ ] Copy [STATE-TRACKER-TEMPLATE](../memory/session/STATE-TRACKER-TEMPLATE.md) → `docs/memory/session/YYYY-MM-DD-<slug>-state.md`
- [ ] Fill in: session identity, applicable ADRs, task queue, current state

## Environment (first session only)

- [ ] Verify `pnpm install`, `pnpm turbo typecheck`, `pnpm turbo lint`, `pnpm turbo test`

## Subagent Delegation (if >1 package)

- [ ] Plan implementation, test, and review subagents

**Failure**: STOP and report which gate, why, what you need.

---

> **Provenance**: Created 2026-03-25. Condensed 2026-03-25.
