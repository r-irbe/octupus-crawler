// Observability startup phase — init logger, tracer, metrics before app wiring
// Implements: T-LIFE-006, T-LIFE-007, T-LIFE-008, REQ-LIFE-003, REQ-LIFE-004, REQ-LIFE-005

import type { Logger } from '@ipf/core/contracts/logger';
import type { Disposable } from '@ipf/core/contracts/disposable';
import type { StartupPhase } from './startup-orchestrator.js';

export type ObservabilityFactory = {
  readonly createLogger: (bindings: Record<string, unknown>) => Logger;
  readonly createTracer: () => Disposable;
  readonly createMetricsServer: (port: number) => Disposable;
};

export type ObservabilityConfig = {
  readonly workerId: string;
  readonly serviceName: string;
  readonly metricsPort: number;
};

/**
 * REQ-LIFE-003: Create startup phases for observability — initialized before app wiring.
 * REQ-LIFE-004: Logger includes worker ID and service name bindings.
 * REQ-LIFE-005: Tracer is started before crawl begins.
 */
export function createObservabilityPhases(
  factory: ObservabilityFactory,
  config: ObservabilityConfig,
): { phases: readonly StartupPhase[]; getLogger: () => Logger | undefined } {
  let logger: Logger | undefined;

  const loggerPhase: StartupPhase = {
    name: 'logger',
    execute: (): Promise<Disposable> => {
      // REQ-LIFE-004: worker ID + service name bindings
      logger = factory.createLogger({
        workerId: config.workerId,
        service: config.serviceName,
      });
      return Promise.resolve({ close: (): Promise<void> => Promise.resolve() });
    },
  };

  const tracerPhase: StartupPhase = {
    name: 'tracer',
    // REQ-LIFE-005: tracer started before crawl
    execute: (): Promise<Disposable> => Promise.resolve(factory.createTracer()),
  };

  const metricsPhase: StartupPhase = {
    name: 'metrics-server',
    execute: (): Promise<Disposable> => Promise.resolve(factory.createMetricsServer(config.metricsPort)),
  };

  return {
    phases: [loggerPhase, tracerPhase, metricsPhase],
    getLogger: (): Logger | undefined => logger,
  };
}
