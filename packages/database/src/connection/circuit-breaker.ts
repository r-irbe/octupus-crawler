// Database circuit breaker — cockatiel wrapper for DB calls
// Implements: T-DATA-015 (REQ-DATA-020)
// REQ-DATA-020: While CB is open, return CircuitOpen errors for reads, queue writes with backpressure

import {
  circuitBreaker,
  handleAll,
  ConsecutiveBreaker,
  BrokenCircuitError,
  type CircuitState,
} from 'cockatiel';
import { err, type Result } from 'neverthrow';
import { z } from 'zod';
import type { DataError } from '../errors.js';
import { createCircuitOpen, createConnectionFailed } from '../errors.js';

// --- Configuration schema ---

export const CircuitBreakerConfigSchema = z.object({
  /** Number of consecutive failures before opening the circuit. */
  threshold: z.number().int().positive().default(5),
  /** Time in ms before attempting a half-open probe. */
  halfOpenAfterMs: z.number().int().positive().default(30_000),
});

export type CircuitBreakerConfig = z.infer<typeof CircuitBreakerConfigSchema>;

// --- Circuit breaker wrapper ---

export type DatabaseCircuitBreaker = {
  /** Execute an operation through the circuit breaker. */
  readonly execute: <T>(fn: () => Promise<Result<T, DataError>>) => Promise<Result<T, DataError>>;
  /** Get the current circuit state. */
  readonly state: () => CircuitState;
  /** Subscribe to state change events. Returns unsubscribe function. */
  readonly onStateChange: (handler: (state: CircuitState) => void) => { dispose: () => void };
};

export function createDatabaseCircuitBreaker(
  config: CircuitBreakerConfig = CircuitBreakerConfigSchema.parse({}),
): DatabaseCircuitBreaker {
  const policy = circuitBreaker(handleAll, {
    halfOpenAfter: config.halfOpenAfterMs,
    breaker: new ConsecutiveBreaker(config.threshold),
  });

  const execute = async <T>(
    fn: () => Promise<Result<T, DataError>>,
  ): Promise<Result<T, DataError>> => {
    try {
      return await policy.execute(async () => {
        const result = await fn();
        // If the inner function returned an error, wrap in Error so cockatiel sees a failure
        if (result.isErr()) {
          const wrapper = new Error('DataError');
          (wrapper as unknown as { dataError: DataError }).dataError = result.error;
          throw wrapper;
        }
        return result;
      });
    } catch (error: unknown) {
      if (error instanceof BrokenCircuitError) {
        return err(createCircuitOpen('database'));
      }
      // Unwrap DataError that was wrapped for cockatiel
      if (error instanceof Error && 'dataError' in error) {
        return err((error as unknown as { dataError: DataError }).dataError);
      }
      // Unknown error — treat as connection failure, don't mask as CircuitOpen
      return err(createConnectionFailed(error));
    }
  };

  return {
    execute,
    state: () => (policy as unknown as { state: CircuitState }).state,
    onStateChange: (handler) => policy.onStateChange(handler),
  };
}
