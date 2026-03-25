# Testing Rules

## Framework

- Vitest for all tests — not Jest
- Testcontainers for Redis, PostgreSQL, S3 integration tests
- fast-check for property-based tests
- Pact for contract tests
- Never mock infrastructure — real containers only

## TDD Cycle

1. **RED**: Write failing tests from spec + interface contracts. No production code access.
2. **GREEN**: Write minimum production code to pass. No test modifications.
3. **REFACTOR**: Clean up with green tests as safety net. All tests + lint must still pass.

## Test Pyramid

| Level | Target | Naming | Infrastructure |
| --- | --- | --- | --- |
| Unit | 65% | `*.unit.test.ts` | None |
| Integration | 20% | `*.integration.test.ts` | Testcontainers |
| Contract | 10% | `*.contract.test.ts` | Pact / Schemathesis |
| E2E | 5% | `*.e2e.test.ts` | Full stack |

## Coverage

- ≥80% line coverage, ≥75% branch coverage on new code
- Co-locate tests: `feature.service.ts` → `feature.service.test.ts`
- Each test references its requirement: `// Validates REQ-XXX-NNN`

## Property Tests

- Map EARS `shall` clauses to fast-check properties
- Comment: `// Property for REQ-XXX-NNN: <shall clause>`
- ≥85% of EARS `shall` clauses must have properties
- Critical algorithms (rate limiter, circuit breaker, token bucket, URL dedup) require formal properties
