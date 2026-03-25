# Architecture Decision Records

Architecture Decision Records (ADRs) document significant architectural decisions with context, considered alternatives, and rationale. All ADRs follow the [ADR Template](TEMPLATE.md).

## Documents

| Document | Description | Status | Last Updated |
| --- | --- | --- | --- |
| [ADR-001: Monorepo Tooling](ADR-001-monorepo-tooling.md) | Turborepo + pnpm for monorepo management | Accepted | 2026-03-25 |
| [ADR-002: Job Queue System](ADR-002-job-queue-system.md) | BullMQ + Redis/Dragonfly for task distribution | Accepted | 2026-03-25 |
| [ADR-003: Infrastructure as Code](ADR-003-infrastructure-as-code.md) | Pulumi (TypeScript) for IaC | Accepted | 2026-03-24 |
| [ADR-004: GitOps Deployment](ADR-004-gitops-deployment.md) | ArgoCD + Kustomize for declarative deployment | Accepted | 2026-03-24 |
| [ADR-005: Local Kubernetes](ADR-005-local-kubernetes.md) | k3d for local development and CI | Accepted | 2026-03-24 |
| [ADR-006: Observability Stack](ADR-006-observability-stack.md) | OpenTelemetry + Pino + Grafana Stack | Accepted | 2026-03-25 |
| [ADR-007: Testing Strategy](ADR-007-testing-strategy.md) | Vitest + Testcontainers + Pact + k6 | Accepted | 2026-03-25 |
| [ADR-008: HTTP & Parsing Stack](ADR-008-http-parsing-stack.md) | undici + cheerio + Playwright tiered fetching | Accepted | 2026-03-24 |
| [ADR-009: Resilience Patterns](ADR-009-resilience-patterns.md) | cockatiel + 7-layer resilience stack + graceful shutdown | Accepted | 2026-03-25 |
| [ADR-010: Data Layer](ADR-010-data-layer.md) | PostgreSQL + S3/MinIO + Prisma/Drizzle dual ORM | Accepted | 2026-03-25 |
| [ADR-011: API Framework](ADR-011-api-framework.md) | Fastify + NestJS adapter with Zod type provider | Accepted | 2026-03-25 |
| [ADR-012: CI/CD Pipeline](ADR-012-ci-cd-pipeline.md) | GitHub Actions + Turborepo + Changesets | Accepted | 2026-03-25 |
| [ADR-013: Configuration Management](ADR-013-configuration-management.md) | Zod-validated env vars + ConfigMaps + ESO | Accepted | 2026-03-24 |
| [ADR-014: Automation Strategy](ADR-014-automation-strategy.md) | Event-driven automation: 7 pipelines, triggers, metrics, SLOs | Accepted | 2026-03-24 |
| [ADR-015: Application Architecture](ADR-015-application-architecture-patterns.md) | Hexagonal + VSA hybrid, DDD, modular monolith first | Accepted | 2026-03-25 |
| [ADR-016: Coding Standards](ADR-016-coding-standards-principles.md) | CUPID, TypeScript strict, neverthrow, naming conventions | Accepted | 2026-03-25 |
| [ADR-017: Service Communication](ADR-017-service-communication.md) | tRPC, TypeSpec/OpenAPI, Temporal, Sagas, event-driven | Accepted | 2026-03-25 |
| [ADR-018: Agentic Coding](ADR-018-agentic-coding-conventions.md) | Guard Functions, context rot, SDD, atomic tasks, schema-first | Accepted | 2026-03-25 |
| [ADR-019: Ideation & Decision Protocols](ADR-019-ideation-decision-protocols.md) | Anti-sycophancy, reasoning frameworks, structured ideation, human–AI collaboration | Accepted | 2026-03-25 |
| [ADR-020: Spec-Driven Development](ADR-020-spec-driven-development.md) | EARS requirements, spec hierarchy, contract-first API, evidence-driven quality gates, formal methods | Accepted | 2026-03-25 |
| [TEMPLATE](TEMPLATE.md) | Template for creating new ADRs | Active | 2026-03-24 |

## Index

- [ADR-001: Monorepo Tooling](ADR-001-monorepo-tooling.md) — Turborepo + pnpm with apps/packages split and Changesets versioning
- [ADR-002: Job Queue System](ADR-002-job-queue-system.md) — BullMQ + Dragonfly for crawl task distribution with per-domain rate limiting
- [ADR-003: Infrastructure as Code](ADR-003-infrastructure-as-code.md) — Pulumi TypeScript for local-to-cloud portable infrastructure
- [ADR-004: GitOps Deployment](ADR-004-gitops-deployment.md) — ArgoCD + Kustomize overlays for declarative multi-env deployment
- [ADR-005: Local Kubernetes](ADR-005-local-kubernetes.md) — k3d for fast multi-node local clusters and CI testing
- [ADR-006: Observability Stack](ADR-006-observability-stack.md) — OpenTelemetry SDK + Pino structured logging + Grafana stack (RED/USE metrics)
- [ADR-007: Testing Strategy](ADR-007-testing-strategy.md) — Vitest + Testcontainers + Pact contract tests + fast-check + k6 load tests
- [ADR-008: HTTP & Parsing Stack](ADR-008-http-parsing-stack.md) — undici + cheerio (static) and Playwright (JS-rendered) tiered approach
- [ADR-009: Resilience Patterns](ADR-009-resilience-patterns.md) — cockatiel policies, 7-layer resilience stack, idempotency keys, graceful shutdown
- [ADR-010: Data Layer](ADR-010-data-layer.md) — PostgreSQL + S3/MinIO with Prisma/Drizzle dual ORM and Repository pattern
- [ADR-011: API Framework](ADR-011-api-framework.md) — Fastify + NestJS adapter with Zod validation and request lifecycle
- [ADR-012: CI/CD Pipeline](ADR-012-ci-cd-pipeline.md) — GitHub Actions + Turborepo caching + Changesets + multi-arch Docker + canary deploys
- [ADR-013: Configuration Management](ADR-013-configuration-management.md) — Type-safe config with fail-fast validation and K8s-native secrets
- [ADR-014: Automation Strategy](ADR-014-automation-strategy.md) — Event-driven automation with 7 pipelines, 134 opportunities, and self-improvement loops
- [ADR-015: Application Architecture](ADR-015-application-architecture-patterns.md) — Hexagonal + VSA hybrid, DDD (strategic + tactical), modular monolith first
- [ADR-016: Coding Standards](ADR-016-coding-standards-principles.md) — CUPID principles, FOOP paradigm, neverthrow errors, TypeScript strict, naming conventions
- [ADR-017: Service Communication](ADR-017-service-communication.md) — tRPC internal, TypeSpec/OpenAPI external, Temporal workflows, Saga patterns, Redis Streams events
- [ADR-018: Agentic Coding Conventions](ADR-018-agentic-coding-conventions.md) — Guard Functions, context rot mitigation, Spec-Driven Development, atomic tasks, schema-first, file size constraints
- [ADR-019: Ideation & Decision Protocols](ADR-019-ideation-decision-protocols.md) — Anti-sycophancy protocols, reasoning framework selection (CoT/ToT/GoT/SPIRAL), MAD safeguards, structured ideation, human–AI collaboration, mandatory incubation
- [ADR-020: Spec-Driven Development](ADR-020-spec-driven-development.md) — EARS requirements syntax, spec-anchored level, three-document structure, specification hierarchy, contract-first API (TypeSpec → Spectral → Dredd → Pact), property-based test derivation, evidence-driven 5-dimension quality gates, formal methods tier (TLA+), human-AI asymmetric collaboration
- [TEMPLATE](TEMPLATE.md) — Template for creating new Architecture Decision Records

---

> **Provenance**: Created 2026-03-24; updated 2026-03-25 with ADR-015 through ADR-020 and refreshed descriptions for updated ADRs.
