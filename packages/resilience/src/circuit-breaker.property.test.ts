// Property tests for circuit breaker state transitions
// Property for REQ-RES-003: Circuit breaker transitions closed → open → half-open → closed
// Implements: T-RES-021

import { describe, expect } from 'vitest';
import { fc, test as fcTest } from '@fast-check/vitest';
import { CircuitState } from 'cockatiel';
import { createCircuitBreakerRegistry } from './circuit-breaker-registry.js';

// Arbitrary: threshold between 1 and 10
const arbThreshold = fc.integer({ min: 1, max: 10 });

// Arbitrary: domain name
const arbDomain = fc
  .stringMatching(/^[a-z]{2,10}\.[a-z]{2,4}$/)
  .filter((s) => s.length >= 4);

describe('Circuit breaker state transition properties', () => {
  // Property for REQ-RES-003: circuit opens after N consecutive failures
  fcTest.prop([arbThreshold, arbDomain])(
    'circuit opens after exactly threshold consecutive failures',
    async (threshold: number, domain: string) => {
      const registry = createCircuitBreakerRegistry({
        circuitBreakerThreshold: threshold,
        circuitBreakerHalfOpenAfterMs: 60_000, // long enough to not trigger in test
      });

      const policy = registry.get(domain);
      let failureCount = 0;

      // Generate exactly threshold failures
      for (let i = 0; i < threshold; i++) {
        try {
          await policy.execute(() => {
            failureCount++;
            throw new Error('fail');
          });
        } catch {
          // expected
        }
      }

      expect(failureCount).toBe(threshold);
      expect(registry.getState(domain)).toBe(CircuitState.Open);
    },
  );

  // Property for REQ-RES-003: circuit stays closed with fewer failures than threshold
  fcTest.prop([arbThreshold, arbDomain])(
    'circuit stays closed with fewer failures than threshold',
    async (threshold: number, domain: string) => {
      fc.pre(threshold > 1); // need at least 2 for "fewer than"
      const registry = createCircuitBreakerRegistry({
        circuitBreakerThreshold: threshold,
        circuitBreakerHalfOpenAfterMs: 60_000,
      });

      const policy = registry.get(domain);

      // Generate threshold - 1 failures
      for (let i = 0; i < threshold - 1; i++) {
        try {
          await policy.execute(() => { throw new Error('fail'); });
        } catch {
          // expected
        }
      }

      expect(registry.getState(domain)).toBe(CircuitState.Closed);
    },
  );

  // Property for REQ-RES-003: success resets consecutive failure count
  fcTest.prop([arbThreshold, arbDomain])(
    'success resets consecutive failure count',
    async (threshold: number, domain: string) => {
      fc.pre(threshold > 1);
      const registry = createCircuitBreakerRegistry({
        circuitBreakerThreshold: threshold,
        circuitBreakerHalfOpenAfterMs: 60_000,
      });

      const policy = registry.get(domain);

      // Generate threshold - 1 failures
      for (let i = 0; i < threshold - 1; i++) {
        try {
          await policy.execute(() => { throw new Error('fail'); });
        } catch {
          // expected
        }
      }

      // Success resets
      await policy.execute(() => 'ok');

      // Another threshold - 1 failures should not open
      for (let i = 0; i < threshold - 1; i++) {
        try {
          await policy.execute(() => { throw new Error('fail'); });
        } catch {
          // expected
        }
      }

      expect(registry.getState(domain)).toBe(CircuitState.Closed);
    },
  );

  // Property for REQ-RES-002: per-domain isolation — opening one doesn't affect another
  fcTest.prop([arbDomain, arbDomain])(
    'per-domain isolation: failing one domain does not affect another',
    async (domain1: string, domain2: string) => {
      fc.pre(domain1 !== domain2);
      const registry = createCircuitBreakerRegistry({
        circuitBreakerThreshold: 2,
        circuitBreakerHalfOpenAfterMs: 60_000,
      });

      const p1 = registry.get(domain1);

      // Open circuit for domain1
      for (let i = 0; i < 2; i++) {
        try {
          await p1.execute(() => { throw new Error('fail'); });
        } catch {
          // expected
        }
      }

      expect(registry.getState(domain1)).toBe(CircuitState.Open);

      // domain2 should still be closed
      const p2 = registry.get(domain2);
      const result = await p2.execute(() => 'ok');
      expect(result).toBe('ok');
      expect(registry.getState(domain2)).toBe(CircuitState.Closed);
    },
  );

  // Property for REQ-RES-020: LRU eviction maintains max size
  fcTest.prop([fc.integer({ min: 2, max: 20 })])(
    'LRU eviction never exceeds max domains',
    (maxDomains: number) => {
      const registry = createCircuitBreakerRegistry({ circuitBreakerMaxDomains: maxDomains });

      // Add more domains than max
      for (let i = 0; i < maxDomains + 5; i++) {
        registry.get(`domain-${String(i)}.com`);
      }

      expect(registry.size()).toBeLessThanOrEqual(maxDomains);
    },
  );
});
