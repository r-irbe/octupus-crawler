# Skill: Test Generation

**Agents**: Test, Implementation

Write effective tests at all pyramid levels following ADR-007.

## Test Levels

- **Unit** (Vitest): Pure functions, parsers, validators, config schemas. Fast, no external deps
- **Integration** (Vitest + Testcontainers): Real Redis (`redis:7-alpine`), PG (`postgres:16-alpine`), MinIO. BullMQ e2e, DB queries
- **E2E** (Vitest + k3d): Full crawl pipeline, multi-service interaction

## Rules

1. **No mocks for infrastructure** — Testcontainers only (ADR-007)
2. Test behavior, not implementation
3. One assertion concept per test
4. Descriptive names: `it('returns 404 when URL not found')`
5. Clean up resources in afterAll/afterEach
6. Tests are Guard Functions (ADR-018 §2) — vitest is gate 3 in tsc → eslint → vitest
7. Given/When/Then from `requirements.md` define test cases (ADR-020)
8. Pure functions first — easiest to verify (ADR-018 §10)
9. EARS requirements → fast-check property derivation (ADR-020)

## Related

- [ADR-007](../adr/ADR-007-testing-strategy.md), [ADR-018](../adr/ADR-018-agentic-coding-conventions.md), [ADR-020](../adr/ADR-020-spec-driven-development.md)
- [Test Agent](../agents/test.md)
