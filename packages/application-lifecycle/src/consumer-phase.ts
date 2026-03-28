// Consumer startup phase — start job consumer before seeding
// Implements: T-LIFE-009, REQ-LIFE-006

import type { Disposable } from '@ipf/core/contracts/disposable';
import type { StartupPhase } from './startup-orchestrator.js';

export type ConsumerLike = {
  start(): Promise<void>;
  close(timeout?: number): Promise<void>;
};

/**
 * REQ-LIFE-006: The system shall start the job consumer before seeding the frontier,
 * ensuring workers are ready to process jobs as soon as they are enqueued.
 */
export function createConsumerPhase(consumer: ConsumerLike): StartupPhase {
  return {
    name: 'job-consumer',
    async execute(): Promise<Disposable> {
      await consumer.start();
      return {
        async close(): Promise<void> {
          await consumer.close();
        },
      };
    },
  };
}
