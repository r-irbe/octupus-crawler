// Unit tests for BullMQ Dead Letter Queue handler
// Validates REQ-RES-016 (DLQ on retry exhaustion), REQ-RES-017 (DLQ metrics/events)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createDLQHandler, type DLQEventHandler } from './dlq-handler.js';

// Mock BullMQ Queue
vi.mock('bullmq', () => {
  const addFn = vi.fn(() => Promise.resolve({ id: 'dlq-job-1' }));
  const getJobCountsFn = vi.fn(() => Promise.resolve({
    waiting: 3,
    delayed: 1,
    completed: 0,
    failed: 2,
  }));
  const closeFn = vi.fn(() => Promise.resolve(undefined));

  return {
    // Use a regular function (not arrow) so it works with `new`
    Queue: vi.fn(function QueueMock() {
      return {
        add: addFn,
        getJobCounts: getJobCountsFn,
        close: closeFn,
      };
    }),
    // Expose mocks for assertions
    __mocks: { addFn, getJobCountsFn, closeFn },
  };
});

// Access mock functions
const { __mocks } = await import('bullmq') as unknown as {
  __mocks: {
    addFn: ReturnType<typeof vi.fn>;
    getJobCountsFn: ReturnType<typeof vi.fn>;
    closeFn: ReturnType<typeof vi.fn>;
  };
};

describe('DLQHandler', () => {
  let onDeadLetter: DLQEventHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    onDeadLetter = vi.fn();
  });

  // Validates REQ-RES-016
  it('moves failed job to DLQ with correct data', async () => {
    const handler = createDLQHandler(
      { host: 'localhost', port: 6379 },
      'crawl',
      onDeadLetter,
    );

    const result = await handler.moveToDeadLetter(
      'job-42',
      { url: 'https://example.com', depth: 1 },
      3,
      'Connection timeout',
    );

    expect(result.isOk()).toBe(true);
    expect(__mocks.addFn).toHaveBeenCalledWith(
      'dead-letter',
      expect.objectContaining({
        originalJobId: 'job-42',
        originalQueue: 'crawl',
        attempts: 3,
        lastError: 'Connection timeout',
        payload: { url: 'https://example.com', depth: 1 },
      }),
      { jobId: 'dlq-job-42' },
    );
  });

  // Validates REQ-RES-017
  it('emits DLQ event on move for metrics + alerting', async () => {
    const handler = createDLQHandler(
      { host: 'localhost', port: 6379 },
      'crawl',
      onDeadLetter,
    );

    await handler.moveToDeadLetter('job-42', {}, 3, 'timeout');

    expect(onDeadLetter).toHaveBeenCalledWith(
      expect.objectContaining({
        originalJobId: 'job-42',
        originalQueue: 'crawl',
        attempts: 3,
        lastError: 'timeout',
      }),
    );
  });

  // Validates REQ-RES-016
  it('uses default DLQ queue name from source', async () => {
    const { Queue } = await import('bullmq');
    createDLQHandler(
      { host: 'localhost', port: 6379 },
      'crawl',
      onDeadLetter,
    );

    expect(Queue).toHaveBeenCalledWith(
      'crawl-dlq',
      expect.objectContaining({
        connection: { host: 'localhost', port: 6379 },
      }),
    );
  });

  // Validates REQ-RES-016
  it('allows custom DLQ queue name', async () => {
    const { Queue } = await import('bullmq');
    createDLQHandler(
      { host: 'localhost', port: 6379 },
      'crawl',
      onDeadLetter,
      { dlqQueue: 'custom-dead-letters' },
    );

    expect(Queue).toHaveBeenCalledWith(
      'custom-dead-letters',
      expect.anything(),
    );
  });

  // Validates REQ-RES-016
  it('returns job count from DLQ', async () => {
    const handler = createDLQHandler(
      { host: 'localhost', port: 6379 },
      'crawl',
      onDeadLetter,
    );

    const result = await handler.getCount();
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      // waiting:3 + delayed:1 + failed:2 = 6
      expect(result.value).toBe(6);
    }
  });

  // Validates REQ-RES-016
  it('closes DLQ queue on close()', async () => {
    const handler = createDLQHandler(
      { host: 'localhost', port: 6379 },
      'crawl',
      onDeadLetter,
    );

    await handler.close();
    expect(__mocks.closeFn).toHaveBeenCalled();
  });

  // Validates REQ-RES-016
  it('returns QueueError when add fails', async () => {
    __mocks.addFn.mockRejectedValueOnce(new Error('Queue closed'));

    const handler = createDLQHandler(
      { host: 'localhost', port: 6379 },
      'crawl',
      onDeadLetter,
    );

    const result = await handler.moveToDeadLetter('job-1', {}, 1, 'err');
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe('QueueError');
    }
  });

  // Validates REQ-RES-017
  it('does not emit event when add fails', async () => {
    __mocks.addFn.mockRejectedValueOnce(new Error('Queue closed'));

    const handler = createDLQHandler(
      { host: 'localhost', port: 6379 },
      'crawl',
      onDeadLetter,
    );

    await handler.moveToDeadLetter('job-1', {}, 1, 'err');
    expect(onDeadLetter).not.toHaveBeenCalled();
  });

  // Validates REQ-RES-016
  it('returns ConnectionError when getCount fails', async () => {
    __mocks.getJobCountsFn.mockRejectedValueOnce(new Error('Redis down'));

    const handler = createDLQHandler(
      { host: 'localhost', port: 6379 },
      'crawl',
      onDeadLetter,
    );

    const result = await handler.getCount();
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe('ConnectionError');
    }
  });
});
