# AGENTS.md — AI Coding Agent Instructions for IPF Crawler

> **Canonical source of truth** for all AI coding agents (GitHub Copilot, Claude Code, Cursor, Windsurf, etc.).
> Tool-specific files (`CLAUDE.md`, `.github/copilot-instructions.md`, `.cursor/rules/`) extend this with tool-specific capabilities.

## Project Overview

IPF is a highly parallelized distributed web crawler built with TypeScript/Node.js, deployed on Kubernetes. Monorepo: Turborepo + pnpm.

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
| Agentic coding | [ADR-018](docs/adr/ADR-018-agentic-coding-conventions.md) | Guard Functions, SDD, context rot, file size |
| Ideation, decisions | [ADR-019](docs/adr/ADR-019-ideation-decision-protocols.md) | Anti-sycophancy, reasoning frameworks, structured ideation |
| Spec-driven dev | [ADR-020](docs/adr/ADR-020-spec-driven-development.md) | EARS requirements, contract-first API, quality gates, formal methods |

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
4. **File size ≤200 lines target (300 hard limit)**: Split along feature/responsibility boundaries. Files over 300 lines MUST be split
5. **Direct imports**: No `index.ts` barrel re-exports. Import from specific files: `import { X } from './feature/x.service'`
6. **neverthrow for domain errors**: `Result<T, DomainError>` in domain layer; `try/catch` only at HTTP/adapter boundary
7. **Zod schema-first**: Define Zod schema before handler code. Derive types with `z.infer<typeof Schema>`
8. **Real infra tests**: Testcontainers for Redis/PG/S3 integration tests. Never `jest.mock('redis')`
9. **OTel first import**: `import './otel'` must be the first line in `main.ts`
10. **Graceful shutdown**: Every service handles SIGTERM, drains in-flight work, flushes telemetry
11. **No secrets in code**: All secrets via External Secrets Operator → K8s Secrets → env vars

### SHOULD (expected — deviations need justification in code comment)

1. **CUPID over SOLID**: Quality as gradient (more/less composable) not binary compliance
2. **Pure functions in domain**: Deterministic, no side effects, composable
3. **Naming as context**: `calculateTotalOrderValueWithTax` not `calc`. Domain ubiquitous language everywhere
4. **Guard Function chain**: Run `tsc --noEmit && eslint && vitest run` locally before committing
5. **Spec-Driven Development**: EARS requirements in `requirements.md` → `design.md` → `tasks.md` before new features (ADR-020)
6. **Co-location**: Handler, service, schema, types, and tests in same feature folder (VSA)
7. **Discriminated unions**: Use `_tag` literal fields for variant types
8. **`using` keyword**: TC39 `Symbol.dispose` for deterministic resource cleanup (connections, locks)
9. **Composable concurrency**: `async/await` for I/O; `worker_threads` for CPU-bound only

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
```

## Guard Function Chain (run before every commit)

```bash
pnpm turbo typecheck && pnpm turbo lint && pnpm turbo test
```

On failure, agents retry up to 3 total attempts before escalating to user (ADR-018 §7).

## PR Review Process

PRs are reviewed by an [AI council](docs/conventions/pr-review-council.md) with 6 voting members and specialist advisors. >75% consensus required. Council checks ADR compliance, test coverage, security, and code quality.

## Documentation

- All `docs/` subdirectories have an `index.md`
- All documents require provenance (Created date, Updated date)
- ADRs: `docs/adr/ADR-NNN-slug.md` using [TEMPLATE](docs/adr/TEMPLATE.md)
- Worklogs: `docs/worklogs/YYYY-MM-DD-topic.md`
- Memory tiers: `docs/memory/session/` → `short-term/` → `long-term/`

---

> **Provenance**: Created 2026-03-25 as the tool-agnostic AI agent instruction file per ADR-018 §4 context engineering strategy. Updated 2026-03-25: added ADR-020 (SDD), EARS requirements naming, three-document spec structure.
