---
applyTo: "**/*.property.test.ts"
---

# Property-Based Testing Instructions

## Framework

- Use `fast-check` with Vitest (`vitest` + `@fast-check/vitest`)
- Name files `*.property.test.ts` to distinguish from example-based tests
- Import: `import { fc, test as fcTest } from '@fast-check/vitest'`

## EARS Mapping

Every property test MUST map to an EARS `shall` clause:

```typescript
// Property for REQ-CRAWL-001: The system shall validate all URLs against RFC 6890
fcTest.prop('rejects all RFC 6890 reserved IPs', [arbReservedIP], (ip) => {
  expect(validateUrl(`http://${ip}/`).isErr()).toBe(true);
});
```

## Arbitrary Generators

- Define custom arbitraries in `packages/testing/src/generators/`
- Name convention: `arb<Type>` (e.g., `arbReservedIP`, `arbDomainPolicy`, `arbCrawlJob`)
- Compose from `fc.record`, `fc.oneof`, `fc.constant` for domain types
- Use `fc.pre()` for preconditions instead of filtering

## Critical Algorithms

These algorithms MUST have formal fast-check properties:

- **Rate limiter**: token bucket invariants, burst handling, cross-domain isolation
- **Circuit breaker**: state transitions (closed→open→half-open), failure counting, recovery
- **Token bucket**: refill rate, capacity limits, concurrent access
- **URL deduplication**: normalization idempotency, canonical form uniqueness

## Coverage Target

- ≥85% of EARS `shall` clauses must have corresponding fast-check properties
- Each property references its requirement ID in a comment
- Run with `--reporter=verbose` to see property names in output

## Patterns

- **Roundtrip**: `decode(encode(x)) === x` for serialization
- **Idempotency**: `f(f(x)) === f(x)` for normalization
- **Invariant**: property holds for all inputs in domain
- **Oracle**: compare against known-correct reference implementation
