// Unit tests for production-testing simulator routes
// Validates: T-PROD-002, T-PROD-003, T-PROD-004, T-PROD-005

import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { createWebSimulator, type WebSimulatorInstance } from './web-simulator.js';
import {
  burstLinksRoute,
  connectionHoldRoute,
  dynamic429Route,
  resetDynamic429State,
} from './built-in-scenarios.js';

let simulator: WebSimulatorInstance | undefined;

afterEach(async () => {
  if (simulator !== undefined) {
    await simulator.close();
    simulator = undefined;
  }
});

describe('burstLinksRoute', () => {
  // Validates REQ-PROD-020: burst links page generates N unique links
  it('returns page with specified number of links', async () => {
    simulator = await createWebSimulator({ port: 0 }, [burstLinksRoute]);

    const res = await fetch(`${simulator.url}/burst-links?count=50`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('Burst Links (50)');
    // Verify first and last links are present
    expect(html).toContain('href="/page-0"');
    expect(html).toContain('href="/page-49"');
    expect(html).not.toContain('href="/page-50"');
  });

  // Validates REQ-PROD-020: defaults to 10 links
  it('defaults to 10 links when count not specified', async () => {
    simulator = await createWebSimulator({ port: 0 }, [burstLinksRoute]);

    const res = await fetch(`${simulator.url}/burst-links`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('Burst Links (10)');
    expect(html).toContain('href="/page-9"');
    expect(html).not.toContain('href="/page-10"');
  });

  // Validates REQ-PROD-024: caps at 10,000 links
  it('caps link count at 10000', async () => {
    simulator = await createWebSimulator({ port: 0 }, [burstLinksRoute]);

    const res = await fetch(`${simulator.url}/burst-links?count=99999`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('Burst Links (10000)');
  });

  // Validates edge case: invalid count
  it('uses default for invalid count parameter', async () => {
    simulator = await createWebSimulator({ port: 0 }, [burstLinksRoute]);

    const res = await fetch(`${simulator.url}/burst-links?count=abc`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('Burst Links (10)');
  });
});

describe('connectionHoldRoute', () => {
  // Validates REQ-PROD-007: connection hold delays response
  it('returns response with specified delay', async () => {
    simulator = await createWebSimulator({ port: 0 }, [connectionHoldRoute]);

    const start = Date.now();
    const res = await fetch(`${simulator.url}/connection-hold?ms=100`);
    const elapsed = Date.now() - start;

    expect(res.status).toBe(200);
    expect(elapsed).toBeGreaterThanOrEqual(80); // timing variance
    const body = await res.text();
    expect(body).toContain('Connection held');
  });

  // Validates REQ-PROD-007: defaults to 5000ms
  it('defaults to 5000ms delay', () => {
    const response = connectionHoldRoute.handler({
      url: '/connection-hold',
      method: 'GET',
      headers: {},
    });
    // Not a promise — sync handler
    const result = response as Awaited<typeof response>;
    expect(result.delay).toBe(5000);
  });

  // Validates: caps at 60,000ms
  it('caps delay at 60000ms', () => {
    const response = connectionHoldRoute.handler({
      url: '/connection-hold?ms=999999',
      method: 'GET',
      headers: {},
    });
    const result = response as Awaited<typeof response>;
    expect(result.delay).toBe(60_000);
  });
});

describe('dynamic429Route', () => {
  beforeEach(() => {
    resetDynamic429State();
  });

  // Validates REQ-PROD-022: returns 200 for first N requests
  it('returns 200 for requests within threshold', async () => {
    simulator = await createWebSimulator({ port: 0 }, [dynamic429Route]);

    for (let i = 0; i < 3; i++) {
      const res = await fetch(`${simulator.url}/dynamic-429?after=3`);
      expect(res.status).toBe(200);
    }
  });

  // Validates REQ-PROD-022: returns 429 after N requests
  it('returns 429 after exceeding threshold', async () => {
    simulator = await createWebSimulator({ port: 0 }, [dynamic429Route]);

    // First 2 succeed (after=2)
    for (let i = 0; i < 2; i++) {
      const res = await fetch(`${simulator.url}/dynamic-429?after=2`);
      expect(res.status).toBe(200);
    }

    // Third request should be 429
    const res = await fetch(`${simulator.url}/dynamic-429?after=2`);
    expect(res.status).toBe(429);
    expect(res.headers.get('retry-after')).toBe('10');
  });

  // Validates REQ-PROD-022: state resets with resetDynamic429State
  it('reset function clears request counter', async () => {
    simulator = await createWebSimulator({ port: 0 }, [dynamic429Route]);

    // Exhaust the threshold
    await fetch(`${simulator.url}/dynamic-429?after=1`);
    const blocked = await fetch(`${simulator.url}/dynamic-429?after=1`);
    expect(blocked.status).toBe(429);

    // Reset and verify 200 again
    resetDynamic429State();
    const res = await fetch(`${simulator.url}/dynamic-429?after=1`);
    expect(res.status).toBe(200);
  });
});
