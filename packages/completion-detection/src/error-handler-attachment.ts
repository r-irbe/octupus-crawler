// Error handler attachment — prevent unhandled-error crashes on event emitters
// Implements: T-COORD-013, REQ-DIST-022

import type { Logger } from '@ipf/core/contracts/logger';

/** Any object that supports Node.js EventEmitter-style error handling. */
export type ErrorEmitter = {
  readonly on: (event: 'error', handler: (err: Error) => void) => void;
};

/**
 * Attach an error handler to an event-emitting component immediately after construction.
 * REQ-DIST-022: Prevents unhandled-error crashes by logging and continuing.
 */
export function attachErrorHandler(
  emitter: ErrorEmitter,
  logger: Logger,
  componentName: string,
): void {
  emitter.on('error', (err: Error) => {
    logger.error(`Unhandled error in ${componentName}`, {
      component: componentName,
      error: err.message,
    });
  });
}
