---
applyTo: "packages/config/src/**/*.ts"
---

## Config Layer Rules

- Zod schema-first: define `z.object(...)` schema before any config access logic
- Derive types with `z.infer<typeof ConfigSchema>` — never hand-craft config types
- Return `Result<Config, ConfigError>` — fail-fast on startup, not at runtime
- No direct `process.env.KEY` access — always go through Zod-validated config
- Narrow types: use `z.enum()`, `z.literal()`, `z.number().int().positive()` — not `z.string()`
- Default values must be explicit in the schema, not implied
- Config keys use SCREAMING_SNAKE_CASE matching environment variable names
- All config secrets via External Secrets Operator → K8s Secrets → env vars
