---
applyTo: "**/*.ts"
---

## TypeScript Strict Mode Enforcement

- `exactOptionalPropertyTypes`: never assign `undefined` to optional props — use `delete` or omit
- `noUncheckedIndexedAccess`: array/map access returns `T | undefined` — always handle
- `noImplicitOverride`: must use `override` keyword for inherited methods
- `no-explicit-any`: use `unknown` + Zod `.parse()` or type narrowing instead
- Discriminated unions: use `_tag` literal field for all variant types
- File size: ≤200 lines target, 300 hard limit (token budget: ~4K / ~6K tokens)
- Direct imports only: `import { X } from './specific-file'` — no barrel `index.ts`
