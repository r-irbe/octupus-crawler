# ADR-001: Monorepo Tooling — Turborepo + pnpm

| Field | Value |
| --- | --- |
| **Status** | Accepted |
| **Created** | 2026-03-24 |
| **Last Updated** | 2026-03-25 |
| **Author(s)** | Architecture Council |
| **Reviewers** | Architect, Skeptic, SRE, DevOps Advisor, DevEx Advisor |
| **Supersedes** | N/A |
| **Superseded By** | N/A |

## Context

We need a monorepo management strategy for a distributed web crawler consisting of multiple packages (scheduler, worker, API, shared libraries, e2e tests) plus infrastructure code (Pulumi, Kustomize). The tooling must provide fast builds, strict dependency management, excellent caching, and CI-friendly task orchestration.

## Decision Drivers

- Build speed and caching (local + CI)
- Strict dependency isolation between packages
- TypeScript-first ecosystem
- Minimal configuration overhead
- CI/CD pipeline integration
- Developer experience (fast feedback loops)

## Considered Options

### Option A: Turborepo + pnpm

**Pros:**

- Sub-second incremental builds via content-aware hashing
- pnpm's strict node_modules layout prevents phantom dependencies
- Remote caching (Vercel or self-hosted) for CI
- Minimal config: `turbo.json` + `pnpm-workspace.yaml`
- Excellent TypeScript support
- Built-in task parallelization and dependency graph awareness

**Cons:**

- No code generation/scaffolding built-in
- Fewer first-party plugins than Nx

### Option B: Nx

**Pros:**

- Rich plugin ecosystem (generators, executors)
- Computation caching and affected commands
- Module boundary enforcement via lint rules
- Built-in code generation

**Cons:**

- Heavier configuration (project.json per package or inferred)
- Steeper learning curve
- Plugin lock-in can create migration friction
- Overkill for this project scope (5-6 packages)

### Option C: Plain pnpm Workspaces (no orchestrator)

**Pros:**

- Zero additional tooling
- Full control over scripts

**Cons:**

- No task caching
- Manual dependency graph management for builds
- No parallelization out of the box
- CI times scale linearly with package count

## Decision

Adopt **Turborepo + pnpm** as the monorepo tooling stack.

- pnpm for package management with strict hoisting
- Turborepo for task orchestration, caching, and parallelization
- pnpm-workspace.yaml defines the workspace topology
- turbo.json defines the build/test/lint pipeline with dependency ordering

### Package Layout

```text
/
├── apps/
│   └── api-gateway/         # Fastify + tRPC HTTP API + crawler monolith
├── packages/
│   ├── core/                # Shared domain types, value objects, errors
│   ├── redis/               # Redis client abstraction + circuit breaker
│   ├── observability/       # OpenTelemetry bootstrap, structured logging (Pino)
│   ├── validation/          # Zod schemas, shared validation utilities
│   ├── config/              # Environment schema validation (Zod) — see ADR-013
│   ├── testing/             # Shared test utilities, fixtures, factories
│   ├── database/            # Prisma client, Drizzle schemas, migrations — see ADR-010
│   └── eslint-config/       # Shared ESLint configuration — see ADR-016
├── infra/
│   ├── docker/              # Dockerfiles per service, docker-compose.dev.yml
│   ├── k8s/                 # Kubernetes manifests (Kustomize overlays) — see ADR-004
│   └── pulumi/              # TypeScript IaC — see ADR-003
├── .github/
│   └── workflows/           # GitHub Actions CI/CD — see ADR-012
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
└── tsconfig.base.json       # Shared strict TypeScript config — see ADR-016
```

The `apps/` directory contains deployable services; `packages/` contains shared libraries consumed by apps. This separation ensures that `packages/` never depend on `apps/`, maintaining a clean dependency graph.

### Versioning

**Changesets** is adopted for automated semantic versioning of packages:

- Developers create changeset files describing changes (`pnpm changeset`)
- CI generates `CHANGELOG.md` entries and version bumps automatically
- Versioning follows SemVer for all public packages

### Developer Toolchain

- **EditorConfig** + `.nvmrc` / `.node-version` pin the Node.js runtime version
- **Husky + lint-staged** enforce quality gates on pre-commit (ESLint fix, Prettier format)
- **pnpm workspace protocol** (`workspace:*`) for cross-package references

## Consequences

### Agentic Foundation

Monorepos provide AI agents with a **unified workspace view**, enabling dependency tracing and cross-module understanding that is structurally impossible across distributed repositories (see [ADR-018](ADR-018-agentic-coding-conventions.md)):

- **Project graph**: Turborepo's structured dependency map lets agents determine blast radius from a single call rather than grepping imports
- **Domain taxonomy**: `apps/` and `packages/` classification gives agents the same high-level architecture map a senior engineer holds, enabling progressive exploration from domain → package → file
- **Atomic cross-project changes**: Cross-service refactors happen in one PR, tested by Turborepo's affected-project detection, with agents iterating in a single session until CI is green
- **Remote caching**: Tasks that have run with the same inputs are restored from cache, making agent feedback loops (Guard Function CI) dramatically faster

### File Size and Import Conventions

To mitigate context rot (ADR-018 §1), the following conventions apply across all packages:

- **File size target**: Implementation files under 200–300 lines. Files exceeding 300 lines must be split along feature or responsibility boundaries
- **Explicit imports over barrel files**: `index.ts` barrel re-exports hide structure from agent file-traversal reasoning. Use direct imports (`import { X } from './feature/x.service'`) to preserve dependency topology
- **Dependency topology preservation**: Explicit imports over barrel re-exports enable agents to navigate import chains structurally rather than lexically

### Positive

- 10x faster CI via remote cache hits on unchanged packages
- Phantom dependency prevention catches import errors early
- Simple config that engineers can understand in minutes
- Parallel test execution across packages
- Unified workspace view enables reliable AI agent operations (ADR-018)

### Negative

- No built-in code generators (mitigated by simple `scripts/` helpers if needed)
- Remote cache requires either Vercel account or self-hosted server

### Risks

- Turborepo feature set may lag behind Nx for advanced needs (low risk — our scope is bounded)
- pnpm major version upgrades can occasionally break workspace compatibility (mitigated by lockfile + CI)

## Validation

- CI build times: target < 2 minutes for incremental, < 5 minutes for full
- Cache hit rate > 80% in CI for non-code-change PRs
- Zero phantom dependency errors in production

## Related

- [ADR-012: CI/CD Pipeline](ADR-012-ci-cd-pipeline.md) — Turborepo caching in GitHub Actions
- [ADR-015: Architecture Patterns](ADR-015-application-architecture-patterns.md) — Feature-based folder structure within each app/package
- [ADR-016: Coding Standards](ADR-016-coding-standards-principles.md) — Shared ESLint config and TypeScript strict settings
- [ADR-018: Agentic Coding](ADR-018-agentic-coding-conventions.md) — Monorepo as agentic foundation, file size constraints, barrel file guidance

---

> **Provenance**: Created 2026-03-24; updated 2026-03-25 with extended package topology, Changesets versioning, developer toolchain, and agentic monorepo rationale from [docs/research/ai_coding.md](../research/ai_coding.md).

## Related

- [ADR-012: CI/CD Pipeline](ADR-012-ci-cd-pipeline.md) — uses Turborepo caching in GitHub Actions
- [ADR-007: Testing Strategy](ADR-007-testing-strategy.md) — Vitest task orchestration via Turborepo

---

> **Provenance**: Created 2026-03-24 during initial architecture design phase. Based on analysis of monorepo tooling landscape for TypeScript/Node.js distributed systems.
