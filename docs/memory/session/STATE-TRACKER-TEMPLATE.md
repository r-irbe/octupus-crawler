# Implementation State Tracker — Template

> **Purpose**: Prevent context collapse by maintaining a structured, machine-readable working state document that the agent reads back before every task. This is the agent's "external memory" — it replaces loose session notes with a formal state machine.
>
> **Authority**: AGENTS.md Gate G4 (session memory), ADR-018 §11 (enforcement protocol).
>
> **Usage**: Copy this template to `docs/memory/session/YYYY-MM-DD-<slug>-state.md` at Gate G4. Update it at Gate G7 after every task. Re-read it before starting each new task.

---

## Session Identity

| Field | Value |
| --- | --- |
| Date | YYYY-MM-DD |
| Branch | `work/<task-slug>` |
| User request | _One-sentence summary of what the user asked for_ |
| Scope | _Which packages/apps are affected_ |

## Applicable ADRs

_List only ADRs that directly govern this work:_

- ADR-NNN: reason it applies

## Task Queue

_Derived from `tasks.md` or decomposed from the user request. Mark status as you go._

| # | Task | Status | Commit | Notes |
| --- | --- | --- | --- | --- |
| 1 | _description_ | `pending` | — | — |
| 2 | _description_ | `pending` | — | — |

Status values: `pending` | `in-progress` | `done` | `blocked` | `skipped`

## Current State

| Field | Value |
| --- | --- |
| Current task # | — |
| Last completed gate | — |
| Guard function status | `not-run` / `pass` / `fail (attempt N/3)` |
| Commits on branch | 0 |
| Tests passing | — |
| Blockers | none |

## Decisions Log

_Record every non-trivial decision. This is your evidence trail._

| # | Decision | Rationale | ADR ref |
| --- | --- | --- | --- |
| 1 | — | — | — |

## Problems & Solutions

| # | Problem | Solution | Task # |
| --- | --- | --- | --- |
| 1 | — | — | — |

## Action Traceability

_Record every file modification with full traceability. Required by REQ-AGENT-065._

| # | Agent | Timestamp | Action | Files Affected | Requirement |
| --- | --- | --- | --- | --- | --- |
| 1 | — | — | create/modify/delete | — | REQ-XXX-NNN |

## Agent Delegation

_If subagents were launched, track them here._

| Agent | Scope | Status | Result |
| --- | --- | --- | --- |
| — | — | — | — |

## Re-Read Protocol

**Before starting each task**, re-read this document from "Current State" down. This takes < 30 seconds and prevents context collapse. Update "Current State" immediately after each gate.

---

> **Provenance**: Created 2026-03-25. Template for implementation state tracking per ADR-018 §11 and AGENTS.md Mandatory Execution Protocol.
