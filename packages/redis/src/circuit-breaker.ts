// Redis circuit breaker wrapper — cockatiel CB for all Redis operations
// Implements: T-RES-018 (REQ-RES-001)
// REQ-RES-001: All external service calls (including Redis) use circuit breakers

import {
  circuitBreaker,
  handleAll,
  ConsecutiveBreaker,
  BrokenCircuitError,
  type CircuitState,
} from 'cockatiel';
import { err, type Result } from 'neverthrow';
import { z } from 'zod';

// --- Configuration ---

export const RedisCircuitBreakerConfigSchema = z.object({
  threshold: z.number().int().positive().default(5),
  halfOpenAfterMs: z.number().int().positive().default(10_000),
});

export type RedisCircuitBreakerConfig = z.infer<typeof RedisCircuitBreakerConfigSchema>;

// --- Error types ---

export type RedisCircuitBreakerError =
  | { readonly _tag: 'CircuitOpen'; readonly message: string }
  | { readonly _tag: 'RedisError'; readonly message: string; readonly cause: unknown };

// --- Circuit breaker wrapper ---

export type RedisCircuitBreaker = {
  readonly execute: <T>(fn: () => Promise<Result<T, RedisCircuitBreakerError>>) => Promise<Result<T, RedisCircuitBreakerError>>;
  readonly state: () => CircuitState;
  readonly onStateChange: (handler: (state: CircuitState) => void) => { dispose: () => void };
};

export function createRedisCircuitBreaker(
  config: RedisCircuitBreakerConfig = RedisCircuitBreakerConfigSchema.parse({}),
): RedisCircuitBreaker {
  const policy = circuitBreaker(handleAll, {
    halfOpenAfter: config.halfOpenAfterMs,
    breaker: new ConsecutiveBreaker(config.threshold),
  });

  const execute = async <T>(
    fn: () => Promise<Result<T, RedisCircuitBreakerError>>,
  ): Promise<Result<T, RedisCircuitBreakerError>> => {
    try {
      return await policy.execute(async () => {
        const result = await fn();
        if (result.isErr()) {
          const wrapper = new Error('RedisError');
          (wrapper as unknown as { redisError: RedisCircuitBreakerError }).redisError = result.error;
          throw wrapper;
        }
        return result;
      });
    } catch (error: unknown) {
      if (error instanceof BrokenCircuitError) {
        return err({ _tag: 'CircuitOpen', message: 'Redis circuit breaker is open' });
      }
      if (error instanceof Error && 'redisError' in error) {
        return err((error as unknown as { redisError: RedisCircuitBreakerError }).redisError);
      }
      return err({
        _tag: 'RedisError',
        message: error instanceof Error ? error.message : String(error),
        cause: error,
      });
    }
  };

  // Track state locally via onStateChange to avoid unsafe internal access (RALPH-006)
  let currentState: CircuitState = 0 as CircuitState; // CircuitState.Closed
  policy.onStateChange((s) => { currentState = s; });

  return {
    execute,
    state: () => currentState,
    onStateChange: (handler) => policy.onStateChange(handler),
  };
}
