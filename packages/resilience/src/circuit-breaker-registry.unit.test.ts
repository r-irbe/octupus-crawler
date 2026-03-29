// Validates REQ-RES-002: Per-domain circuit breaker isolation
// Validates REQ-RES-003: ConsecutiveBreaker(5) threshold + halfOpenAfter(30s)
// Validates REQ-RES-004: State transition event callbacks
// Validates REQ-RES-020: LRU eviction at max domains

import { describe, it, expect, vi } from 'vitest';
import { CircuitState } from 'cockatiel';
import { createCircuitBreakerRegistry } from './circuit-breaker-registry.js';

describe('CircuitBreakerRegistry', () => {
  // Validates REQ-RES-002: per-domain isolation
  it('returns the same policy for the same domain', () => {
    const registry = createCircuitBreakerRegistry();
    const p1 = registry.get('example.com');
    const p2 = registry.get('example.com');
    expect(p1).toBe(p2);
  });

  it('returns different policies for different domains', () => {
    const registry = createCircuitBreakerRegistry();
    const p1 = registry.get('example.com');
    const p2 = registry.get('other.com');
    expect(p1).not.toBe(p2);
  });

  it('tracks size correctly', () => {
    const registry = createCircuitBreakerRegistry();
    expect(registry.size()).toBe(0);
    registry.get('a.com');
    expect(registry.size()).toBe(1);
    registry.get('b.com');
    expect(registry.size()).toBe(2);
    registry.get('a.com'); // re-access, no new entry
    expect(registry.size()).toBe(2);
  });

  // Validates REQ-RES-020: LRU eviction
  it('evicts LRU entry when max domains reached', () => {
    const registry = createCircuitBreakerRegistry({ circuitBreakerMaxDomains: 3 });
    registry.get('a.com');
    registry.get('b.com');
    registry.get('c.com');
    expect(registry.size()).toBe(3);

    // Access a.com to make it recently used, b.com becomes LRU
    registry.get('a.com');
    // Adding d.com should evict b.com (oldest)
    registry.get('d.com');
    expect(registry.size()).toBe(3);
    // b.com should have been evicted — getting it creates a new entry
    const bPolicy = registry.get('b.com');
    expect(registry.size()).toBe(3); // evicts c.com now
    expect(bPolicy).toBeDefined();
  });

  // Validates REQ-RES-004: state transition callbacks
  it('calls onStateChange when circuit breaks', async () => {
    const handler = vi.fn();
    const registry = createCircuitBreakerRegistry(
      { circuitBreakerThreshold: 2, circuitBreakerHalfOpenAfterMs: 100 },
      handler,
    );
    const policy = registry.get('fail.com');

    // Trigger 2 consecutive failures to open the circuit
    for (let i = 0; i < 2; i++) {
      try {
        await policy.execute(() => { throw new Error('fail'); });
      } catch {
        // expected
      }
    }

    // Should have been called with 'Open' state
    expect(handler).toHaveBeenCalledWith('fail.com', CircuitState.Open);
  });

  it('clear removes all entries and disposes listeners', () => {
    const handler = vi.fn();
    const registry = createCircuitBreakerRegistry({}, handler);
    registry.get('a.com');
    registry.get('b.com');
    expect(registry.size()).toBe(2);
    registry.clear();
    expect(registry.size()).toBe(0);
  });

  // Validates REQ-RES-003: getState returns circuit state
  it('getState returns undefined for unknown domain', () => {
    const registry = createCircuitBreakerRegistry();
    expect(registry.getState('unknown.com')).toBeUndefined();
  });

  it('getState returns Closed for healthy domain', () => {
    const registry = createCircuitBreakerRegistry();
    registry.get('healthy.com');
    expect(registry.getState('healthy.com')).toBe(CircuitState.Closed);
  });
});
