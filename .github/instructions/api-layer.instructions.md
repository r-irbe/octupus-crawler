---
applyTo: "apps/api-gateway/src/**/*.ts"
---

## API Layer Standards

- Define Zod schema BEFORE handler function — derive types with `z.infer<typeof Schema>`
- Use `@fastify/type-provider-zod` for request/response validation
- Return proper HTTP status codes with correlation IDs in error responses
- Domain errors → `try/catch` at boundary → HTTP response with `Result.match()`
- Never expose internal error details to clients — log full error, return sanitized message
- All endpoints must have OpenAPI/TypeSpec contract defined before implementation
- Health endpoints required: `/health/live` (liveness), `/health/ready` (readiness)
