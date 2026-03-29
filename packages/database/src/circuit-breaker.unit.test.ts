// Database circuit breaker — Unit tests
// Validates: T-DATA-015 (REQ-DATA-020) — circuit breaker for DB calls

import { describe, it, expect } from 'vitest';
import { ok, err } from 'neverthrow';
import { createDatabaseCircuitBreaker, CircuitBreakerConfigSchema } from './connection/circuit-breaker.js';
import { createQueryFailed } from './errors.js';
import { CircuitState } from 'cockatiel';

describe('CircuitBreakerConfigSchema', () => {
  // Validates REQ-DATA-020: configurable threshold
  it('provides sensible defaults', () => {
    const config = CircuitBreakerConfigSchema.parse({});
    expect(config.threshold).toBe(5);
    expect(config.halfOpenAfterMs).toBe(30_000);
  });

  it('accepts custom values', () => {
    const config = CircuitBreakerConfigSchema.parse({ threshold: 3, halfOpenAfterMs: 10_000 });
    expect(config.threshold).toBe(3);
    expect(config.halfOpenAfterMs).toBe(10_000);
  });

  it('rejects invalid threshold', () => {
    expect(() => CircuitBreakerConfigSchema.parse({ threshold: 0 })).toThrow();
    expect(() => CircuitBreakerConfigSchema.parse({ threshold: -1 })).toThrow();
  });
});

describe('DatabaseCircuitBreaker', () => {
  // Validates REQ-DATA-020: successful operations pass through
  it('passes successful operations through', async () => {
    const cb = createDatabaseCircuitBreaker({ threshold: 3, halfOpenAfterMs: 30_000 });
    const result = await cb.execute(() => Promise.resolve(ok(42)));

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toBe(42);
  });

  // Validates REQ-DATA-020: returns DataError for failed operations (not thrown)
  it('returns inner DataError for failed operations', async () => {
    const cb = createDatabaseCircuitBreaker({ threshold: 5, halfOpenAfterMs: 30_000 });
    const error = createQueryFailed('test', new Error('timeout'));
    const result = await cb.execute(() => Promise.resolve(err(error)));

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()._tag).toBe('QueryFailed');
  });

  // Validates REQ-DATA-020: circuit opens after threshold failures
  it('opens circuit after consecutive failures', async () => {
    const cb = createDatabaseCircuitBreaker({ threshold: 2, halfOpenAfterMs: 60_000 });
    const error = createQueryFailed('test', new Error('connection refused'));

    // Fail twice to trip the circuit
    await cb.execute(() => Promise.resolve(err(error)));
    await cb.execute(() => Promise.resolve(err(error)));

    // Third call should get CircuitOpen
    const result = await cb.execute(() => Promise.resolve(ok('should not reach')));

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()._tag).toBe('CircuitOpen');
  });

  // Validates REQ-DATA-020: read state
  it('reports circuit state', () => {
    const cb = createDatabaseCircuitBreaker({ threshold: 3, halfOpenAfterMs: 30_000 });
    // Initial state should be closed
    const state = cb.state();
    expect(state).toBeDefined();
  });

  // Validates REQ-DATA-020: state change callback
  it('fires state change callback', async () => {
    const cb = createDatabaseCircuitBreaker({ threshold: 1, halfOpenAfterMs: 60_000 });
    const states: CircuitState[] = [];
    const sub = cb.onStateChange((state) => {
      states.push(state);
    });

    const error = createQueryFailed('test', new Error('fail'));
    await cb.execute(() => Promise.resolve(err(error)));

    // Should have transitioned to open
    expect(states.length).toBeGreaterThan(0);
    sub.dispose();
  });

  // Validates REQ-DATA-020: resets on success
  it('stays closed after successful calls', async () => {
    const cb = createDatabaseCircuitBreaker({ threshold: 3, halfOpenAfterMs: 30_000 });

    for (let i = 0; i < 5; i++) {
      const result = await cb.execute(() => Promise.resolve(ok(i)));
      expect(result.isOk()).toBe(true);
    }

    // Circuit should still be closed
    expect(cb.state()).toBe(CircuitState.Closed);
  });

  // Validates: consecutive breaker resets on success between failures
  it('resets failure count on success', async () => {
    const cb = createDatabaseCircuitBreaker({ threshold: 3, halfOpenAfterMs: 60_000 });
    const error = createQueryFailed('test', new Error('fail'));

    // Fail twice (below threshold)
    await cb.execute(() => Promise.resolve(err(error)));
    await cb.execute(() => Promise.resolve(err(error)));
    // Success resets counter
    await cb.execute(() => Promise.resolve(ok('reset')));
    // Fail twice more (still below threshold since counter reset)
    await cb.execute(() => Promise.resolve(err(error)));
    await cb.execute(() => Promise.resolve(err(error)));

    // Should still be closed (never hit 3 consecutive)
    const result = await cb.execute(() => Promise.resolve(ok('still works')));
    expect(result.isOk()).toBe(true);
  });

  // Validates REQ-DATA-020: unexpected errors return ConnectionFailed, not CircuitOpen
  it('returns ConnectionFailed for unexpected thrown errors', async () => {
    const cb = createDatabaseCircuitBreaker({ threshold: 5, halfOpenAfterMs: 30_000 });
    const result = await cb.execute(() => {
      throw new TypeError('unexpected programming error');
    });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()._tag).toBe('ConnectionFailed');
  });
});
