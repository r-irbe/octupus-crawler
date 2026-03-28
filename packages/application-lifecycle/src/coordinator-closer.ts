// Coordinator closer — clear interval and settle pending promise on shutdown
// Implements: T-LIFE-026, T-LIFE-027, REQ-LIFE-023, REQ-LIFE-024

import type { Logger } from '@ipf/core/contracts/logger';
import type { Disposable } from '@ipf/core/contracts/disposable';

/**
 * A coordinator that can be stopped and has an optional pending promise.
 * REQ-LIFE-024: coordinator must NOT close shared resources it doesn't own.
 */
export type Coordinator = {
  readonly stop: () => void;
  readonly waitForCompletion?: () => Promise<void>;
};

/**
 * Wrap a coordinator as a Disposable for the shutdown orchestrator.
 * REQ-LIFE-023: clear poll interval and settle pending promise.
 * REQ-LIFE-024: does NOT close shared resources (frontier, state-store).
 */
export function coordinatorAsDisposable(
  coordinator: Coordinator,
  logger: Logger,
): Disposable {
  return {
    async close(): Promise<void> {
      // REQ-LIFE-023: stop polling (clears interval)
      coordinator.stop();
      logger.info('Coordinator stopped');

      // REQ-LIFE-023: settle pending completion promise
      if (coordinator.waitForCompletion !== undefined) {
        try {
          await coordinator.waitForCompletion();
          logger.info('Coordinator completion promise settled');
        } catch (err: unknown) {
          logger.warn('Coordinator completion promise rejected', {
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      // REQ-LIFE-024: intentionally does NOT close frontier, state-store,
      // or any other shared resource. Those are owned by the composition root.
    },
  };
}
