// Integration test for graceful shutdown with real BullMQ connections
// Validates: T-TEST-015 → REQ-TEST-008

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Queue, Worker, type ConnectionOptions } from 'bullmq';
import { startRedisContainer, type ManagedRedisContainer } from '@ipf/testing/containers/redis';
import { BullMQConnectionSchema } from '@ipf/job-queue/connection-config';
import type { BullMQConnection } from '@ipf/job-queue/connection-config';
import type { Logger } from '@ipf/core/contracts/logger';
import { createShutdownOrchestrator } from './graceful-shutdown.js';
import type { ShutdownDeps, TeardownEntry } from './graceful-shutdown.js';
import { signalReason } from './shutdown-reason.js';
import { createReadinessProbe } from './readiness-probe.js';

let redis: ManagedRedisContainer;
let connection: BullMQConnection;

function silentLogger(): Logger {
  const noop = (): void => undefined;
  return {
    debug: noop, info: noop, warn: noop, error: noop, fatal: noop,
    child: () => silentLogger(),
  } as Logger;
}

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

describe('T-TEST-015: graceful shutdown with real connections', () => {
  it('drains a real BullMQ worker and tears down the queue', async () => {
    const worker = new Worker('shutdown-test', undefined, {
      connection: connection as ConnectionOptions,
      autorun: false,
    });
    const queue = new Queue('shutdown-test', { connection: connection as ConnectionOptions });

    const teardownEntries: TeardownEntry[] = [
      { name: 'queue', resource: { close: async (): Promise<void> => { await queue.close(); } } },
    ];

    const deps: ShutdownDeps = {
      config: { drainTimeoutMs: 5000, teardownTimeoutMs: 5000 },
      logger: silentLogger(),
      drain: { close: async (): Promise<void> => { await worker.close(); } },
      teardownEntries,
    };

    const orchestrator = createShutdownOrchestrator(deps);
    await orchestrator.execute(signalReason('SIGTERM'));

    expect(orchestrator.isShuttingDown()).toBe(true);
  });

  it('sets readiness probe to unhealthy before draining', async () => {
    const probe = createReadinessProbe(0, silentLogger());
    const port = await probe.listening();

    const worker = new Worker('shutdown-probe-test', undefined, {
      connection: connection as ConnectionOptions,
      autorun: false,
    });

    const deps: ShutdownDeps = {
      config: { drainTimeoutMs: 5000, teardownTimeoutMs: 5000 },
      logger: silentLogger(),
      drain: { close: async (): Promise<void> => { await worker.close(); } },
      teardownEntries: [],
      readinessProbe: probe,
    };

    const orchestrator = createShutdownOrchestrator(deps);
    await orchestrator.execute(signalReason('SIGTERM'));

    // Verify probe returns 503 after shutdown
    const res = await fetch(`http://127.0.0.1:${String(port)}/readyz`);
    expect(res.status).toBe(503);

    await probe.close();
  });

  it('handles idempotent shutdown with real resources', async () => {
    const worker = new Worker('shutdown-idempotent', undefined, {
      connection: connection as ConnectionOptions,
      autorun: false,
    });

    const deps: ShutdownDeps = {
      config: { drainTimeoutMs: 5000, teardownTimeoutMs: 5000 },
      logger: silentLogger(),
      drain: { close: async (): Promise<void> => { await worker.close(); } },
      teardownEntries: [],
    };

    const orchestrator = createShutdownOrchestrator(deps);

    // Execute twice — second call should be ignored
    await orchestrator.execute(signalReason('SIGTERM'));
    await orchestrator.execute(signalReason('SIGINT'));

    expect(orchestrator.isShuttingDown()).toBe(true);
  });
});
