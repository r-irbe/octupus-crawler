// Fetch policy stack — unit tests
// Validates REQ-RES-018, REQ-RES-019

import { describe, it, expect, vi } from 'vitest';
import { createFetchPolicyStack } from './fetch-policy-stack.js';

describe('createFetchPolicyStack', () => {
  it('returns a composed policy for a domain', () => {
    const stack = createFetchPolicyStack();
    const policy = stack.getPolicy('example.com');
    expect(policy).toBeDefined();
    expect(typeof policy.execute).toBe('function');
    stack.dispose();
  });

  it('executes successfully through composed policy', async () => {
    const stack = createFetchPolicyStack({
      retryMaxAttempts: 1,
      timeoutFetchMs: 5_000,
    });
    const policy = stack.getPolicy('example.com');
    const result = await policy.execute(() => Promise.resolve('ok'));
    expect(result).toBe('ok');
    stack.dispose();
  });

  it('rate limiter checks per domain', () => {
    const stack = createFetchPolicyStack({ maxTokens: 1, refillRate: 0.001 });
    expect(stack.checkRateLimit('a.com')).toBe(true);
    expect(stack.checkRateLimit('a.com')).toBe(false);
    // Different domain
    expect(stack.checkRateLimit('b.com')).toBe(true);
    stack.dispose();
  });

  it('executeWithFallback caches and serves stale data', async () => {
    const stack = createFetchPolicyStack();
    // Prime
    await stack.executeWithFallback('a.com', () => Promise.resolve('data'));
    // Fail and fallback
    const result = await stack.executeWithFallback('a.com', () =>
      Promise.reject(new Error('down')),
    );
    expect(result).toBe('data');
    stack.dispose();
  });

  it('fires onCircuitStateChange handler', async () => {
    const onCircuit = vi.fn();
    const stack = createFetchPolicyStack(
      { circuitBreakerThreshold: 1, retryMaxAttempts: 0, timeoutFetchMs: 5_000 },
      { onCircuitStateChange: onCircuit },
    );
    const policy = stack.getPolicy('a.com');
    // Trip the breaker with 1 failure
    try { await policy.execute(() => Promise.reject(new Error('fail'))); } catch { /* expected */ }
    expect(onCircuit).toHaveBeenCalled();
    stack.dispose();
  });

  it('exposes circuit breaker registry', () => {
    const stack = createFetchPolicyStack();
    stack.getPolicy('a.com');
    expect(stack.circuitBreakers.size()).toBe(1);
    stack.dispose();
  });

  it('exposes bulkhead registry', () => {
    const stack = createFetchPolicyStack();
    stack.getPolicy('a.com');
    expect(stack.bulkheads.size()).toBe(1);
    stack.dispose();
  });

  it('dispose clears all registries', () => {
    const stack = createFetchPolicyStack();
    stack.getPolicy('a.com');
    stack.checkRateLimit('b.com');
    stack.dispose();
    expect(stack.circuitBreakers.size()).toBe(0);
    expect(stack.bulkheads.size()).toBe(0);
    expect(stack.rateLimiter.size()).toBe(0);
  });
});
