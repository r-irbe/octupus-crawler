// Graceful shutdown orchestrator — idempotent, phased drain + teardown
// Implements: T-LIFE-021 to 024, T-LIFE-027, T-LIFE-039, T-LIFE-041
// REQ-LIFE-018 to 024, REQ-LIFE-029, REQ-LIFE-031

import type { Logger } from '@ipf/core/contracts/logger';
import type { Disposable } from '@ipf/core/contracts/disposable';
import type { ShutdownReason } from './shutdown-reason.js';
import { shutdownReasonLabel } from './shutdown-reason.js';

export type ShutdownConfig = {
  readonly drainTimeoutMs: number;
  readonly teardownTimeoutMs: number;
};

export const DEFAULT_SHUTDOWN_CONFIG: ShutdownConfig = {
  drainTimeoutMs: 15_000,
  teardownTimeoutMs: 8_000,
};

export type DrainTarget = {
  close(timeout?: number): Promise<void>;
};

export type TeardownEntry = {
  readonly name: string;
  readonly resource: Disposable;
};

export type ReadinessProbe = {
  setUnhealthy(): void;
};

export type ShutdownDeps = {
  readonly config: ShutdownConfig;
  readonly logger: Logger;
  readonly drain: DrainTarget;
  readonly teardownEntries: readonly TeardownEntry[];
  readonly readinessProbe?: ReadinessProbe;
};

export type ShutdownOrchestrator = {
  readonly isShuttingDown: () => boolean;
  readonly execute: (reason: ShutdownReason) => Promise<void>;
};

export function createShutdownOrchestrator(deps: ShutdownDeps): ShutdownOrchestrator {
  let shuttingDown = false;

  async function execute(reason: ShutdownReason): Promise<void> {
    // REQ-LIFE-018: idempotent guard — second call is logged and ignored
    if (shuttingDown) {
      deps.logger.warn('Shutdown already in progress, ignoring', { reason: shutdownReasonLabel(reason) });
      return;
    }
    shuttingDown = true;
    deps.logger.info('Shutdown initiated', { reason: shutdownReasonLabel(reason) });

    // REQ-LIFE-029: readiness probe → 503 immediately
    deps.readinessProbe?.setUnhealthy();

    // Phase 1: Drain — close consumer with timeout (REQ-LIFE-019, REQ-LIFE-031)
    await executeDrain(deps.drain, deps.config.drainTimeoutMs, deps.logger);

    // Phase 2: Teardown — Promise.allSettled (REQ-LIFE-020, REQ-LIFE-021)
    await executeTeardown(deps.teardownEntries, deps.config.teardownTimeoutMs, deps.logger);

    deps.logger.info('Shutdown complete', { reason: shutdownReasonLabel(reason) });
  }

  return {
    isShuttingDown: (): boolean => shuttingDown,
    execute,
  };
}

async function executeDrain(drain: DrainTarget, timeoutMs: number, logger: Logger): Promise<void> {
  logger.info('Phase 1: Draining consumer', { timeoutMs });
  try {
    await Promise.race([
      drain.close(timeoutMs),
      rejectAfter(timeoutMs, 'drain'),
    ]);
    logger.info('Consumer drained successfully');
  } catch (err: unknown) {
    // REQ-LIFE-031: drain timeout — log abandoned jobs
    logger.warn('Consumer drain timed out or failed, proceeding to teardown', {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

async function executeTeardown(
  entries: readonly TeardownEntry[],
  timeoutMs: number,
  logger: Logger,
): Promise<void> {
  logger.info('Phase 2: Tearing down components', { count: entries.length, timeoutMs });

  const settled = await Promise.race([
    Promise.allSettled(entries.map(async (entry) => {
      try {
        await entry.resource.close();
        return entry.name;
      } catch (err: unknown) {
        throw new TeardownError(entry.name, err);
      }
    })),
    rejectAfter(timeoutMs, 'teardown').then(() => {
      logger.warn('Teardown timed out, some components may not have cleaned up', { timeoutMs });
      return [] as PromiseSettledResult<string>[];
    }),
  ]);

  for (const result of settled) {
    if (result.status === 'rejected') {
      const err: unknown = result.reason;
      // REQ-LIFE-021: log failures with component name
      if (err instanceof TeardownError) {
        logger.error('Teardown failed', { component: err.component, error: String(err.cause) });
      } else {
        logger.error('Teardown failed', { error: String(err) });
      }
    }
  }
}

class TeardownError extends Error {
  constructor(
    readonly component: string,
    override readonly cause: unknown,
  ) {
    super(`Teardown failed for ${component}: ${cause instanceof Error ? cause.message : String(cause)}`);
    this.name = 'TeardownError';
  }
}

function rejectAfter(ms: number, phase: string): Promise<never> {
  return new Promise<never>((_, reject) => {
    setTimeout(() => { reject(new Error(`${phase} timeout after ${String(ms)}ms`)); }, ms);
  });
}
