# ADR-007: Testing Strategy — Vitest + Testcontainers

| Field | Value |
| --- | --- |
| **Status** | Accepted |
| **Created** | 2026-03-24 |
| **Last Updated** | 2026-03-25 |
| **Author(s)** | Architecture Council |
| **Reviewers** | Architect, Skeptic, DevEx Advisor, SRE, Research Engineer Advisor |
| **Supersedes** | N/A |
| **Superseded By** | N/A |

## Context

A distributed crawler requires a comprehensive testing strategy that covers unit logic, infrastructure integration (Redis, PostgreSQL, S3), full pipeline end-to-end flows, and resilience under failure conditions. Tests must be fast in development, reliable in CI, and avoid flaky mocks.

## Decision Drivers

- Test execution speed (developer feedback loops)
- Native ESM and TypeScript support
- Real infrastructure testing (no mock Redis/PG)
- CI reliability (no flaky environment-dependent tests)
- Test coverage across the pyramid (unit → integration → e2e → chaos)
- Monorepo-aware parallel execution

## Considered Options

### Option A: Vitest + Testcontainers

**Pros:**

- Vitest: 5-10x faster than Jest, native ESM, TypeScript without transform
- Same API as Jest (minimal migration cost)
- Testcontainers: real Redis, PG, MinIO in Docker — no mocks for infra
- Workspace-aware: `vitest.workspace.ts` for cross-package execution
- Watch mode with instant re-run
- Built-in code coverage (v8 or istanbul)
- Testcontainers auto-cleanup prevents resource leaks

**Cons:**

- Testcontainers requires Docker (available in all target environments)
- Integration tests slower than unit tests (seconds vs ms)

### Option B: Jest + mocks

**Pros:**

- Largest ecosystem, most tutorials
- Built-in mocking, snapshot testing

**Cons:**

- Slow: transform pipeline for TypeScript/ESM
- ESM support still has rough edges
- Mock-heavy tests give false confidence — mock Redis doesn't catch Lua script bugs
- Heavy maintenance burden for mock fidelity

### Option C: Node.js native test runner

**Pros:**

- Zero dependencies
- Built into Node.js

**Cons:**

- Less mature assertion library
- No workspace-aware orchestration
- Limited watch mode
- No parallel workspace execution

## Decision

Adopt **Vitest** for all test levels with **Testcontainers** for integration tests.

### Test Pyramid (Target Distribution)

| Level | Proportion | Tool | What It Tests | Speed | Where |
| --- | --- | --- | --- | --- | --- |
| **Unit** | 65% | Vitest | Pure functions, parsers, URL normalization, config validation, domain logic | < 1s | Every package |
| **Integration** | 20% | Vitest + Testcontainers | BullMQ flows, PG queries, S3 operations, OTel emission | 5-30s | Per package |
| **Contract** | 10% | Vitest + Pact + Zod | API contracts (consumer-driven), config schemas, request/response shapes | < 1s | shared, api |
| **E2E** | 5% | Vitest + k3d | Full crawl pipeline: seed → schedule → fetch → parse → store | 1-5min | e2e package |
| **Load** | k6 (TypeScript) | Throughput, backpressure, autoscaling behavior | 5-15min | Scripts |
| **Chaos** | Litmus/ChaosMesh | Pod kills, network partitions, Redis failures | 5-15min | CI only |

### Configuration

```typescript
// vitest.workspace.ts
import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  'packages/shared',
  'packages/scheduler',
  'packages/worker',
  'packages/api',
  'packages/e2e',
]);
```

```typescript
// packages/worker/vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    testTimeout: 30_000, // Testcontainers startup
    hookTimeout: 60_000,
    pool: 'forks',       // Isolation for Testcontainers
  },
});
```

### Integration Test Pattern

```typescript
import { GenericContainer, StartedTestContainer } from 'testcontainers';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import Redis from 'ioredis';

describe('BullMQ job processing', () => {
  let redis: StartedTestContainer;
  let redisClient: Redis;

  beforeAll(async () => {
    redis = await new GenericContainer('redis:7-alpine')
      .withExposedPorts(6379)
      .start();
    redisClient = new Redis({
      host: redis.getHost(),
      port: redis.getMappedPort(6379),
    });
  });

  afterAll(async () => {
    await redisClient.quit();
    await redis.stop();
  });

  it('processes a crawl job end-to-end', async () => {
    // Test with REAL Redis, not mocks
  });
});
```

## Consequences

### Additional Test Types

**Property-based testing** (fast-check): Used for domain logic where input space is large — URL normalization, pagination, retry backoff calculations. fast-check generates random inputs and verifies invariants hold across all cases. Deterministic reproduction with fixed seed enables CI reproducibility; shrinking reduces counterexamples to minimal failing cases.

**EARS-derived property testing** (ADR-020 §6): Every EARS requirement has a corresponding fast-check property. The derivation is direct:

```text
EARS: "When <trigger>, the <system> shall <response>"
  → fc.assert(fc.property(triggerArbitrary, (input) => satisfiesResponse(system(input))))
```

Property coverage — what fraction of EARS requirements have corresponding property tests — is tracked alongside line coverage. LLM-generated property tests are acceptable but must be human-reviewed for property correctness (LLMs generate valid properties but coverage varies by model).

**Consumer-driven contract testing** (Pact): Combines with Dredd and Schemathesis to prevent the 47% backward-compatibility failure rate (arXiv 2410.13070). Pact workflow:

1. Consumer defines expected request/response interactions
2. Pact broker records contracts
3. Provider CI verifies all consumer contracts pass against live API
4. New provider versions must satisfy all existing consumer contracts before merge

Hybrid approach: OpenAPI (provider-side documentation) + Pact (consumer-side expectations) + Schemathesis (property-based API fuzzing from schema) is the 2026 contract testing best practice.

**Mutation testing** (Stryker): Applied to critical domain modules — Stryker modifies source code and verifies tests catch the mutation. Ensures test suite quality, not just coverage percentage.

**Load testing** (k6): TypeScript-based load test scripts with SLO assertions:

| Scenario | Tool | Frequency | SLO Assertion |
| --- | --- | --- | --- |
| API throughput | k6 | Pre-release | > 1000 req/s at p95 < 100ms |
| Queue backpressure | k6 + BullMQ metrics | Weekly | Workers scale within 30s of spike |
| Chaos resilience | Litmus/ChaosMesh | Monthly | System recovers within 60s of pod kill |

### Vitest Coverage Thresholds

```typescript
// vitest.config.ts
coverage: {
  provider: 'v8',
  reporter: ['text', 'lcov', 'html'],
  thresholds: {
    lines: 80,
    branches: 75,
    functions: 80,
    statements: 80,
  },
}
```

### Golden Rules for Distributed System Testing

1. Never mock Redis or DB in integration tests — use real containers
2. Test error paths as rigorously as happy paths
3. Test idempotency: calling the same mutation twice produces the same result
4. Test circuit breaker state transitions explicitly
5. Test graceful shutdown: in-flight requests must complete during SIGTERM
6. Test with Zod schema validation at boundaries — invalid input must not reach handlers

### Tests as Guard Functions (ADR-018)

In the agentic coding workflow, tests serve as **Guard Functions** — the deterministic verification half of Atomic Action Pairs. Every agent-generated code change must pass the Guard Function chain before commit:

```text
Generate → tsc --noEmit → eslint → vitest (unit) → vitest (integration) → Commit
         │                                                    │
         └──────── On failure: agent receives error trace, retries ┘
```

Guard Function test conventions:

- **Acceptance criteria tests**: Every spec.md Given/When/Then criterion maps to at least one test
- **Pure function unit tests**: Guard Functions can invoke pure domain functions with known inputs and assert outputs without mocking
- **Fast feedback**: Unit tests (Guard tier 1) must complete in < 5s; integration tests (Guard tier 2) in < 60s
- **Structured failure output**: Test failures must produce agent-parseable error messages with file, line, expected vs actual
- **Max 3 retries**: If Guard Functions fail 3 consecutive times on the same task, escalate to user

### Positive

- Tests against real infrastructure catch bugs mocks cannot
- Vitest speed keeps developer feedback loop tight
- Same test framework across all levels (no Jest + Cypress + etc.)
- Testcontainers auto-cleanup prevents leaked containers in CI
- k6 load tests verify autoscaling behavior before production

### Negative

- Integration tests require Docker available in all environments
- Integration test suite takes 30-60s (acceptable for CI)
- Testcontainers first run downloads container images (cached afterward)

### Risks

- Docker socket access in CI runners (mitigated: GitHub Actions has Docker by default)
- Testcontainers port conflicts in parallel test suites (mitigated: random port mapping)

## Validation

- Unit test execution: < 5s for all packages
- Integration test execution: < 60s for all packages
- CI total test time: < 5 minutes
- Code coverage > 80% for business logic, > 60% overall
- Zero flaky tests in last 100 CI runs

## Related

- [ADR-001: Monorepo Tooling](ADR-001-monorepo-tooling.md) — Turborepo orchestrates test pipeline
- [ADR-012: CI/CD Pipeline](ADR-012-ci-cd-pipeline.md) — Test stages in CI
- [ADR-002: Job Queue System](ADR-002-job-queue-system.md) — BullMQ tested via Testcontainers Redis
- [ADR-016: Coding Standards](ADR-016-coding-standards-principles.md) — neverthrow Result types simplify error path testing
- [ADR-018: Agentic Coding](ADR-018-agentic-coding-conventions.md) — Tests as Guard Functions in the agentic code loop
- [ADR-020: Spec-Driven Development](ADR-020-spec-driven-development.md) — EARS → property-based test derivation, Pact contract-first, Schemathesis, PromptPex for prompt testing

---

> **Provenance**: Created 2026-03-24; updated 2026-03-25 with testing pyramid, Pact, fast-check, Stryker, k6, coverage thresholds, golden rules, and Guard Function integration from [docs/research/ai_coding.md](../research/ai_coding.md). Added ADR-020 cross-reference for EARS-derived property testing. Updated 2026-03-25: expanded EARS-derived PBT workflow, Pact consumer-driven contract elaboration, LLM-generated property test guidance, 47% backward-compatibility citation from [docs/research/spec.md](../research/spec.md).
