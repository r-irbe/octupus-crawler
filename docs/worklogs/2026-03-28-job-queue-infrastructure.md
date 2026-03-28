# Worklog: BullMQ Job Queue Infrastructure

| Field | Value |
| --- | --- |
| **Date** | 2026-03-28 |
| **Branch** | `work/job-queue-infrastructure` |
| **Commit** | `ddd094d` |
| **Status** | Complete |

## Summary

Built `packages/job-queue` — the BullMQ adapter package that provides hexagonal infrastructure adapters for the three queue port interfaces defined across the monorepo. This package bridges the domain contracts (QueueBackend, JobConsumer, QueueAdapter) to the BullMQ library backed by Redis/Dragonfly.

## Files Created

| File | Lines | Description |
| --- | --- | --- |
| `packages/job-queue/package.json` | 33 | Package scaffold with bullmq@^5.52.0 |
| `packages/job-queue/tsconfig.json` | 10 | TypeScript config extending base |
| `packages/job-queue/vitest.config.ts` | 14 | Vitest config with 30s timeout for integration |
| `packages/job-queue/eslint.config.js` | 3 | ESLint shared config |
| `packages/job-queue/src/connection-config.ts` | 47 | Zod-validated Redis + queue config |
| `packages/job-queue/src/bullmq-queue-backend.ts` | 91 | QueueBackend adapter (addBulk, getQueueSize) |
| `packages/job-queue/src/bullmq-job-consumer.ts` | 53 | JobConsumer adapter (Worker lifecycle) |
| `packages/job-queue/src/bullmq-queue-adapter.ts` | 78 | QueueAdapter for control plane operations |
| `packages/job-queue/src/connection-config.unit.test.ts` | 99 | 14 unit tests for config validation |
| `packages/job-queue/src/bullmq-adapters.integration.test.ts` | 201 | 9 integration tests with Redis Testcontainer |

## Tests

- 14 unit tests: Zod schema validation, defaults, URL parsing
- 9 integration tests: addBulk, getQueueSize, getJobCounts, pause/resume, obliterate, lifecycle, idempotent close, end-to-end job processing
- Total: 23 new tests, all passing

## ADR Compliance

- ADR-002: BullMQ + Dragonfly — queue topology, exponential backoff, configurable attempts
- ADR-007: Testcontainers — real Redis for integration tests, no mocks
- ADR-013: Zod-validated config — two schemas (BullMQConnectionSchema, QueueConfigSchema)
- ADR-015: Hexagonal — adapters implement port interfaces, dependency rule satisfied

## RALPH Review

**Verdict: APPROVED** — 0 sustained Critical/Major findings. 6 findings all Informational/Minor (limiter deferred to app layer, error events deferred to app layer, 201-line test file).

## Tasks Unblocked

This package unblocks 13+ deferred tasks across 6 specs: T-WORK-010, T-DIST-013/014/015, T-LIFE-009/038/045/049, T-COORD-023, T-OBS-029/030/033/034, T-TEST-014/015/016/022.

## Decisions

- Worker `limiter` omitted from adapter — app-layer composition concern per Architect recommendation
- `parseRedisUrl` included for 12-factor app support (REDIS_URL env var)
- Factory function pattern (`createBullMQ*`) consistent with existing codebase conventions

## Learnings

- Zod v4 uses `nonnegative()` not `nonneg()` — caught by typecheck
- `@ipf/testing` exports Redis container under `./containers/redis` not `./containers/redis-container` — caught by typecheck
- BullMQ integration tests are fast (~1s for container reuse) when the Redis container is already running

---

> **Provenance**: Created 2026-03-28.
