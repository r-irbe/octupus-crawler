// Validates REQ-RES-007: Retry composable with circuit breaker via wrap()
// Validates REQ-RES-018: Composition order timeout → retry → circuit breaker

import { describe, it, expect, vi } from 'vitest';
import { CircuitState } from 'cockatiel';
import { createPolicyComposer } from './policy-composer.js';

describe('PolicyComposer', () => {
  // Validates REQ-RES-018: composed policy executes successfully
  it('creates a composed policy that succeeds', async () => {
    const composer = createPolicyComposer({
      timeoutFetchMs: 5000,
      retryMaxAttempts: 2,
      retryInitialDelayMs: 10,
      retryMaxDelayMs: 50,
      circuitBreakerThreshold: 5,
      circuitBreakerHalfOpenAfterMs: 30_000,
    });

    const policy = composer.getPolicy('example.com');
    const result = await policy.execute(() => 'data');
    expect(result).toBe('data');
    composer.dispose();
  });

  // Validates REQ-RES-019: factory returns policy for any domain
  it('returns different policies for different domains', () => {
    const composer = createPolicyComposer();
    const p1 = composer.getPolicy('a.com');
    const p2 = composer.getPolicy('b.com');
    expect(p1).not.toBe(p2);
    composer.dispose();
  });

  it('retries through the composed policy', async () => {
    const onRetry = vi.fn();
    const composer = createPolicyComposer(
      {
        retryMaxAttempts: 3,
        retryInitialDelayMs: 10,
        retryMaxDelayMs: 50,
        timeoutFetchMs: 5000,
      },
      { onRetry },
    );

    let calls = 0;
    const policy = composer.getPolicy('retry.com');
    const result = await policy.execute(() => {
      calls++;
      if (calls < 2) throw new Error('transient');
      return 'recovered';
    });

    expect(result).toBe('recovered');
    expect(calls).toBe(2);
    composer.dispose();
  });

  // Validates REQ-RES-004: circuit breaker state change events fire
  it('fires circuit state change events through composed policy', async () => {
    const onCircuitStateChange = vi.fn();
    const composer = createPolicyComposer(
      {
        circuitBreakerThreshold: 2,
        circuitBreakerHalfOpenAfterMs: 100,
        retryMaxAttempts: 1,
        retryInitialDelayMs: 10,
        retryMaxDelayMs: 10,
        timeoutFetchMs: 5000,
      },
      { onCircuitStateChange },
    );

    const policy = composer.getPolicy('break.com');
    // Trigger failures to open the circuit
    for (let i = 0; i < 2; i++) {
      try {
        await policy.execute(() => { throw new Error('fail'); });
      } catch {
        // expected
      }
    }

    expect(onCircuitStateChange).toHaveBeenCalledWith('break.com', CircuitState.Open);
    composer.dispose();
  });

  it('exposes the circuit breaker registry', () => {
    const composer = createPolicyComposer();
    expect(composer.registry).toBeDefined();
    expect(typeof composer.registry.size).toBe('function');
    composer.dispose();
  });

  it('dispose clears the registry', () => {
    const composer = createPolicyComposer();
    composer.getPolicy('a.com');
    expect(composer.registry.size()).toBe(1);
    composer.dispose();
    expect(composer.registry.size()).toBe(0);
  });
});
