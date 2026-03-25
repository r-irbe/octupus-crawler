// Signal handler unit tests — TDD RED phase
// Validates: T-ARCH-021, REQ-ARCH-006 (step 4)

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { registerSignalHandlers } from './signal-handlers.js';

describe('registerSignalHandlers', () => {
  const originalListeners = new Map<string, Array<(...args: unknown[]) => void>>();

  beforeEach(() => {
    // Save original listeners
    for (const signal of ['SIGTERM', 'SIGINT']) {
      originalListeners.set(signal, process.listeners(signal) as Array<(...args: unknown[]) => void>);
    }
  });

  afterEach(() => {
    // Restore original listeners
    for (const signal of ['SIGTERM', 'SIGINT']) {
      process.removeAllListeners(signal);
      const original = originalListeners.get(signal);
      if (original) {
        for (const listener of original) {
          process.on(signal, listener);
        }
      }
    }
  });

  // Validates REQ-ARCH-006 step 4: register process signal handlers
  it('should register SIGTERM and SIGINT handlers', () => {
    const shutdown = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);

    registerSignalHandlers({ shutdown });

    expect(process.listenerCount('SIGTERM')).toBeGreaterThan(0);
    expect(process.listenerCount('SIGINT')).toBeGreaterThan(0);
  });

  // Validates: shutdown is called on SIGTERM
  it('should call shutdown on SIGTERM', () => {
    const shutdown = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);

    registerSignalHandlers({ shutdown });
    process.emit('SIGTERM');

    expect(shutdown).toHaveBeenCalledOnce();
  });

  // Validates: shutdown is called on SIGINT
  it('should call shutdown on SIGINT', () => {
    const shutdown = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);

    registerSignalHandlers({ shutdown });
    process.emit('SIGINT');

    expect(shutdown).toHaveBeenCalledOnce();
  });

  // Validates: only calls shutdown once even if both signals fire
  it('should only call shutdown once for multiple signals', () => {
    const shutdown = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);

    registerSignalHandlers({ shutdown });
    process.emit('SIGTERM');
    process.emit('SIGINT');

    expect(shutdown).toHaveBeenCalledOnce();
  });

  // Validates: returns cleanup function to remove handlers
  it('should return a cleanup function that removes handlers', () => {
    const shutdown = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);

    const cleanup = registerSignalHandlers({ shutdown });

    const beforeTerm = process.listenerCount('SIGTERM');
    const beforeInt = process.listenerCount('SIGINT');

    cleanup();

    expect(process.listenerCount('SIGTERM')).toBe(beforeTerm - 1);
    expect(process.listenerCount('SIGINT')).toBe(beforeInt - 1);
  });
});
