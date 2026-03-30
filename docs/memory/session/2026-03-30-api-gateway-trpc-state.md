# State Tracker: API Gateway tRPC Wiring

## Branch

`work/api-gateway-trpc`

## Tasks

| Task | Status | Commit |
| ---- | ------ | ------ |
| T-COMM-005: Wire tRPC router into api-gateway Fastify adapter | done | 0d9063b |

## Current State

G1-G8 complete. RALPH review: 3 sustained findings (F-001 SIGTERM, F-002 type cast, F-003 NOT_FOUND test) — all fixed and amended. G9-G11 + merge pending.

## Decisions

- Fastify standalone (not NestJS adapter) per ADR-011 — lightweight API gateway
- Mount tRPC at `/api/v1/trpc` via `@trpc/server/adapters/fastify`
- Health check at `/health` (outside tRPC for k8s probes)
- OTel first import per MUST #9

## Problems

(none yet)
