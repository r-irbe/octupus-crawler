# Skill: ADR Compliance

| Field | Value |
| --- | --- |
| **ID** | `adr-compliance` |
| **Status** | Active |
| **Created** | 2026-03-24 |
| **Used By** | Implementation, DevOps, Review, All Agents |

## Purpose

Enables agents to verify that code and infrastructure changes comply with existing Architecture Decision Records. Acts as a pre-commit quality gate.

## Capabilities

### Compliance Check

For any proposed change, verify against the relevant ADR:

| Change Type | Check Against |
| --- | --- |
| New dependency | ADR-001 (approved deps), ADR-008 (HTTP/parsing) |
| Queue/job code | ADR-002 (BullMQ patterns) |
| Infrastructure | ADR-003 (Pulumi), ADR-004 (Kustomize), ADR-005 (k3d) |
| Observability | ADR-006 (OTel SDK) |
| Tests | ADR-007 (Vitest + Testcontainers, no infra mocks) |
| HTTP/parsing | ADR-008 (undici + cheerio + Playwright tiering) |
| Error handling | ADR-009 (cockatiel, graceful shutdown) |
| Data storage | ADR-010 (PG for metadata, S3 for pages) |
| API routes | ADR-011 (Fastify + Zod) |
| CI/CD | ADR-012 (GitHub Actions) |
| Configuration | ADR-013 (Zod env vars, no secrets in git) |
| Automation, pipelines | ADR-014 (event-driven, SLO-validated) |
| Architecture patterns | ADR-015 (Hexagonal+VSA, DDD bounded contexts) |
| Coding standards | ADR-016 (CUPID, FOOP, neverthrow, strict TypeScript, naming conventions, ESLint rules) |
| Service communication | ADR-017 (tRPC internal, TypeSpec/OpenAPI external, Temporal, Saga, Redis Streams, gRPC) |
| Agent-generated code | ADR-018 (Guard Functions, file ≤200 target / 300 hard limit, SDD, schema-first, Atomic Action Pairs) |
| Decision-making, ideation | ADR-019 (structured ideation, anti-sycophancy, incubation, reasoning frameworks) |
| Spec-driven development | ADR-020 (EARS requirements, three-document specs, contract-first API, property-based test derivation, quality gates, formal methods) |

### Compliance Output

```markdown
#### ADR Compliance Check

| ADR | Status | Notes |
| --- | --- | --- |
| ADR-002 | ✅ Compliant | Uses BullMQ with rate limiting |
| ADR-009 | ⚠️ Partial | Missing graceful shutdown handler |
| ADR-013 | ❌ Violation | Hardcoded Redis URL |

**Action Required**: [list of fixes needed]
```

## Rules

1. Every code change must pass ADR compliance before PR
2. Violations are classified: ❌ blocking, ⚠️ warning (must address before merge), ✅ compliant
3. If no ADR covers the change, flag for Architect Agent to evaluate

## Related

- [ADR Index](../adr/index.md)
- [ADR-018: Agentic Coding](../adr/ADR-018-agentic-coding-conventions.md) — Guard Functions, file size, SDD, schema-first
- [ADR-019: Ideation & Decision Protocols](../adr/ADR-019-ideation-decision-protocols.md) — Structured ideation, anti-sycophancy
- [ADR-020: Spec-Driven Development](../adr/ADR-020-spec-driven-development.md) — EARS compliance, contract-first API, quality gate dimensions
- [Architect Agent](../agents/architect.md)
- [Review Agent](../agents/review.md)

---

> **Provenance**: Created 2026-03-24 as part of the AI agent framework. Updated 2026-03-25: added ADR-014 through ADR-020 compliance rows. Fixed ADR-016/017 descriptions, added ADR-019/020 rows.
