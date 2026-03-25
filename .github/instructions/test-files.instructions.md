---
applyTo: "**/*.test.ts"
---

## Testing Conventions

- Use Vitest — not Jest
- Co-locate test files with source: `feature.service.ts` → `feature.service.test.ts`
- Never mock infrastructure (Redis, PostgreSQL, S3) — use Testcontainers
- Integration tests: `GenericContainer('redis:7-alpine')`, `GenericContainer('postgres:16-alpine')`
- Pure unit tests: no infra dependencies, fast assertions
- Property tests: use fast-check with `*.property.test.ts` naming convention
- Each test references the requirement it validates: `// Validates REQ-XXX-NNN`

## Test Pyramid Targets

- 65% unit, 20% integration, 10% contract, 5% e2e
- Naming convention: `*.unit.test.ts`, `*.integration.test.ts`, `*.contract.test.ts`, `*.e2e.test.ts`

## Patterns

- Arrange-Act-Assert structure
- One assertion concept per test (multiple assertions OK if same concept)
- Test data builders over raw object literals
- Deterministic cleanup with `using` or `afterEach`
