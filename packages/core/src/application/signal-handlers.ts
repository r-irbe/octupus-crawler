// Signal handlers — register SIGTERM/SIGINT for graceful shutdown
// Implements: T-ARCH-021, REQ-ARCH-006 (step 4)

export interface ShutdownTarget {
  readonly shutdown: () => Promise<void>;
}

/**
 * Registers SIGTERM and SIGINT handlers that trigger graceful shutdown.
 * Only calls shutdown once even if both signals fire.
 * Returns a cleanup function that removes the handlers.
 */
export function registerSignalHandlers(target: ShutdownTarget): () => void {
  let shutdownTriggered = false;

  function handler(): void {
    if (shutdownTriggered) {
      return;
    }
    shutdownTriggered = true;
    void target.shutdown();
  }

  process.on('SIGTERM', handler);
  process.on('SIGINT', handler);

  return (): void => {
    process.removeListener('SIGTERM', handler);
    process.removeListener('SIGINT', handler);
  };
}
