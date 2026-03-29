// Graceful database shutdown — Unit tests
// Validates: T-DATA-016 (REQ-DATA-019) — drain queries, close pools on SIGTERM

import { describe, it, expect, vi, afterEach } from 'vitest';
import { createShutdownHandle } from './connection/shutdown.js';
import type { DatabasePool } from './connection/pool.js';

function createMockPool(endFn?: () => Promise<void>): DatabasePool {
  return {
    connect: vi.fn(),
    query: vi.fn(),
    totalCount: () => 0,
    idleCount: () => 0,
    waitingCount: () => 0,
    end: endFn ?? (() => Promise.resolve()),
    [Symbol.asyncDispose]: endFn ?? (() => Promise.resolve()),
  } as unknown as DatabasePool;
}

describe('createShutdownHandle', () => {
  afterEach(() => {
    // Clean up any lingering listeners
    process.removeAllListeners('SIGTERM');
    process.removeAllListeners('SIGINT');
  });

  // Validates REQ-DATA-019: shutdown drains pool
  it('calls pool.end() on shutdown()', async () => {
    const endFn = vi.fn(() => Promise.resolve());
    const pool = createMockPool(endFn);
    const handle = createShutdownHandle(pool);

    await handle.shutdown();

    expect(endFn).toHaveBeenCalledOnce();
    handle.dispose();
  });

  // Validates REQ-DATA-019: idempotent shutdown
  it('only shuts down once even if called multiple times', async () => {
    const endFn = vi.fn(() => Promise.resolve());
    const pool = createMockPool(endFn);
    const handle = createShutdownHandle(pool);

    await handle.shutdown();
    await handle.shutdown();
    await handle.shutdown();

    expect(endFn).toHaveBeenCalledOnce();
    handle.dispose();
  });

  // Validates REQ-DATA-019: tracks shutdown state
  it('reports isShuttingDown correctly', async () => {
    const pool = createMockPool();
    const handle = createShutdownHandle(pool);

    expect(handle.isShuttingDown()).toBe(false);
    await handle.shutdown();
    expect(handle.isShuttingDown()).toBe(true);
    handle.dispose();
  });

  // Validates REQ-DATA-019: callback on shutdown
  it('calls onShutdown callback when shutting down', async () => {
    const pool = createMockPool();
    const onShutdown = vi.fn();
    const handle = createShutdownHandle(pool, onShutdown);

    await handle.shutdown();

    expect(onShutdown).toHaveBeenCalledOnce();
    handle.dispose();
  });

  // Validates REQ-DATA-019: dispose removes signal listeners
  it('dispose removes signal handlers', () => {
    const pool = createMockPool();
    const handle = createShutdownHandle(pool);

    const beforeSIGTERM = process.listenerCount('SIGTERM');
    handle.dispose();
    const afterSIGTERM = process.listenerCount('SIGTERM');

    expect(afterSIGTERM).toBeLessThan(beforeSIGTERM);
  });

  // Validates REQ-DATA-019: SIGTERM triggers shutdown
  it('responds to SIGTERM signal', async () => {
    const endFn = vi.fn(() => Promise.resolve());
    const pool = createMockPool(endFn);
    const handle = createShutdownHandle(pool);

    process.emit('SIGTERM', 'SIGTERM');
    // Give the async shutdown a tick to complete
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(handle.isShuttingDown()).toBe(true);
    expect(endFn).toHaveBeenCalledOnce();
    handle.dispose();
  });

  // Validates REQ-DATA-019: SIGINT triggers shutdown
  it('responds to SIGINT signal', async () => {
    const endFn = vi.fn(() => Promise.resolve());
    const pool = createMockPool(endFn);
    const handle = createShutdownHandle(pool);

    process.emit('SIGINT', 'SIGINT');
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(handle.isShuttingDown()).toBe(true);
    expect(endFn).toHaveBeenCalledOnce();
    handle.dispose();
  });
});
