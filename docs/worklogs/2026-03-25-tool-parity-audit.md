# Worklog: Tool Parity Audit

| Field | Value |
| --- | --- |
| **Date** | 2026-03-25 |
| **Status** | Complete |
| **Topic** | Audit `.claude/`, `.github/`, `docs/` for equivalence, deduplication, and cross-references |
| **ADRs** | ADR-018 (context engineering), ADR-019 (ideation), ADR-020 (spec-driven), ADR-021 (context collapse) |

## Summary

Audited all files under `.claude/` (16 files), `.github/` (19 files), and `docs/` (22 skills, 13 agents, 8 instructions, 7 pipelines) for:

- Functional equivalence between Claude Code and GitHub Copilot
- Duplication that should be consolidated into `docs/` (canonical source)
- Cross-references between tool-specific wrappers and canonical sources
- ADR tool-equality (no tool should be favored)

## Findings & Fixes

| # | Issue | Fix |
| --- | --- | --- |
| 1 | 6/7 `.claude/skills/` SKILL.md had invalid `triggers:` and `tools:` frontmatter | Removed invalid fields |
| 2 | TypeScript strict rules duplicated 4× (strict-typescript + api-layer + domain-layer + infra-layer) | Removed from 3 layer files; `strict-typescript.instructions.md` covers all `**/*.ts` |
| 3 | 4 skills (tdd-cycle, plan-feature, ideation, spec-writer) existed only in `.claude/` and `.github/` — no canonical `docs/skills/` source | Created 4 new `docs/skills/` canonical files |
| 4 | No cross-references between tool wrappers and canonical sources | Added `> Canonical:` to all 7 `.claude/skills/` and 6 `.github/agents/prompts/` |
| 5 | Copilot missing preflight/post-task prompts (Claude had commands) | Created 2 new `.github/prompts/` |
| 6 | `copilot-instructions.md` missing docs ecosystem references | Expanded Key File Locations section |
| 7 | `docs/skills/index.md` missing 4 entries | Added TDD Cycle, Plan Feature, Ideation, Spec Writer |

## Files Created (6)

- `docs/skills/tdd-cycle.md` — Canonical TDD cycle skill with tool implementation links
- `docs/skills/plan-feature.md` — Canonical feature planning skill
- `docs/skills/ideation.md` — Canonical ideation skill
- `docs/skills/spec-writer.md` — Canonical spec writer skill
- `.github/prompts/preflight.prompt.md` — Copilot parity with `.claude/commands/preflight.md`
- `.github/prompts/post-task.prompt.md` — Copilot parity with `.claude/commands/post-task.md`

## Files Modified (19)

| Category | Files |
| --- | --- |
| Claude skills (7) | `guard-functions`, `orchestrate`, `plan-feature`, `review-code`, `spec-writer`, `tdd-cycle`, `ideation` SKILL.md — frontmatter fix + canonical refs |
| Copilot instructions (3) | `api-layer`, `domain-layer`, `infra-layer` — removed duplicated TS strict section |
| Copilot agents (4) | `tdd-red`, `tdd-green`, `tdd-refactor`, `spec-writer` — canonical refs |
| Copilot prompts (2) | `plan-feature`, `review-pr` — canonical refs |
| Indexes (2) | `docs/skills/index.md`, `.github/copilot-instructions.md` |
| Root (1) | `.github/copilot-instructions.md` — expanded docs ecosystem awareness |

## Parity Summary

| Capability | Claude | Copilot | Canonical |
| --- | --- | --- | --- |
| TDD | 1 skill (3 phases) | 3 agents (handoffs) | `docs/skills/tdd-cycle.md` |
| Guard functions | 1 skill + hooks | CI workflow | `docs/skills/quality-gate-enforcement.md` |
| Code review | 1 skill | 1 prompt | `docs/skills/automated-review.md` + `docs/conventions/pr-review-council.md` |
| Feature planning | 1 skill | 1 prompt | `docs/skills/plan-feature.md` |
| Spec writing | 1 skill | 1 agent | `docs/skills/spec-writer.md` |
| Ideation | 1 skill | (via ADR-019) | `docs/skills/ideation.md` |
| Pre-flight (G1-G4) | 1 command | 1 prompt | `docs/instructions/pre-flight-checklist.md` |
| Post-task (G5-G7) | 1 command | 1 prompt | `docs/instructions/post-task-checklist.md` |
| Path-scoped rules | N/A | 8 instructions | Layer-specific |
| Hooks (enforcement) | settings.json | CI workflow | Different mechanisms, same rules |

## Learnings

- **ADR-018 principle confirmed**: "AGENTS.md canonical, tool-specific files extend (not duplicate)" — this is the right architecture
- **Path-scoping is a Copilot-only feature**: Claude rules apply globally, Copilot instructions can target file patterns. This means Claude rules should remain general while Copilot instructions can be more specific.
- **Enforcement timing differs**: Claude enforces at tool-use time (hooks), Copilot at CI/PR time (GitHub Actions). Same rules, different enforcement points.
- **Canonical source pattern works well**: `docs/skills/` as the single source of truth with tool-specific wrappers that add `> Canonical:` reference. Changes propagate via the canonical file.

---

> **Provenance**: Created 2026-03-25.
