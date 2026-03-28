// Unit tests for observability startup phases
// Validates: T-LIFE-006, T-LIFE-007, T-LIFE-008

import { describe, it, expect } from 'vitest';
import { createObservabilityPhases } from './observability-phases.js';
import type { ObservabilityFactory, ObservabilityConfig } from './observability-phases.js';
import type { Logger } from '@ipf/core/contracts/logger';
import type { Disposable } from '@ipf/core/contracts/disposable';

const noop = (): void => { /* no-op */ };

function stubLogger(): Logger {
  return {
    info: noop, warn: noop, error: noop, debug: noop, fatal: noop,
    child: (): Logger => stubLogger(),
  };
}

function stubDisposable(): Disposable {
  return { close: (): Promise<void> => Promise.resolve() };
}

function stubFactory(): ObservabilityFactory & { createLoggerCalls: Array<Record<string, unknown>> } {
  const createLoggerCalls: Array<Record<string, unknown>> = [];
  return {
    createLoggerCalls,
    createLogger: (bindings: Record<string, unknown>): Logger => {
      createLoggerCalls.push(bindings);
      return stubLogger();
    },
    createTracer: (): Disposable => stubDisposable(),
    createMetricsServer: (): Disposable => stubDisposable(),
  };
}

const TEST_CONFIG: ObservabilityConfig = {
  workerId: 'worker-1',
  serviceName: 'crawler',
  metricsPort: 9090,
};

describe('createObservabilityPhases', () => {
  // Validates REQ-LIFE-003: three phases created in order
  it('returns three startup phases', () => {
    const { phases } = createObservabilityPhases(stubFactory(), TEST_CONFIG);
    expect(phases).toHaveLength(3);
    expect(phases[0]?.name).toBe('logger');
    expect(phases[1]?.name).toBe('tracer');
    expect(phases[2]?.name).toBe('metrics-server');
  });

  // Validates REQ-LIFE-004: logger includes worker ID + service name
  it('creates logger with worker ID and service name bindings', async () => {
    const factory = stubFactory();
    const { phases } = createObservabilityPhases(factory, TEST_CONFIG);
    await phases[0]?.execute();

    expect(factory.createLoggerCalls).toHaveLength(1);
    expect(factory.createLoggerCalls[0]).toEqual({
      workerId: 'worker-1',
      service: 'crawler',
    });
  });

  // Validates REQ-LIFE-005: tracer phase is executable
  it('creates tracer as disposable resource', async () => {
    const { phases } = createObservabilityPhases(stubFactory(), TEST_CONFIG);
    const resource = await phases[1]?.execute();
    expect(resource).toBeDefined();
  });

  // Validates REQ-LIFE-003: logger available after phase executes
  it('provides logger after logger phase executes', async () => {
    const { phases, getLogger } = createObservabilityPhases(stubFactory(), TEST_CONFIG);
    expect(getLogger()).toBeUndefined();
    await phases[0]?.execute();
    expect(getLogger()).toBeDefined();
  });
});
