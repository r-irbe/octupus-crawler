// Composition root unit tests — TDD RED phase
// Validates: T-ARCH-020, T-ARCH-026, T-ARCH-027, REQ-ARCH-006, REQ-ARCH-016, REQ-ARCH-017

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createCompositionRoot,
  resetCompositionRoot,
  type DisposableEntry,
  type CompositionRootConfig,
} from './composition-root.js';

// --- Test helpers ---

function createMockDisposable(name: string): DisposableEntry {
  return { name, close: vi.fn<() => Promise<void>>().mockResolvedValue(undefined) };
}

function createMockFactory(
  disposable: DisposableEntry,
): () => DisposableEntry {
  return (): DisposableEntry => disposable;
}

function createFailingFactory(name: string, error: Error): () => DisposableEntry {
  return (): DisposableEntry => {
    throw error;
  };
}

// --- Tests ---

describe('createCompositionRoot', () => {
  beforeEach(() => {
    // Reset singleton state between tests
    resetCompositionRoot();
  });

  // Validates REQ-ARCH-006: phased wiring sequence
  it('should create a composition root with disposable resources', () => {
    const logger = createMockDisposable('logger');
    const frontier = createMockDisposable('frontier');

    const config: CompositionRootConfig = {
      factories: [
        createMockFactory(logger),
        createMockFactory(frontier),
      ],
    };

    const root = createCompositionRoot(config);

    expect(root).toBeDefined();
    expect(root.disposables).toHaveLength(2);
    expect(root.disposables[0]?.name).toBe('logger');
    expect(root.disposables[1]?.name).toBe('frontier');
  });

  // Validates REQ-ARCH-016: singleton guard
  it('should throw on second instantiation', () => {
    const config: CompositionRootConfig = {
      factories: [createMockFactory(createMockDisposable('logger'))],
    };

    createCompositionRoot(config);

    expect(() => createCompositionRoot(config)).toThrow(
      /already initialized/i,
    );
  });

  // Validates REQ-ARCH-016: singleton guard error type
  it('should throw an Error with descriptive message on duplicate init', () => {
    const config: CompositionRootConfig = {
      factories: [createMockFactory(createMockDisposable('logger'))],
    };

    createCompositionRoot(config);

    try {
      createCompositionRoot(config);
      expect.unreachable('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toMatch(/singleton/i);
    }
  });

  // Validates REQ-ARCH-006: shutdown calls close on all disposables
  it('should call close() on all disposables during shutdown', async () => {
    const logger = createMockDisposable('logger');
    const frontier = createMockDisposable('frontier');
    const metrics = createMockDisposable('metrics');

    const config: CompositionRootConfig = {
      factories: [
        createMockFactory(logger),
        createMockFactory(frontier),
        createMockFactory(metrics),
      ],
    };

    const root = createCompositionRoot(config);
    await root.shutdown();

    expect(logger.close).toHaveBeenCalledOnce();
    expect(frontier.close).toHaveBeenCalledOnce();
    expect(metrics.close).toHaveBeenCalledOnce();
  });

  // Validates REQ-ARCH-017: reverse-order cleanup during shutdown
  it('should close disposables in reverse initialization order', async () => {
    const callOrder: string[] = [];

    const logger: DisposableEntry = {
      name: 'logger',
      close: vi.fn<() => Promise<void>>().mockImplementation(() => {
        callOrder.push('logger');
        return Promise.resolve();
      }),
    };
    const frontier: DisposableEntry = {
      name: 'frontier',
      close: vi.fn<() => Promise<void>>().mockImplementation(() => {
        callOrder.push('frontier');
        return Promise.resolve();
      }),
    };
    const metrics: DisposableEntry = {
      name: 'metrics',
      close: vi.fn<() => Promise<void>>().mockImplementation(() => {
        callOrder.push('metrics');
        return Promise.resolve();
      }),
    };

    const config: CompositionRootConfig = {
      factories: [
        createMockFactory(logger),
        createMockFactory(frontier),
        createMockFactory(metrics),
      ],
    };

    const root = createCompositionRoot(config);
    await root.shutdown();

    expect(callOrder).toEqual(['metrics', 'frontier', 'logger']);
  });

  // Validates REQ-ARCH-017: partial failure cleanup
  it('should clean up already-initialized resources on factory failure', async () => {
    const logger = createMockDisposable('logger');
    const frontier = createMockDisposable('frontier');
    const failError = new Error('metrics init failed');

    const config: CompositionRootConfig = {
      factories: [
        createMockFactory(logger),
        createMockFactory(frontier),
        createFailingFactory('metrics', failError),
      ],
    };

    expect(() => createCompositionRoot(config)).toThrow('metrics init failed');

    // Cleanup is async — wait for it
    await vi.waitFor(() => {
      expect(logger.close).toHaveBeenCalledOnce();
      expect(frontier.close).toHaveBeenCalledOnce();
    });
  });

  // Validates REQ-ARCH-017: reverse order on partial failure
  it('should clean up in reverse order on partial failure', async () => {
    const callOrder: string[] = [];

    const logger: DisposableEntry = {
      name: 'logger',
      close: vi.fn<() => Promise<void>>().mockImplementation(() => {
        callOrder.push('logger');
        return Promise.resolve();
      }),
    };
    const frontier: DisposableEntry = {
      name: 'frontier',
      close: vi.fn<() => Promise<void>>().mockImplementation(() => {
        callOrder.push('frontier');
        return Promise.resolve();
      }),
    };

    const config: CompositionRootConfig = {
      factories: [
        createMockFactory(logger),
        createMockFactory(frontier),
        createFailingFactory('metrics', new Error('boom')),
      ],
    };

    expect(() => createCompositionRoot(config)).toThrow('boom');

    // Wait for async cleanup
    await vi.waitFor(() => {
      expect(callOrder).toEqual(['frontier', 'logger']);
    });
  });

  // Validates REQ-ARCH-017: cleanup errors don't mask original error
  it('should not mask original error when cleanup also fails', () => {
    const failingDisposable: DisposableEntry = {
      name: 'logger',
      close: vi.fn<() => Promise<void>>().mockRejectedValue(new Error('cleanup failed')),
    };

    const config: CompositionRootConfig = {
      factories: [
        createMockFactory(failingDisposable),
        createFailingFactory('frontier', new Error('init failed')),
      ],
    };

    expect(() => createCompositionRoot(config)).toThrow('init failed');
  });

  // Validates: shutdown is idempotent
  it('should handle multiple shutdown calls gracefully', async () => {
    const logger = createMockDisposable('logger');

    const config: CompositionRootConfig = {
      factories: [createMockFactory(logger)],
    };

    const root = createCompositionRoot(config);
    await root.shutdown();
    await root.shutdown();

    // close should only be called once
    expect(logger.close).toHaveBeenCalledOnce();
  });

  // Validates: resetCompositionRoot allows re-initialization (test helper)
  it('should allow re-initialization after reset', () => {
    const config: CompositionRootConfig = {
      factories: [createMockFactory(createMockDisposable('logger'))],
    };

    createCompositionRoot(config);
    resetCompositionRoot();

    const root = createCompositionRoot(config);
    expect(root).toBeDefined();
  });
});
