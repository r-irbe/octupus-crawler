# Worklog: Redis Streams Publisher + Consumer

| Field | Value |
| --- | --- |
| Date | 2026-03-30 |
| Branch | `work/redis-streams-events` |
| Scope | NEW `packages/redis/` |
| Tasks | T-COMM-011, T-COMM-012 |
| Commit | `c287f48` |

## Summary

Created the `@ipf/redis` package implementing Redis Streams event infrastructure: a publisher (XADD) and consumer (XREADGROUP consumer groups) following the port/adapter pattern with `neverthrow` Result types.

## Changes

### New Files

- `packages/redis/package.json` — New package: ioredis, neverthrow, zod
- `packages/redis/tsconfig.json` — Extends tsconfig.base.json
- `packages/redis/eslint.config.js` — Shared ESLint config
- `packages/redis/vitest.config.ts` — Test config with JUnit reporter
- `packages/redis/src/connection.ts` — Zod-validated Redis connection config + URL parser
- `packages/redis/src/stream-publisher.ts` — EventPublisher port + RedisStreamPublisher adapter (XADD, pipeline batch, MAXLEN trimming)
- `packages/redis/src/stream-consumer.ts` — EventConsumer port + RedisStreamConsumer adapter (XREADGROUP, XACK, XAUTOCLAIM)
- `packages/redis/src/connection.unit.test.ts` — 8 tests for config validation + URL parsing
- `packages/redis/src/stream-publisher.unit.test.ts` — 10 tests for publish, batch, errors
- `packages/redis/src/stream-consumer.unit.test.ts` — 13 tests for createGroup, consume, ack, claimStale

## Decisions

1. **Standalone package** — `@ipf/redis` has no dependency on `@ipf/core` or `@ipf/api-router`. StreamEvent type is generic, not tied to domain events.
2. **Factory functions over classes** — `createRedisStreamPublisher()` / `createRedisStreamConsumer()` return plain objects implementing typed interfaces.
3. **XAUTOCLAIM via redis.call()** — ioredis lacks typed XAUTOCLAIM; used `redis.call()` with `XAutoClaimResult` type assertion.
4. **MAXLEN approximate trimming** — Default 100K entries with `~` for O(1) amortized trimming.

## RALPH Review

- **Verdict**: APPROVED (no sustained Critical/Major)
- SA1 (parseRedisUrl throws): consistent with job-queue pattern, not sustained
- SA3 (StreamEvent duplication): intentional — will converge when events move to core
- SA5 (integration test): deferred to T-COMM-024

## Test Results

- 31 new unit tests in @ipf/redis
- 1080 total tests passing across 17 packages

## Service Communication Progress

6/27 → 8/27 (30%)
