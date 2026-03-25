# Context Collapse Prevention

## Degradation Detection

Monitor these proxy metrics for context degradation:

- **Instruction compliance rate**: Agent output violates rules from AGENTS.md that were stated earlier
- **Refusal consistency**: Agent generates code patterns it was told to avoid (e.g., `any`, barrel imports)
- **Path amnesia**: Agent forgets file paths or variable names mentioned earlier in session
- **Decision contradiction**: Agent contradicts a decision it made earlier without acknowledging the change
- **Length deviation**: Response length deviates >25% from task complexity (verbose on simple, terse on complex)

When ≥2 indicators fire: re-read state tracker, re-anchor on AGENTS.md Boundaries, recommend fresh session if persistent.

## Re-Anchoring Protocol

1. Re-read `docs/memory/session/` state tracker for current task
2. Re-read AGENTS.md Boundaries section (Always Do / Ask First / Never Do)
3. Verify current task against spec (`requirements.md` / `design.md` / `tasks.md`)
4. If signals persist after re-anchoring → recommend fresh session to user

## Context Compression

- **Deterministic deduplication only** — no LLM-based summarization of context files
- Remove exact duplicates across files; preserve all unique content
- ACE Curator pattern: when context exceeds budget, drop lowest-relevance sections (furthest from current task)
- Never compress state tracker — it is always loaded in full

## Sliding Window Strategy

- **Current task**: Full context (spec, ADRs, affected files, state tracker)
- **Completed tasks**: Compressed to commit hash + one-line summary in state tracker
- **Future tasks**: Task description only (from `tasks.md`)
- **State tracker**: Always in full — this is the agent's external memory

## Human-Written Context Policy

- AI agents may draft context files (AGENTS.md, CLAUDE.md, instructions)
- Human MUST review and rewrite before files become authoritative
- ETH Zurich finding: LLM-authored instructions degrade downstream performance vs human-written
- Mark AI-drafted files with `<!-- AI-DRAFTED: requires human review -->` until reviewed
