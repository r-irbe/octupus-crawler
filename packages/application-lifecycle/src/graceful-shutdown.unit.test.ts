// Validates REQ-LIFE-018: Idempotent shutdown (multiple signals → one shutdown)
// Validates REQ-LIFE-019: Two-phase drain + teardown with timeouts
// Validates REQ-LIFE-020: Promise.allSettled — one failure doesn't block others
// Validates REQ-LIFE-021: Teardown failures logged with component name
// Validates REQ-LIFE-029: Readiness probe 503 immediately on shutdown start

import { describe, it, expect, beforeEach } from 'vitest';
import type { Logger } from '@ipf/core/contracts/logger';
import { createShutdownOrchestrator } from './graceful-shutdown.js';
import type { ShutdownDeps, TeardownEntry } from './graceful-shutdown.js';
import { signalReason, completionReason } from './shutdown-reason.js';

function createRecordingLogger(): Logger & { calls: { method: string; args: unknown[] }[] } {
  const calls: { method: string; args: unknown[] }[] = [];
  const make = (method: string) =>
    (msg: string, bindings?: Record<string, unknown>): void => {
      calls.push({ method, args: [msg, bindings] });
    };
  return {
    calls,
    debug: make('debug'),
    info: make('info'),
    warn: make('warn'),
    error: make('error'),
    fatal: make('fatal'),
    child: () => createRecordingLogger(),
  } as Logger & { calls: { method: string; args: unknown[] }[] };
}

function createDrain(delayMs = 0): { close: (timeout?: number) => Promise<void>; callCount: number } {
  const state = { callCount: 0 };
  return {
    get callCount(): number { return state.callCount; },
    close: (timeout?: number): Promise<void> => {
      void timeout;
      state.callCount++;
      if (delayMs > 0) {
        return new Promise((r) => { setTimeout(r, delayMs); });
      }
      return Promise.resolve();
    },
  };
}

function createTeardownEntry(name: string, shouldFail = false): TeardownEntry & { closed: boolean } {
  const state = { closed: false };
  return {
    get closed(): boolean { return state.closed; },
    name,
    resource: {
      close: (): Promise<void> => {
        state.closed = true;
        if (shouldFail) {
          return Promise.reject(new Error(`${name} failed`));
        }
        return Promise.resolve();
      },
    },
  };
}

function buildDeps(overrides: Partial<ShutdownDeps> = {}): ShutdownDeps {
  return {
    config: { drainTimeoutMs: 1000, teardownTimeoutMs: 1000 },
    logger: createRecordingLogger(),
    drain: createDrain(),
    teardownEntries: [],
    ...overrides,
  };
}

type RecLogger = ReturnType<typeof createRecordingLogger>;

describe('GracefulShutdown', () => {
  let logger: RecLogger;

  beforeEach(() => {
    logger = createRecordingLogger();
  });

  it('executes drain then teardown in order', async () => {
    const callOrder: string[] = [];
    const drain = {
      close: (): Promise<void> => { callOrder.push('drain'); return Promise.resolve(); },
    };
    const teardown: TeardownEntry = {
      name: 'frontier',
      resource: {
        close: (): Promise<void> => { callOrder.push('teardown:frontier'); return Promise.resolve(); },
      },
    };
    const deps = buildDeps({ logger, drain, teardownEntries: [teardown] });
    const orchestrator = createShutdownOrchestrator(deps);

    await orchestrator.execute(signalReason('SIGTERM'));

    expect(callOrder).toStrictEqual(['drain', 'teardown:frontier']);
  });

  it('is idempotent — second call logs and returns (REQ-LIFE-018)', async () => {
    const drain = createDrain();
    const deps = buildDeps({ logger, drain });
    const orchestrator = createShutdownOrchestrator(deps);

    await orchestrator.execute(signalReason('SIGTERM'));
    await orchestrator.execute(signalReason('SIGINT'));

    expect(drain.callCount).toBe(1);
    const warnCalls = logger.calls.filter((c) => c.method === 'warn');
    expect(warnCalls.some((c) => c.args[0] === 'Shutdown already in progress, ignoring')).toBe(true);
  });

  it('reports isShuttingDown correctly', async () => {
    const deps = buildDeps({ logger });
    const orchestrator = createShutdownOrchestrator(deps);

    expect(orchestrator.isShuttingDown()).toBe(false);
    await orchestrator.execute(completionReason());
    expect(orchestrator.isShuttingDown()).toBe(true);
  });

  it('sets readiness probe to unhealthy before drain (REQ-LIFE-029)', async () => {
    const callOrder: string[] = [];
    const probe = {
      setUnhealthy: (): void => { callOrder.push('probe:unhealthy'); },
    };
    const drain = {
      close: (): Promise<void> => { callOrder.push('drain'); return Promise.resolve(); },
    };

    const deps = buildDeps({ logger, drain, readinessProbe: probe });
    const orchestrator = createShutdownOrchestrator(deps);

    await orchestrator.execute(signalReason('SIGTERM'));

    expect(callOrder[0]).toBe('probe:unhealthy');
    expect(callOrder[1]).toBe('drain');
  });

  it('continues teardown when one component fails (REQ-LIFE-020)', async () => {
    const ok1 = createTeardownEntry('tracer');
    const failing = createTeardownEntry('frontier', true);
    const ok2 = createTeardownEntry('metrics');

    const deps = buildDeps({ logger, teardownEntries: [ok1, failing, ok2] });
    const orchestrator = createShutdownOrchestrator(deps);

    await orchestrator.execute(signalReason('SIGTERM'));

    expect(ok1.closed).toBe(true);
    expect(failing.closed).toBe(true);
    expect(ok2.closed).toBe(true);
  });

  it('logs teardown failure with component name (REQ-LIFE-021)', async () => {
    const failing = createTeardownEntry('frontier', true);
    const deps = buildDeps({ logger, teardownEntries: [failing] });
    const orchestrator = createShutdownOrchestrator(deps);

    await orchestrator.execute(signalReason('SIGTERM'));

    const errorCalls = logger.calls.filter((c) => c.method === 'error');
    expect(errorCalls.some((c) =>
      c.args[0] === 'Teardown failed' &&
      (c.args[1] as Record<string, unknown>)['component'] === 'frontier',
    )).toBe(true);
  });

  it('handles drain timeout gracefully (REQ-LIFE-031)', async () => {
    const slowDrain = createDrain(5000);
    const deps = buildDeps({
      logger,
      drain: slowDrain,
      config: { drainTimeoutMs: 50, teardownTimeoutMs: 1000 },
    });
    const orchestrator = createShutdownOrchestrator(deps);

    await orchestrator.execute(signalReason('SIGTERM'));

    const warnCalls = logger.calls.filter((c) => c.method === 'warn');
    expect(warnCalls.some((c) =>
      c.args[0] === 'Consumer drain timed out or failed, proceeding to teardown',
    )).toBe(true);
  });
});
