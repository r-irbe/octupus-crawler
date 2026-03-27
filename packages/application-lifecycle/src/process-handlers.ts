// Process handlers — uncaughtException, unhandledRejection, main wrapper
// Implements: T-LIFE-016 to 020, REQ-LIFE-013 to 017

import type { Logger } from '@ipf/core/contracts/logger';
import type { ShutdownReason } from './shutdown-reason.js';
import { errorReason, abortReason, completionReason } from './shutdown-reason.js';
import type { ExitCode } from './exit-codes.js';
import { EXIT_ERROR, EXIT_STATE_STORE_ABORT, EXIT_SUCCESS, exitCodeForReason } from './exit-codes.js';

export type ProcessExit = (code: ExitCode) => void;

export type ShutdownFn = (reason: ShutdownReason) => Promise<void>;

export type ProcessHandlersDeps = {
  readonly logger: Logger;
  readonly shutdown: ShutdownFn;
  readonly exit: ProcessExit;
};

export type ProcessHandlersCleanup = () => void;

// REQ-LIFE-013: uncaughtException → log fatal, exit 1
// REQ-LIFE-014: unhandledRejection → log fatal, exit 1
// REQ-LIFE-016: state-store abort → exit 3
// REQ-LIFE-017: crawl complete → exit 0
export function registerProcessHandlers(deps: ProcessHandlersDeps): ProcessHandlersCleanup {
  const { logger, shutdown, exit } = deps;

  function onUncaughtException(err: Error): void {
    logger.fatal('Uncaught exception', { error: err.message, stack: err.stack });
    void shutdown(errorReason(err)).finally(() => {
      exit(EXIT_ERROR);
    });
  }

  function onUnhandledRejection(reason: unknown): void {
    const message = reason instanceof Error ? reason.message : String(reason);
    logger.fatal('Unhandled rejection', { error: message });
    void shutdown(errorReason(reason)).finally(() => {
      exit(EXIT_ERROR);
    });
  }

  process.on('uncaughtException', onUncaughtException);
  process.on('unhandledRejection', onUnhandledRejection);

  return (): void => {
    process.removeListener('uncaughtException', onUncaughtException);
    process.removeListener('unhandledRejection', onUnhandledRejection);
  };
}

// REQ-LIFE-016: state-store abort triggers shutdown and exit(3)
export async function handleAbortExit(deps: ProcessHandlersDeps, reason: string): Promise<void> {
  deps.logger.fatal('State-store abort triggered', { reason });
  await deps.shutdown(abortReason(reason));
  deps.exit(EXIT_STATE_STORE_ABORT);
}

// REQ-LIFE-017: successful completion triggers shutdown and exit(0)
export async function handleCompletionExit(deps: ProcessHandlersDeps): Promise<void> {
  deps.logger.info('Crawl completed successfully');
  await deps.shutdown(completionReason());
  deps.exit(EXIT_SUCCESS);
}

// REQ-LIFE-015: main entry point wrapper — catches top-level errors
export async function safeMain(
  main: () => Promise<void>,
  deps: ProcessHandlersDeps,
): Promise<void> {
  try {
    await main();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    deps.logger.fatal('Main entry point threw', { error: message });
    await deps.shutdown(errorReason(err));
    deps.exit(exitCodeForReason('Error'));
  }
}
