# Architecture Decision Records

ADRs document significant architectural decisions. All follow the [ADR Template](TEMPLATE.md).

| ADR | Decision | Status |
| --- | --- | --- |
| [001: Monorepo Tooling](ADR-001-monorepo-tooling.md) | Turborepo + pnpm, apps/packages split | Accepted |
| [002: Job Queue](ADR-002-job-queue-system.md) | BullMQ + Dragonfly, per-domain rate limits | Accepted |
| [003: IaC](ADR-003-infrastructure-as-code.md) | Pulumi (TypeScript) | Accepted |
| [004: GitOps](ADR-004-gitops-deployment.md) | ArgoCD + Kustomize | Accepted |
| [005: Local K8s](ADR-005-local-kubernetes.md) | k3d | Accepted |
| [006: Observability](ADR-006-observability-stack.md) | OpenTelemetry + Pino + Grafana | Accepted |
| [007: Testing](ADR-007-testing-strategy.md) | Vitest + Testcontainers + Pact + k6 | Accepted |
| [008: HTTP/Parsing](ADR-008-http-parsing-stack.md) | undici + cheerio + Playwright tiered | Accepted |
| [009: Resilience](ADR-009-resilience-patterns.md) | cockatiel, 7-layer stack, graceful shutdown | Accepted |
| [010: Data Layer](ADR-010-data-layer.md) | PostgreSQL + S3/MinIO, Prisma/Drizzle dual ORM | Accepted |
| [011: API](ADR-011-api-framework.md) | Fastify + NestJS adapter + Zod | Accepted |
| [012: CI/CD](ADR-012-ci-cd-pipeline.md) | GitHub Actions + Turborepo + Changesets | Accepted |
| [013: Config](ADR-013-configuration-management.md) | Zod-validated env vars, fail-fast, ESO | Accepted |
| [014: Automation](ADR-014-automation-strategy.md) | Event-driven pipelines, 7 automated loops | Accepted |
| [015: Architecture](ADR-015-application-architecture-patterns.md) | Hexagonal + VSA, DDD, modular monolith first | Accepted |
| [016: Coding Standards](ADR-016-coding-standards-principles.md) | CUPID, TypeScript strict, neverthrow, FOOP | Accepted |
| [017: Service Comms](ADR-017-service-communication.md) | tRPC internal, TypeSpec/OpenAPI external | Accepted |
| [018: Agentic Coding](ADR-018-agentic-coding-conventions.md) | Guard Functions, context rot, SDD, atomic tasks | Accepted |
| [019: Ideation/Decisions](ADR-019-ideation-decision-protocols.md) | Anti-sycophancy, reasoning frameworks, structured ideation | Accepted |
| [020: Spec-Driven Dev](ADR-020-spec-driven-development.md) | EARS requirements, contract-first API, quality gates | Accepted |
| [021: Context Collapse](ADR-021-context-collapse-prevention.md) | 10 failure modes, 5-layer prevention, OWASP ASI | Accepted |
| [022: Memory Governance](ADR-022-memory-governance.md) | SSGM gates, temporal decay, poisoning prevention | Accepted |
| [TEMPLATE](TEMPLATE.md) | Template for new ADRs | Active |

---

> **Provenance**: Created 2026-03-24. Condensed 2026-03-25: merged table + index into single table.
