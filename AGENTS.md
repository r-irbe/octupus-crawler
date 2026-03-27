# AGENTS.md — AI Coding Agent Instructions for IPF Crawler

> **Canonical source of truth** for all AI coding agents (GitHub Copilot, Claude Code, Cursor, Windsurf, etc.).
> Tool-specific files (`CLAUDE.md`, `.github/copilot-instructions.md`, `.cursor/rules/`) extend this with tool-specific capabilities.

## Project Overview

IPF is a highly parallelized distributed web crawler built with TypeScript/Node.js, deployed on Kubernetes. Monorepo: Turborepo + pnpm.

## Boundaries

### Always Do

- Run `pnpm turbo typecheck && pnpm turbo lint && pnpm turbo test` before every commit
- Create feature branch `work/<task-slug>` before writing code
- Create/update state tracker in `docs/memory/session/`
- Annotate all function parameters and return types
- Use `neverthrow` Result types for domain errors
- Use Zod schemas before handler code; derive types with `z.infer<>`
- Use Testcontainers for Redis/PG/S3 integration tests
- Read relevant `requirements.md` / `design.md` / `tasks.md` before writing code

### Ask First

- Changes to shared interfaces in `packages/core/src/`
- Database schema changes
- New dependency additions (check ADR-001 approved list)
- Tasks touching >1 package (present plan, wait for confirmation)
- Architectural decisions not covered by existing ADRs

### Never Do

- Commit directly to `main`
- Use `any` type (use `unknown` + Zod validation)
- Mock Redis, PostgreSQL, or S3 in integration tests
- Add `eslint-disable` without justification comment
- Generate code before spec validation
- Skip guard functions before committing
- Push with `--force` on shared branches
- Import from barrel `index.ts` files
- Commit `.env` files or secrets

## Failure Recovery

### Escalation Protocol

3 total attempts per failure (1 initial + 2 retries). If all fail → **STOP** immediately:

1. Report failure type (specification/format/logic/tool), all attempts, error output
2. Suggest next steps
3. Wait for user guidance — do not proceed

### Ambiguity Resolution

- **Ask first** — never guess at ambiguous requirements (silent progress: 48.8% → 28% resolve rate)
- Frame questions: what you understood, what's ambiguous, your proposed interpretation
- Conflicting ADRs → STOP, present both to user

### Autonomy Tiers

| Tier | Scope | User Interaction |
| --- | --- | --- |
| **Tier 1** — Auto | Single-file bug fixes, formatting, test additions, doc updates | Inform after — no confirmation needed |
| **Tier 2** — Confirm | Multi-file changes within one package, new features with spec | Propose plan, wait for approval |
| **Tier 3** — Collaborate | Multi-package changes, new dependencies, architecture, ADR changes | Present detailed plan, stop at each phase |

Selection: default to Tier 2. Promote to Tier 1 only for well-scoped tasks with clear specs. Escalate to Tier 3 when >1 package or architectural decision involved.

### ADR-First for Architecture

AI-assisted architectural decisions MUST produce an ADR (using [TEMPLATE](docs/adr/TEMPLATE.md)). No architecture change is adopted without a documented ADR — even if the change seems small.

## ⛔ Mandatory Execution Protocol

These gates are **NON-NEGOTIABLE**. Skipping any gate is a protocol violation requiring IMMEDIATE STOP and user notification. These gates override all other instructions.

### Pre-Flight Gates (before writing ANY code)

| # | Gate | Action | Artifact |
| --- | --- | --- | --- |
| G1 | **Plan** | State what you will build, which ADRs/specs apply, which packages change. **STOP and wait for user confirmation** on tasks touching >1 package. | Plan message to user |
| G2 | **Branch** | `git checkout -b work/<task-slug>` — NEVER commit directly to `main` | Branch name |
| G3 | **Spec** | Read relevant `requirements.md` / `design.md` / `tasks.md` before writing code | Spec reference in plan |
| G4 | **State tracker** | Create `docs/memory/session/YYYY-MM-DD-<slug>-state.md` from [template](docs/memory/session/STATE-TRACKER-TEMPLATE.md). This is the agent's external working memory — re-read before every task. | File path |

> **Enforcement**: Three-layer defense:
>
> 1. **Tool-native hooks**: Copilot (`.github/hooks/gates.json`) and Claude Code (`.claude/settings.json`) — `PreToolUse` blocks `git commit` without guard functions, blocks `git push` to main.
> 2. **Git pre-commit hook** (`.githooks/pre-commit`): Blocks commits violating G2 (branch naming) or G4 (state tracker). Runs for ALL tools.
> 3. Installed automatically by `pnpm install` via the `prepare` script.

### Per-Task Gates (after EACH logical change — one task = one commit)

| # | Gate | Action | Artifact |
| --- | --- | --- | --- |
| G5 | **Guard Functions** | Run `pnpm verify:guards` (NOT raw turbo commands) — enforces retry logic, structured output. ALL must pass (3 total attempts, then escalate). | Terminal output |
| G6 | **Commit** | `git add -A && git commit -m "<type>(<scope>): <description>"` — conventional commit per logical change | Commit hash |
| G7 | **State update** | Update state tracker: mark task done, record commit hash, update "Current State" section, log decisions/problems | Updated file |

### Completion Gates (before declaring work complete)

| # | Gate | Action | Artifact |
| --- | --- | --- | --- |
| G8 | **Review** | Run `pnpm verify:gates` + launch Review Agent with full PR Review Council RALPH loop (3 rounds: Analysis → Deliberation → Vote) until all sustained Critical/Major findings are resolved. No betterments or issues may remain unaddressed. | Review summary |
| G9 | **Worklog** | Create `docs/worklogs/YYYY-MM-DD-topic.md` | File path |
| G10 | **Report** | Run `pnpm verify:session` + present to user: what changed, tests added, ADR compliance, known gaps | Summary message |
| G11 | **Spec Update** | Run `pnpm verify:specs` — update `tasks.md` checkboxes (`[ ]` → `[x]`) for completed tasks. Update `design.md`/`requirements.md` if implementation diverged (living specs). | Updated spec files |

### Agent Delegation (tools with subagent support)

For tasks spanning multiple packages: launch separate subagents for implementation, testing, and review. A single agent MUST NOT implement AND review its own code without explicit user waiver.

### Spec Ownership

- **Architect** owns spec files (`requirements.md`, `design.md`, `tasks.md`)
- **Implementation agent** signals Architect when code diverges from spec — never updates specs directly
- Spec updates must be in the same commit as the divergent code change (living specs)

## Architecture Decision Records

Before writing or modifying code, consult the relevant ADR. ADRs are the **binding authority** for all technical decisions.

| Topic | ADR | Key Decision |
| --- | --- | --- |
| Monorepo, packages, build | [ADR-001](docs/adr/ADR-001-monorepo-tooling.md) | Turborepo + pnpm, `apps/` + `packages/` split |
| Job queue, Redis | [ADR-002](docs/adr/ADR-002-job-queue-system.md) | BullMQ + Dragonfly, per-domain rate limits |
| IaC | [ADR-003](docs/adr/ADR-003-infrastructure-as-code.md) | Pulumi (TypeScript) |
| Deployment | [ADR-004](docs/adr/ADR-004-gitops-deployment.md) | ArgoCD + Kustomize |
| Local K8s | [ADR-005](docs/adr/ADR-005-local-kubernetes.md) | k3d |
| Observability | [ADR-006](docs/adr/ADR-006-observability-stack.md) | OpenTelemetry + Pino + Grafana |
| Testing | [ADR-007](docs/adr/ADR-007-testing-strategy.md) | Vitest + Testcontainers (real infra, no mocks) |
| HTTP / Parsing | [ADR-008](docs/adr/ADR-008-http-parsing-stack.md) | undici + cheerio (static), Playwright (JS) |
| Resilience | [ADR-009](docs/adr/ADR-009-resilience-patterns.md) | cockatiel, 7-layer stack, graceful shutdown |
| Data layer | [ADR-010](docs/adr/ADR-010-data-layer.md) | PostgreSQL + S3/MinIO, Prisma + Drizzle dual ORM |
| API | [ADR-011](docs/adr/ADR-011-api-framework.md) | Fastify + NestJS adapter + Zod |
| CI/CD | [ADR-012](docs/adr/ADR-012-ci-cd-pipeline.md) | GitHub Actions + Turborepo cache + Changesets |
| Config | [ADR-013](docs/adr/ADR-013-configuration-management.md) | Zod-validated env vars, fail-fast startup |
| Automation | [ADR-014](docs/adr/ADR-014-automation-strategy.md) | Event-driven pipelines, quality gates |
| Architecture | [ADR-015](docs/adr/ADR-015-application-architecture-patterns.md) | Hexagonal + VSA hybrid, DDD, modular monolith first |
| Coding standards | [ADR-016](docs/adr/ADR-016-coding-standards-principles.md) | CUPID, TypeScript strict, neverthrow, FOOP |
| Service comms | [ADR-017](docs/adr/ADR-017-service-communication.md) | tRPC internal, TypeSpec/OpenAPI external |
| Agentic coding | [ADR-018](docs/adr/ADR-018-agentic-coding-conventions.md) | Guard Functions, SDD, context rot, context collapse prevention, file size |
| Ideation, decisions | [ADR-019](docs/adr/ADR-019-ideation-decision-protocols.md) | Anti-sycophancy, reasoning frameworks, structured ideation |
| Spec-driven dev | [ADR-020](docs/adr/ADR-020-spec-driven-development.md) | EARS requirements, contract-first API, quality gates, formal methods |
| Context collapse | [ADR-021](docs/adr/ADR-021-context-collapse-prevention.md) | 10 failure modes, 5-layer prevention, persona drift detection, OWASP ASI |
| Memory governance | [ADR-022](docs/adr/ADR-022-memory-governance.md) | SSGM gates, temporal decay, poisoning prevention, virtual memory |

## Package Layout

```text
apps/                        # Deployable services
  api-gateway/               # Public API (Fastify/NestJS)
  worker-service/            # BullMQ job processors + Playwright
  scheduler-service/         # URL frontier, job production
packages/                    # Shared libraries (never depend on apps/)
  core/                      # Domain types, value objects, errors
  config/                    # Zod-validated configuration
  redis/                     # Redis client + circuit breaker
  observability/             # OpenTelemetry + Pino
  database/                  # Prisma client + Drizzle schemas
  validation/                # Zod schemas
  testing/                   # Test utilities, fixtures
  eslint-config/             # Shared ESLint config
infra/                       # Infrastructure code
  docker/                    # Dockerfiles, docker-compose.dev.yml
  k8s/                       # Kustomize overlays
  pulumi/                    # TypeScript IaC
```

## Feature Structure (within each app)

```text
src/features/<feature>/
  domain/                    # Entities, value objects, errors
  application/               # Commands, queries, handlers
  infrastructure/            # Repository implementations
  presentation/              # Controllers, DTOs (Zod schemas)
  requirements.md            # EARS requirements + acceptance criteria (ADR-020)
  design.md                  # Architecture, interfaces, data models (ADR-020)
  tasks.md                   # Implementation tasks traceable to requirements
  <feature>.module.ts        # NestJS module wiring
```

## Coding Rules

### MUST (blocking — code that breaks these will not be merged)

1. **TypeScript strict**: `strict: true`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `noImplicitOverride`
2. **No `any`**: Use `unknown` + Zod validation instead. `@typescript-eslint/no-explicit-any` is an error
3. **Explicit types**: Always annotate function parameters and return types
4. **File size ≤200 lines target (300 hard limit)**: Split along feature/responsibility boundaries. Files over 300 lines MUST be split. _Rationale: 200 lines ≈ 4K tokens of context; 300 lines ≈ 6K tokens. This is a context budget constraint — files must fit within an agent's attention window without crowding out other necessary context._
5. **Direct imports**: No `index.ts` barrel re-exports. Import from specific files: `import { X } from './feature/x.service'`
6. **neverthrow for domain errors**: `Result<T, DomainError>` in domain layer; `try/catch` only at HTTP/adapter boundary
7. **Zod schema-first**: Define Zod schema before handler code. Derive types with `z.infer<typeof Schema>`
8. **Real infra tests**: Testcontainers for Redis/PG/S3 integration tests. Never `jest.mock('redis')`
9. **OTel first import**: `import './otel'` must be the first line in `main.ts`
10. **Graceful shutdown**: Every service handles SIGTERM, drains in-flight work, flushes telemetry
11. **No secrets in code**: All secrets via External Secrets Operator → K8s Secrets → env vars
12. **Guard Function chain**: Run `pnpm turbo typecheck && pnpm turbo lint && pnpm turbo test` after EVERY logical change — all must pass before commit (see G5 above)
13. **Feature branches**: Never commit directly to `main` — always use `work/<task-slug>` branches (see G2 above)
14. **State tracker**: Create and maintain `docs/memory/session/YYYY-MM-DD-<slug>-state.md` from [template](docs/memory/session/STATE-TRACKER-TEMPLATE.md). Re-read "Current State" before every task. Update after every gate. (see G4, G7)

### SHOULD (expected — deviations need justification in code comment)

1. **CUPID over SOLID**: Quality as gradient (more/less composable) not binary compliance
2. **Pure functions in domain**: Deterministic, no side effects, composable
3. **Naming as context**: `calculateTotalOrderValueWithTax` not `calc`. Domain ubiquitous language everywhere
4. **Spec-Driven Development**: EARS requirements in `requirements.md` → `design.md` → `tasks.md` before new features (ADR-020)
5. **Co-location**: Handler, service, schema, types, and tests in same feature folder (VSA)
6. **Discriminated unions**: Use `_tag` literal fields for variant types
7. **`using` keyword**: TC39 `Symbol.dispose` for deterministic resource cleanup (connections, locks)
8. **Composable concurrency**: `async/await` for I/O; `worker_threads` for CPU-bound only
9. **Context collapse prevention**: Place critical context at start/end of prompts (not middle); re-read state tracker before every task; monitor for persona drift (ADR-021)
10. **Memory governance**: SSGM gates (relevance, evidence, coherence) for memory promotion; temporal decay for stale entries (ADR-022)
11. **Ambiguity resolution**: When requirements are ambiguous, ask clarifying questions rather than guessing — silent progress reduces resolve rates from 48.8% to 28% (AMBIG-SWE, ICLR 2026)
12. **Review-by-explanation**: Before approving AI-generated code, verify you can explain the implementation to a colleague — prevents critical thinking atrophy (Generation-then-Comprehension pattern: 86% comprehension vs 50% for copy-paste delegation)
13. **Sliding window context**: Current task = full context; completed tasks = compressed summaries; state tracker = always full
14. **Human-written context files**: AI may draft AGENTS.md / CLAUDE.md / instructions, but human reviews and rewrites before they become authoritative (ETH Zurich finding)
15. **Living specs**: When code diverges from `design.md` or `requirements.md`, update the spec in the same commit. Stale specs are flagged by G11 (`pnpm verify:specs`).

### NEVER (hard boundaries — these are architectural invariants)

1. Domain layer imports infrastructure code (dependency rule: inward only)
2. Circular dependencies between packages (`import-x/no-cycle`)
3. Mocking Redis, PostgreSQL, or S3 in integration tests
4. Committing `.env` files or secrets
5. Using `--force` on shared branches
6. Bypassing ESLint with `eslint-disable` without explicit justification comment
7. Introducing new dependencies without checking ADR-001 approved list

## Error Handling

| Layer | Approach | Library |
| --- | --- | --- |
| Domain | `Result<T, DomainError>` | neverthrow |
| Infrastructure | `try/catch` or Effect-TS | built-in / effect |
| HTTP boundary | `try/catch` → HTTP response + correlation ID | built-in |

```typescript
// Domain error type (discriminated union)
type AppError =
  | { _tag: 'NotFound'; resource: string; id: string }
  | { _tag: 'Validation'; field: string; message: string }
  | { _tag: 'Unauthorized'; reason: string }
  | { _tag: 'InfraFailure'; service: string; cause: unknown };
```

## Naming Conventions

| Artifact | Convention | Example |
| --- | --- | --- |
| Files | kebab-case | `user-repository.ts` |
| Classes | PascalCase | `UserRepository` |
| Interfaces | PascalCase (no `I` prefix) | `UserRepository` |
| Functions | camelCase | `findUserById` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_RETRY_ATTEMPTS` |
| Zod schemas | PascalCase + Schema | `CreateUserSchema` |
| Env vars | SCREAMING_SNAKE_CASE | `REDIS_CLUSTER_URL` |
| BullMQ queues | kebab-case | `crawl-jobs` |
| Domain events | PascalCase past tense | `CrawlCompleted` |
| EARS requirements | `REQ-<FEATURE>-NNN` format | `REQ-CRAWL-001` |

## Common Commands

```bash
pnpm install                          # Install all dependencies
pnpm turbo build                      # Build all packages
pnpm turbo test                       # Run all tests
pnpm turbo lint                       # Lint all packages
pnpm turbo typecheck                  # Type check all packages
pnpm turbo test --filter=<package>    # Test specific package
pnpm changeset                        # Create a changeset for versioning

# Gate verification scripts (MANDATORY — use these, not raw turbo)
pnpm verify:guards                    # G5: typecheck+lint+test with retry (3 attempts)
pnpm verify:gates                     # G2/G4/G6/G8/G9: Audit git history + artifacts
pnpm verify:specs                     # G11: Verify specs updated for implemented code
pnpm verify:session                   # All gates: Full session compliance check
pnpm verify:all                       # Run all verification scripts sequentially
```

## PR Review Process

PRs reviewed by [AI council](docs/conventions/pr-review-council.md): 6 voting members, >75% consensus, checks ADR compliance + test coverage + security. The RALPH loop (Analysis → Deliberation → Vote) runs iteratively until all sustained Critical/Major findings are resolved — no unaddressed betterments or issues may remain. Reviewers must explain the implementation before approving (SHOULD #12). G8 always requires a Review Agent — self-review alone is never sufficient.

## Human-AI Task Allocation

| Task Type | AI Strength | Human Strength | Allocation |
| --- | --- | --- | --- |
| Boilerplate, scaffolding | High (speed, consistency) | Low (tedious) | AI generates, human spot-checks |
| Bug fixes with clear repro | High (systematic search) | Medium | AI proposes fix, human validates |
| Architecture decisions | Medium (option generation) | High (judgment, context) | AI generates options + evidence, human decides |
| Security-critical code | Medium (pattern matching) | High (adversarial thinking) | AI drafts, human reviews thoroughly |
| Novel algorithms | Low (recombination only) | High (creativity) | Human designs, AI implements + tests |
| Spec writing | Medium (structure, coverage) | High (domain knowledge) | AI drafts from template, human validates + rewrites |

## Documentation

- All `docs/` subdirectories have an `index.md` with provenance
- ADRs: `docs/adr/ADR-NNN-slug.md` using [TEMPLATE](docs/adr/TEMPLATE.md)
- Worklogs: `docs/worklogs/YYYY-MM-DD-topic.md` — **MUST be kept current** (see below)
- Memory: `docs/memory/session/` → `short-term/` → `long-term/`

### Worklog Policy (MUST)

- Every task set MUST produce a worklog entry in `docs/worklogs/YYYY-MM-DD-topic.md`
- Worklogs record: what changed, files created/modified, decisions made, deferred items, learnings
- The `docs/worklogs/index.md` MUST be updated in the same commit as the worklog
- Stale worklogs (task completed but no worklog) are a Gate G9 violation

### Learning Feedback Loop (MUST)

After every task set, trigger the learning feedback loop:

1. **Capture**: Record learnings in worklog (what worked, what didn't, surprises)
2. **Promote**: Apply [Memory Promotion Workflow](docs/guidelines/memory-promotion-workflow.md) — session → short-term → long-term → project docs
3. **Maintain**: Apply [Doc Maintenance](docs/skills/doc-maintenance.md) — update indexes, cross-references, provenance
4. **Improve**: Feed validated learnings back into rules, skills, instructions, and ADRs

This is not optional — skipping the feedback loop leads to context rot (ADR-021) and repeated mistakes.

## Quick Reference

1. Branch safety: never commit to `main` — always `work/<slug>`
2. Guard functions: `pnpm turbo typecheck && pnpm turbo lint && pnpm turbo test` before EVERY commit
3. Spec-first: read `requirements.md` / `design.md` / `tasks.md` before writing code
4. State tracker: create and update `docs/memory/session/YYYY-MM-DD-<slug>-state.md`
5. No `any`, no mocked infra, no barrel imports, no `eslint-disable` without justification
6. Spec update: run `pnpm verify:specs` after G10 — update `tasks.md` checkboxes + living specs

---

> **Provenance**: Created 2026-03-25 per ADR-018 §4. Updated 2026-03-25: G1–G10 gates, ADR-020 SDD, ADR-021/022, context collapse prevention, AMBIG-SWE, review-by-explanation. Updated 2026-03-25: added three-tier boundaries (REQ-AGENT-004), positional layout (REQ-AGENT-055), quick reference. Updated 2026-03-26: added G11 Spec Update gate.
