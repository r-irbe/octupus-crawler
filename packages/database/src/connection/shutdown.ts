// Graceful database shutdown — drain queries and close pools on SIGTERM
// Implements: T-DATA-016 (REQ-DATA-019)
// REQ-DATA-019: When SIGTERM received, drain in-flight queries + close connection pools

import type { DatabasePool } from './pool.js';

// --- Shutdown manager ---

export type ShutdownHandle = {
  /** Trigger graceful shutdown: drain pool and close. */
  readonly shutdown: () => Promise<void>;
  /** Whether shutdown has been initiated. */
  readonly isShuttingDown: () => boolean;
  /** Remove signal handlers and cleanup. */
  readonly dispose: () => void;
};

/**
 * Creates a shutdown manager that drains the database pool on SIGTERM/SIGINT.
 * REQ-DATA-019: in-flight queries complete, pool closes, no queries abandoned.
 *
 * @param pool - The database pool to drain and close
 * @param onShutdown - Optional callback invoked when shutdown starts (for logging)
 */
export function createShutdownHandle(
  pool: DatabasePool,
  onShutdown?: () => void,
): ShutdownHandle {
  let shuttingDown = false;

  const shutdown = async (): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    onShutdown?.();
    // pool.end() waits for all active queries to complete before closing
    await pool.end();
  };

  function handler(): void {
    void shutdown();
  }

  process.on('SIGTERM', handler);
  process.on('SIGINT', handler);

  const dispose = (): void => {
    process.removeListener('SIGTERM', handler);
    process.removeListener('SIGINT', handler);
  };

  return {
    shutdown,
    isShuttingDown: () => shuttingDown,
    dispose,
  };
}
