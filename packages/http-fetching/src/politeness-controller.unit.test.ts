// Validates T-FETCH-018, T-FETCH-032, T-FETCH-033
// REQ-FETCH-009 to 013, REQ-FETCH-020, REQ-FETCH-021

import { describe, it, expect, afterEach } from 'vitest';
import { PolitenessController, getRegistrableDomain } from './politeness-controller.js';
import type { PolitenessConfig } from './politeness-controller.js';

const FAST_CONFIG: PolitenessConfig = {
  delayMs: 50,
  maxDomains: 100,
  staleThresholdMs: 0, // disable pruning timer for tests
};

let controller: PolitenessController | undefined;

afterEach(() => {
  controller?.dispose();
  controller = undefined;
});

describe('PolitenessController', () => {
  // REQ-FETCH-010: First request proceeds immediately
  it('first request to a domain returns immediately', async () => {
    controller = new PolitenessController(FAST_CONFIG);
    const start = performance.now();
    await controller.acquire('example.com');
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(30);
  });

  // REQ-FETCH-009: Subsequent requests are delayed
  it('second request to same domain is delayed', async () => {
    controller = new PolitenessController(FAST_CONFIG);
    await controller.acquire('example.com');

    const start = performance.now();
    await controller.acquire('example.com');
    const elapsed = performance.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(40);
  });

  // REQ-FETCH-020: Concurrent calls are serialized
  it('concurrent requests to same domain are serialized', async () => {
    controller = new PolitenessController({ ...FAST_CONFIG, delayMs: 30 });
    await controller.acquire('example.com');

    const timestamps: number[] = [];
    const base = performance.now();

    await Promise.all([
      controller.acquire('example.com').then(() => { timestamps.push(performance.now() - base); }),
      controller.acquire('example.com').then(() => { timestamps.push(performance.now() - base); }),
    ]);

    expect(timestamps).toHaveLength(2);
    // Second should complete after first — gap should be ≥ delayMs
    const [first, second] = timestamps;
    if (first !== undefined && second !== undefined) {
      expect(Math.abs(second - first)).toBeGreaterThanOrEqual(20);
    }
  });

  // Different domains are independent
  it('different domains proceed independently', async () => {
    controller = new PolitenessController(FAST_CONFIG);
    await controller.acquire('a.com');

    const start = performance.now();
    await controller.acquire('b.com'); // different domain — no delay
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(30);
  });

  // REQ-FETCH-011: release does not break chain
  it('release does not disrupt promise chain', async () => {
    controller = new PolitenessController(FAST_CONFIG);
    await controller.acquire('example.com');
    controller.release('example.com');
    // Subsequent acquire should still enforce delay
    const start = performance.now();
    await controller.acquire('example.com');
    const elapsed = performance.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(40);
  });

  // REQ-FETCH-012: Stale entry pruning
  it('prunes stale entries older than threshold', async () => {
    // staleThresholdMs: 0 disables the auto-timer but pruneStale() still
    // calculates cutoff = Date.now() - 0 = Date.now()
    controller = new PolitenessController(FAST_CONFIG); // staleThresholdMs: 0

    await controller.acquire('stale.com');
    expect(controller.trackedDomains).toBe(1);

    // Wait for Date.now() to advance past the entry's lastAccessMs
    await new Promise((r) => { setTimeout(r, 20); });
    const pruned = controller.pruneStale();
    expect(pruned).toBe(1);
    expect(controller.trackedDomains).toBe(0);
  });

  // REQ-FETCH-013: LRU eviction when at maxDomains
  it('evicts LRU domain when maxDomains exceeded', async () => {
    controller = new PolitenessController({ ...FAST_CONFIG, maxDomains: 2 });
    await controller.acquire('a.com');
    await controller.acquire('b.com');
    await controller.acquire('c.com'); // evicts a.com

    expect(controller.trackedDomains).toBeLessThanOrEqual(2);
  });

  it('dispose clears all resources', () => {
    controller = new PolitenessController(FAST_CONFIG);
    controller.dispose();
    expect(controller.trackedDomains).toBe(0);
    controller = undefined; // already disposed
  });
});

// REQ-FETCH-021: TLD+1 domain grouping
describe('getRegistrableDomain', () => {
  it('extracts TLD+1 from subdomain', () => {
    expect(getRegistrableDomain('api.example.com')).toBe('example.com');
  });

  it('extracts TLD+1 from deep subdomain', () => {
    expect(getRegistrableDomain('a.b.c.example.com')).toBe('example.com');
  });

  it('returns bare domain unchanged', () => {
    expect(getRegistrableDomain('example.com')).toBe('example.com');
  });

  it('falls back to hostname for localhost', () => {
    expect(getRegistrableDomain('localhost')).toBe('localhost');
  });

  it('falls back to hostname for IP addresses', () => {
    expect(getRegistrableDomain('192.168.1.1')).toBe('192.168.1.1');
  });

  it('lowercases the result', () => {
    expect(getRegistrableDomain('API.Example.COM')).toBe('example.com');
  });
});
