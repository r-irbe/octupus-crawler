// Integration test for enhanced /readyz with real Redis
// Validates: T-OBS-034 → REQ-OBS-030, ADR-007 Testcontainers

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Queue, type ConnectionOptions } from 'bullmq';
import { startRedisContainer, type ManagedRedisContainer } from '@ipf/testing/containers/redis';
import { BullMQConnectionSchema } from '@ipf/job-queue/connection-config';
import type { BullMQConnection } from '@ipf/job-queue/connection-config';
import { createReadinessCheck } from './readiness-check.js';

let redis: ManagedRedisContainer;
let connection: BullMQConnection;

beforeAll(async () => {
  redis = await startRedisContainer();
  connection = BullMQConnectionSchema.parse({
    host: redis.connection.host,
    port: redis.connection.port,
  });
}, 30_000);

afterAll(async () => {
  await redis.stop();
});

describe('T-OBS-034: readiness check with real Redis', () => {
  it('returns 200 when Redis is reachable', async () => {
    // Use BullMQ Queue's client to get an ioredis instance
    const queue = new Queue('readyz-test', { connection: connection as ConnectionOptions });
    const client = await queue.client;

    const check = createReadinessCheck({ redis: { ping: () => client.ping() } });
    const result = await check();

    expect(result.status).toBe(200);
    expect(result.components['redis']).toBe('ok');

    await queue.close();
  });

  it('returns 503 when Redis is unreachable', async () => {
    const failingRedis = {
      ping: (): Promise<string> => Promise.reject(new Error('ECONNREFUSED')),
    };

    const check = createReadinessCheck({ redis: failingRedis });
    const result = await check();

    expect(result.status).toBe(503);
    expect(result.components['redis']).toBe('unreachable');
  });

  it('returns 200 with only configured components', async () => {
    const queue = new Queue('readyz-only-redis', { connection: connection as ConnectionOptions });
    const client = await queue.client;

    const check = createReadinessCheck({ redis: { ping: () => client.ping() } });
    const result = await check();

    expect(result.components['postgres']).toBeUndefined();
    expect(result.status).toBe(200);

    await queue.close();
  });
});
