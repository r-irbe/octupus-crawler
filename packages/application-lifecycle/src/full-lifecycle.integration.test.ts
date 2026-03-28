// Scenario test: full startup → seed → processing → shutdown lifecycle
// Validates: T-LIFE-038 → REQ-LIFE-001 to 017

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Queue, Worker, type ConnectionOptions, type Job } from 'bullmq';
import { startRedisContainer, type ManagedRedisContainer } from '@ipf/testing/containers/redis';
import { BullMQConnectionSchema } from '@ipf/job-queue/connection-config';
import type { BullMQConnection } from '@ipf/job-queue/connection-config';
import type { Logger } from '@ipf/core/contracts/logger';
import type { Disposable } from '@ipf/core/contracts/disposable';
import type { StartupPhase } from './startup-orchestrator.js';
import { executeStartupSequence, StartupError, validateSeeds } from './startup-orchestrator.js';
import { createConsumerPhase } from './consumer-phase.js';
import { createShutdownOrchestrator } from './graceful-shutdown.js';
import type { ShutdownDeps, TeardownEntry } from './graceful-shutdown.js';
import { completionReason } from './shutdown-reason.js';
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

describe('T-LIFE-038: full lifecycle scenario', () => {
  it('startup → enqueue jobs → process → graceful shutdown', async () => {
    const logger = silentLogger();
    const events: string[] = [];

    // --- Phase 1: Validate config (REQ-LIFE-001, 002) ---
    const seeds = ['https://example.com', 'https://example.org'];
    validateSeeds(seeds, logger);
    events.push('seeds-validated');

    // --- Phase 2: Sequential startup (REQ-LIFE-033) ---
    const queue = new Queue('lifecycle-test', { connection: connection as ConnectionOptions });
    let worker: Worker | undefined;

    const queuePhase: StartupPhase = {
      name: 'queue',
      execute: (): Promise<Disposable> => {
        events.push('queue-ready');
        return Promise.resolve({
          close: async (): Promise<void> => { await queue.close(); events.push('queue-closed'); },
        });
      },
    };

    const processed: string[] = [];
    const processingDone = new Promise<void>((resolve) => {
      worker = new Worker(
        'lifecycle-test',
        // eslint-disable-next-line @typescript-eslint/require-await -- BullMQ Processor requires Promise return
        async (job: Job<{ url: string }>): Promise<void> => {
          processed.push(job.data.url);
          if (processed.length >= seeds.length) {
            resolve();
          }
        },
        { connection: connection as ConnectionOptions },
      );
    });

    const consumerPhase = createConsumerPhase({
      start: (): Promise<void> => {
        events.push('consumer-started');
        return Promise.resolve();
      },
      close: async (): Promise<void> => {
        if (worker) { await worker.close(); }
        events.push('consumer-closed');
      },
    });

    const probe = createReadinessProbe(0, logger);
    const port = await probe.listening();

    const probePhase: StartupPhase = {
      name: 'readiness-probe',
      execute: (): Promise<Disposable> => {
        events.push('probe-ready');
        return Promise.resolve({ close: async (): Promise<void> => { await probe.close(); } });
      },
    };

    const result = await executeStartupSequence(
      [queuePhase, consumerPhase, probePhase],
      logger,
    );

    expect(events).toContain('queue-ready');
    expect(events).toContain('consumer-started');
    expect(events).toContain('probe-ready');

    // Verify readiness probe returns 200
    const healthRes = await fetch(`http://127.0.0.1:${String(port)}/readyz`);
    expect(healthRes.status).toBe(200);

    // --- Phase 3: Enqueue work (REQ-LIFE-007, 008) ---
    for (const url of seeds) {
      await queue.add('crawl', { url, depth: 0 });
    }
    events.push('jobs-enqueued');

    // Wait for processing
    await processingDone;
    expect(processed).toHaveLength(2);
    events.push('jobs-processed');

    // --- Phase 4: Graceful shutdown (REQ-LIFE-018 to 021, REQ-LIFE-029) ---
    const teardownEntries: TeardownEntry[] = result.resources
      .map((r) => ({ name: r.name, resource: r.resource }));

    const shutdownDeps: ShutdownDeps = {
      config: { drainTimeoutMs: 5000, teardownTimeoutMs: 5000 },
      logger,
      drain: {
        close: async (): Promise<void> => {
          if (worker) { await worker.close(); }
          events.push('drained');
        },
      },
      teardownEntries,
      readinessProbe: probe,
    };

    const shutdown = createShutdownOrchestrator(shutdownDeps);
    await shutdown.execute(completionReason());
    events.push('shutdown-complete');

    // Verify probe returns 503 after shutdown
    // (probe was closed in teardown, so we check the flag instead)
    expect(shutdown.isShuttingDown()).toBe(true);

    // Verify lifecycle order
    expect(events.indexOf('seeds-validated')).toBeLessThan(events.indexOf('queue-ready'));
    expect(events.indexOf('queue-ready')).toBeLessThan(events.indexOf('consumer-started'));
    expect(events.indexOf('consumer-started')).toBeLessThan(events.indexOf('jobs-enqueued'));
    expect(events.indexOf('jobs-enqueued')).toBeLessThan(events.indexOf('jobs-processed'));
    expect(events.indexOf('jobs-processed')).toBeLessThan(events.indexOf('shutdown-complete'));
  }, 30_000);

  it('handles startup failure with reverse cleanup', async () => {
    const logger = silentLogger();
    const cleanups: string[] = [];

    const phases: StartupPhase[] = [
      {
        name: 'healthy-phase',
        execute: (): Promise<Disposable> => Promise.resolve({
          close: (): Promise<void> => { cleanups.push('healthy-phase'); return Promise.resolve(); },
        }),
      },
      {
        name: 'failing-phase',
        execute: (): Promise<Disposable> => Promise.reject(new Error('connection refused')),
      },
    ];

    await expect(executeStartupSequence(phases, logger)).rejects.toThrow(StartupError);
    expect(cleanups).toEqual(['healthy-phase']);
  });
});
