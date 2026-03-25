# Skill: Test Generation

| Field | Value |
| --- | --- |
| **ID** | `test-generation` |
| **Status** | Active |
| **Created** | 2026-03-24 |
| **Used By** | Test, Implementation |

## Purpose

Write effective tests at all pyramid levels following ADR-007 patterns.

## Capabilities

### Unit Tests (Vitest)

- Test pure functions, parsers, validators
- Test configuration schemas
- Test URL normalization, dedup logic
- Fast, no external dependencies

### Integration Tests (Vitest + Testcontainers)

- Real Redis via `GenericContainer('redis:7-alpine')`
- Real PostgreSQL via `GenericContainer('postgres:16-alpine')`
- Real MinIO via `GenericContainer('minio/minio')`
- BullMQ job processing end-to-end
- Database query verification

### E2E Tests (Vitest + k3d)

- Full crawl pipeline tests
- Multi-service interaction tests

### Test Patterns

```typescript
// Unit: pure function
describe('normalizeUrl', () => {
  it('strips trailing slash', () => { /* ... */ });
  it('lowercases domain', () => { /* ... */ });
});

// Integration: Testcontainers
describe('CrawlJobProcessor', () => {
  let redis: StartedTestContainer;
  beforeAll(async () => {
    redis = await new GenericContainer('redis:7-alpine')
      .withExposedPorts(6379).start();
  });
  afterAll(async () => { await redis.stop(); });
  it('processes crawl job', async () => { /* ... */ });
});
```

## Rules

1. **No mocks for infrastructure** — use Testcontainers (ADR-007)
2. Test behavior, not implementation
3. One assertion concept per test
4. Descriptive test names: `it('returns 404 when URL not found')`
5. Clean up resources in afterAll/afterEach
6. **Tests are Guard Functions** (ADR-018 §2) — vitest is the third gate in the tsc → eslint → vitest chain
7. **Given/When/Then** acceptance criteria from spec.md define test cases (ADR-018 §3)
8. Pure functions first — easiest to verify with known inputs/outputs (ADR-018 §10)

## Related

- [ADR-007: Testing Strategy](../adr/ADR-007-testing-strategy.md)
- [ADR-016: Coding Standards](../adr/ADR-016-coding-standards-principles.md) — Pure function testing, naming conventions for test files
- [ADR-017: Service Communication](../adr/ADR-017-service-communication.md) — tRPC contract tests, Temporal workflow test patterns
- [ADR-018: Agentic Coding](../adr/ADR-018-agentic-coding-conventions.md) — Guard Functions, SDD, pure functions as primitives
- [ADR-020: Spec-Driven Development](../adr/ADR-020-spec-driven-development.md) — EARS → fast-check property derivation, Schemathesis API testing, Pact contracts
- [Test Agent](../agents/test.md)

---

> **Provenance**: Created 2026-03-24 as part of the AI agent framework. Updated 2026-03-25: added ADR-018 Guard Functions, SDD, pure function rules. Added ADR-016/017/020 cross-references.
