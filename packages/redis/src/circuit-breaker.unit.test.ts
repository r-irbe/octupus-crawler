// Unit tests: Redis circuit breaker wrapper
// Validates REQ-RES-001: Circuit breakers for Redis operations
import { describe, it, expect } from 'vitest';
import { ok, err } from 'neverthrow';
import { CircuitState } from 'cockatiel';
import {
  createRedisCircuitBreaker,
  RedisCircuitBreakerConfigSchema,
  type RedisCircuitBreakerError,
} from './circuit-breaker.js';

describe('RedisCircuitBreakerConfigSchema', () => {
  // Validates REQ-RES-001
  it('provides sensible defaults', () => {
    const config = RedisCircuitBreakerConfigSchema.parse({});
    expect(config.threshold).toBe(5);
    expect(config.halfOpenAfterMs).toBe(10_000);
  });

  // Validates REQ-RES-001
  it('accepts custom config', () => {
    const config = RedisCircuitBreakerConfigSchema.parse({ threshold: 3, halfOpenAfterMs: 5_000 });
    expect(config.threshold).toBe(3);
    expect(config.halfOpenAfterMs).toBe(5_000);
  });

  // Validates REQ-RES-001
  it('rejects invalid config', () => {
    expect(() => RedisCircuitBreakerConfigSchema.parse({ threshold: 0 })).toThrow();
    expect(() => RedisCircuitBreakerConfigSchema.parse({ threshold: -1 })).toThrow();
  });
});

describe('RedisCircuitBreaker', () => {
  // Validates REQ-RES-001
  it('passes through successful results', async () => {
    const cb = createRedisCircuitBreaker({ threshold: 3, halfOpenAfterMs: 30_000 });
    const result = await cb.execute(() => Promise.resolve(ok('hello')));
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBe('hello');
    }
  });

  // Validates REQ-RES-001
  it('passes through err results and counts as failure', async () => {
    const cb = createRedisCircuitBreaker({ threshold: 5, halfOpenAfterMs: 30_000 });
    const error: RedisCircuitBreakerError = { _tag: 'RedisError', message: 'fail', cause: undefined };
    const result = await cb.execute(() => Promise.resolve(err(error)));
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe('RedisError');
    }
  });

  // Validates REQ-RES-001
  it('opens circuit after threshold consecutive failures', async () => {
    const cb = createRedisCircuitBreaker({ threshold: 2, halfOpenAfterMs: 60_000 });
    const error: RedisCircuitBreakerError = { _tag: 'RedisError', message: 'down', cause: undefined };

    // Two failures to open circuit
    await cb.execute(() => Promise.resolve(err(error)));
    await cb.execute(() => Promise.resolve(err(error)));

    // Third call should get CircuitOpen
    const result = await cb.execute(() => Promise.resolve(ok('should not reach')));
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe('CircuitOpen');
    }
  });

  // Validates REQ-RES-001
  it('exposes circuit state', () => {
    const cb = createRedisCircuitBreaker({ threshold: 3, halfOpenAfterMs: 30_000 });
    expect(cb.state()).toBe(CircuitState.Closed);
  });

  // Validates REQ-RES-001
  it('fires state change callback', async () => {
    const cb = createRedisCircuitBreaker({ threshold: 1, halfOpenAfterMs: 60_000 });
    const states: Array<unknown> = [];
    cb.onStateChange((s) => states.push(s));

    const error: RedisCircuitBreakerError = { _tag: 'RedisError', message: 'x', cause: undefined };
    await cb.execute(() => Promise.resolve(err(error)));

    expect(states.length).toBeGreaterThan(0);
    expect(states).toContain(CircuitState.Open);
  });

  // Validates REQ-RES-001 — circuit recovery: open → half-open → closed (RALPH-012)
  it('recovers from open to closed after halfOpenAfterMs', async () => {
    const cb = createRedisCircuitBreaker({ threshold: 1, halfOpenAfterMs: 50 });
    const error: RedisCircuitBreakerError = { _tag: 'RedisError', message: 'down', cause: undefined };

    // Trip the circuit
    await cb.execute(() => Promise.resolve(err(error)));
    expect(cb.state()).toBe(CircuitState.Open);

    // Wait for half-open window
    await new Promise((resolve) => { setTimeout(resolve, 80); });

    // Successful call should close the circuit
    const result = await cb.execute(() => Promise.resolve(ok('recovered')));
    expect(result.isOk()).toBe(true);
    expect(cb.state()).toBe(CircuitState.Closed);
  });

  // Validates REQ-RES-001
  it('handles thrown exceptions from fn', async () => {
    const cb = createRedisCircuitBreaker({ threshold: 5, halfOpenAfterMs: 30_000 });
    const result = await cb.execute(() => Promise.reject(new Error('boom')));
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe('RedisError');
      expect(result.error.message).toContain('boom');
    }
  });
});
