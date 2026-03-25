---
applyTo: "packages/*/src/infra/**/*.ts"
---

## Infrastructure Layer Patterns

- Use Testcontainers for integration tests — never mock Redis, PostgreSQL, or S3
- Use `cockatiel` circuit breakers for external service calls
- Resource cleanup: use `using` keyword with `Symbol.dispose` for connections, locks, file handles
- Never use try/finally for resource cleanup when `using` is available
- Connection pooling is mandatory for database access
- All external calls must have timeout configuration
- Log connection lifecycle events with structured logging (Pino)

## Error Handling

- `try/catch` at infrastructure boundary — wrap in domain `Result` types
- Never leak infrastructure error details to domain layer
- Circuit breaker states: closed → open → half-open — log all transitions
