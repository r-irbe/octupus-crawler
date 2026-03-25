# Code Style Rules

## TypeScript Strict

- `strict: true`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `noImplicitOverride`
- No `any` — use `unknown` + Zod `.parse()` or type narrowing
- Explicit return type annotations on all functions
- Discriminated unions use `_tag` literal field

## File Size

- Target: ≤200 lines (~4K tokens of context)
- Hard limit: 300 lines (~6K tokens) — MUST split
- Split along feature/responsibility boundaries, not arbitrary line counts

## Imports

- Direct imports only: `import { X } from './specific-file'`
- No barrel `index.ts` re-exports
- `import './otel'` must be first import in `apps/*/src/main.ts`

## Naming

| Artifact | Convention | Example |
| --- | --- | --- |
| Files | kebab-case | `user-repository.ts` |
| Classes | PascalCase | `UserRepository` |
| Interfaces | PascalCase (no `I` prefix) | `UserRepository` |
| Functions | camelCase | `findUserById` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_RETRY_ATTEMPTS` |
| Zod schemas | PascalCase + Schema | `CreateUserSchema` |

## Patterns

- Zod schema-first: define schema before handler code
- `neverthrow` `Result<T, DomainError>` in domain; `try/catch` only at boundary
- VSA: co-locate handler, service, schema, types, tests per feature
- Atomic Action Pairs: generate → verify (typecheck) as indivisible unit
