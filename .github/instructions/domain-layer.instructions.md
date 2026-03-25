---
applyTo: "packages/core/src/**/*.ts"
---

## Domain Layer Rules

- Use `neverthrow` `Result<T, DomainError>` for all domain errors — no thrown exceptions
- Pure functions: deterministic, no side effects, composable
- No infrastructure imports — domain NEVER imports from `infrastructure/` or `infra/`
- Discriminated unions: use `_tag` literal field for all variant types
- Naming: domain ubiquitous language everywhere — `calculateTotalOrderValueWithTax` not `calc`
- No `any` — use `unknown` + type narrowing or Zod `.parse()`
- Value objects are immutable — use `readonly` and `Readonly<T>`

## Vertical Slice Architecture

- Co-locate handler, service, schema, types, and tests in same feature folder
- Each feature slice is self-contained — no cross-feature dependencies
