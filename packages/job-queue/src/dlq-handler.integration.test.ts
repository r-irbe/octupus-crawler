// Integration test: BullMQ Dead Letter Queue with Testcontainers
// Validates REQ-RES-016 (DLQ on exhaustion), REQ-RES-017 (DLQ events)
// Implements: T-RES-025
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { startRedisContainer, type ManagedRedisContainer } from '@ipf/testing/containers/redis';
import { createDLQHandler, type DLQJobData } from './dlq-handler.js';

describe('DLQHandler (integration)', () => {
  let container: ManagedRedisContainer;

  beforeAll(async () => {
    container = await startRedisContainer();
  }, 30_000);

  afterAll(async () => {
    await container.stop();
  });

  // Validates REQ-RES-016
  it('moves job to DLQ and retrieves count', async () => {
    const onDeadLetter = vi.fn();
    const handler = createDLQHandler(
      {
        host: container.connection.host,
        port: container.connection.port,
      },
      'test-queue',
      onDeadLetter,
    );

    const result = await handler.moveToDeadLetter(
      'job-1',
      { url: 'https://example.com' },
      3,
      'Connection refused',
    );

    expect(result.isOk()).toBe(true);

    // Verify count
    const count = await handler.getCount();
    expect(count.isOk()).toBe(true);
    if (count.isOk()) {
      expect(count.value).toBeGreaterThanOrEqual(1);
    }

    await handler.close();
  });

  // Validates REQ-RES-017
  it('emits event callback on DLQ move', async () => {
    const onDeadLetter = vi.fn();
    const handler = createDLQHandler(
      {
        host: container.connection.host,
        port: container.connection.port,
      },
      'test-events',
      onDeadLetter,
    );

    await handler.moveToDeadLetter(
      'job-2',
      { url: 'https://fail.com' },
      5,
      'HTTP 500',
    );

    expect(onDeadLetter).toHaveBeenCalledTimes(1);
    const arg = onDeadLetter.mock.calls[0]?.[0] as DLQJobData | undefined;
    expect(arg).toBeDefined();
    if (arg) {
      expect(arg.originalJobId).toBe('job-2');
      expect(arg.originalQueue).toBe('test-events');
      expect(arg.attempts).toBe(5);
      expect(arg.lastError).toBe('HTTP 500');
    }

    await handler.close();
  });

  // Validates REQ-RES-016
  it('uses unique DLQ job IDs to prevent duplicates', async () => {
    const onDeadLetter = vi.fn();
    const handler = createDLQHandler(
      {
        host: container.connection.host,
        port: container.connection.port,
      },
      'test-dedup',
      onDeadLetter,
    );

    // Same job ID twice should work (idempotent via jobId)
    await handler.moveToDeadLetter('same-job', {}, 1, 'err1');
    // Second add with same jobId is a no-op in BullMQ
    await handler.moveToDeadLetter('same-job', {}, 2, 'err2');

    // Count should have exactly 1 (deduped)
    const count = await handler.getCount();
    expect(count.isOk()).toBe(true);
    if (count.isOk()) {
      expect(count.value).toBe(1);
    }

    await handler.close();
  });
});
