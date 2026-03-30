# State Tracker: API Gateway tRPC Wiring

## Branch

`work/api-gateway-trpc`

## Tasks

| Task | Status | Commit |
| ---- | ------ | ------ |
| T-COMM-005: Wire tRPC router into api-gateway Fastify adapter | done | f33c685 |

## Current State

G1-G7 complete. Committed. Pending G8 RALPH, G9 worklog, G10-G11 report + spec + merge.

## Decisions

- Fastify standalone (not NestJS adapter) per ADR-011 — lightweight API gateway
- Mount tRPC at `/api/v1/trpc` via `@trpc/server/adapters/fastify`
- Health check at `/health` (outside tRPC for k8s probes)
- OTel first import per MUST #9

## Problems

(none yet)
