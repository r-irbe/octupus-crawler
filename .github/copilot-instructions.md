# GitHub Copilot Instructions for IPF Crawler

> Extends [AGENTS.md](../AGENTS.md) (binding). This file adds **only** Copilot-specific guidance.

## Boundaries

### Always Do

- Run `pnpm verify:guards` (NOT raw turbo commands) before every commit
- Run `pnpm verify:gates` before merging to main
- Run `pnpm verify:session` before declaring work complete
- Run `pnpm verify:specs` after G10 to ensure living specs are current
- Create feature branch `work/<task-slug>` before writing code
- Create state tracker `docs/memory/session/YYYY-MM-DD-<slug>-state.md` BEFORE first commit on a branch
- Read relevant `requirements.md` / `design.md` / `tasks.md` before writing code
- Use path-scoped instructions from `.github/instructions/`
- Verify Guard Functions would pass: `tsc`, `eslint`, `vitest`

> **Enforcement**: Three-layer defense:
> 1. **Copilot hooks** (`.github/hooks/gates.json`): `PreToolUse` blocks `git commit` without guard functions, blocks `git push` to main. `PostToolUse` runs typecheck + file size warning after edits. `Stop` checks for uncommitted changes.
> 2. **Git pre-commit hook** (`.githooks/pre-commit`): Blocks commits violating G2 (branch naming) or G4 (state tracker). Runs for ALL tools.
> 3. **Claude Code hooks** (`.claude/settings.json`): Same gates, Claude-native format.
>
> VS Code loads hooks from `.github/hooks/` only (`.claude/settings.json` disabled via `.vscode/settings.json` — matchers are ignored by VS Code, causing Claude hooks to fire on every tool call).

### Ask First

- Changes to shared interfaces in `packages/core/src/`
- Tasks touching >1 package (present plan, wait for confirmation)
- Architectural decisions not covered by existing ADRs
- New feature? Check for `requirements.md` in the feature folder (SDD, ADR-020)

### Never Do

- Commit directly to `main`
- Use `any` type (use `unknown` + Zod validation)
- Mock Redis, PostgreSQL, or S3 in integration tests
- Generate code before spec validation
- Import from barrel `index.ts` files

## Code Completion Patterns

- `neverthrow` `Result<T, E>` for domain errors, not thrown exceptions
- `import { X } from './specific-file'` — no barrel imports
- Explicit return type annotations on all functions
- Zod schemas (`z.object(...)`) for request/response; derive types with `z.infer<>`
- New config keys → add to Zod schema in `packages/config/`
- New API routes → `@fastify/type-provider-zod` pattern
- Redis/PG/S3 tests → Testcontainers, never mock infrastructure

## Chat / Inline Chat

1. Check [ADR routing table](../AGENTS.md) for the relevant architecture decision
2. Follow [package layout](../AGENTS.md) and [feature structure](../AGENTS.md) for file placement
3. Apply [coding rules](../AGENTS.md) (MUST/SHOULD/NEVER)
4. Verify Guard Functions would pass: `tsc`, `eslint`, `vitest`
5. New feature? Check for `requirements.md` in the feature folder (SDD, ADR-020)
6. Ambiguous requirements? **Ask** — silent progress reduces resolve rates 48.8%→28%

## Interaction Patterns

| Pattern | Comprehension | Guidance |
| --- | --- | --- |
| **Generation-then-Comprehension** | **86%** | Generate code, then interrogate it before using |
| AI Delegation (copy-paste) | 50% | **Avoid** — leads to critical thinking atrophy |

## Hallucination Guards

Watch for: **Mapping** (NL→code errors), **Naming** (fabricated APIs), **Resource** (phantom files), **Logic** (step-skip — compiles but wrong). Verify all referenced APIs/files exist after generation.

## TypeScript Configuration

- `exactOptionalPropertyTypes`: can't assign `undefined` to optional props
- `noUncheckedIndexedAccess`: array/map access returns `T | undefined`
- `noImplicitOverride`: must use `override` keyword
- `no-explicit-any` ESLint rule: use `unknown` + Zod parse

## Test Generation

- Unit: Vitest, pure assertions, no infra mocks
- Integration: Vitest + Testcontainers (`GenericContainer('redis:7-alpine')`)
- Contract: Pact + Schemathesis fuzz for OpenAPI
- Property: fast-check — derive properties from EARS requirements (ADR-020)
- Pyramid: 65% unit, 20% integration, 10% contract, 5% e2e

## Domain Language

| Term | Meaning |
| --- | --- |
| `CrawlJob` | Unit of work to fetch + parse a URL |
| `URLFrontier` | Prioritized URL queue |
| `DomainPolicy` | Per-domain rate limits and rules |
| `FetchResult` / `ParseResult` | HTTP fetch / HTML parse outcomes |
| `URLDiscovered` / `CrawlCompleted` / `CrawlFailed` | Domain events |

## Hooks (`.github/hooks/gates.json`)

- **PreToolUse** `run_in_terminal(git commit)`: runs G2/G4 pre-commit gates + G5 guard functions — blocks commit if any fail
- **PreToolUse** `run_in_terminal(git push)`: blocks push to `main` — forces feature branch
- **PreToolUse** `run_in_terminal(git push --force)`: requires user confirmation
- **PostToolUse** `create_file|replace_string_in_file`: runs `pnpm tsc --noEmit` — feeds type errors back
- **PostToolUse** `create_file|replace_string_in_file`: warns if file exceeds 300-line hard limit
- **Stop**: checks for uncommitted changes and missing state tracker — blocks session end if found

> **Note**: `.claude/settings.json` hooks are disabled in VS Code via `.vscode/settings.json` (`chat.hookFilesLocations`). VS Code ignores Claude Code matcher syntax, which causes Claude hooks to fire on every tool invocation. Use `.github/hooks/` for Copilot-native hooks that filter by `tool_name`.

## Key File Locations

| What | Where |
| --- | --- |
| All ADRs | `docs/adr/ADR-*.md` |
| Agent definitions | `docs/agents/` |
| Skills (canonical) | `docs/skills/` |
| Instructions | `docs/instructions/` |
| Automation pipelines | `docs/automation/` |
| Guidelines | `docs/guidelines/` |
| Conventions | `docs/conventions/` |
| Shared types | `packages/core/src/` |
| Config schema | `packages/config/src/` |
| ESLint config | `packages/eslint-config/` |
| Zod schemas | `packages/validation/src/` |
| Copilot hooks | `.github/hooks/gates.json` |
| Claude hooks | `.claude/settings.json` |
| Hook scripts | `scripts/hooks/` |

---

> **Provenance**: Created 2026-03-25. Condensed 2026-03-25: removed ADR Awareness section (→ AGENTS.md), removed duplicated error handling/naming tables. Updated 2026-03-27: added Copilot hooks section, three-layer enforcement.
