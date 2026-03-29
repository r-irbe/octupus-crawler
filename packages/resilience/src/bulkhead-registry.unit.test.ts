// Bulkhead registry — unit tests
// Validates REQ-RES-012, REQ-RES-013

import { describe, it, expect } from 'vitest';
import { createBulkheadRegistry } from './bulkhead-registry.js';

describe('createBulkheadRegistry', () => {
  it('returns a policy for a domain', () => {
    const registry = createBulkheadRegistry();
    const policy = registry.get('example.com');
    expect(policy).toBeDefined();
    expect(typeof policy.execute).toBe('function');
  });

  it('returns same policy for same domain', () => {
    const registry = createBulkheadRegistry();
    const p1 = registry.get('a.com');
    const p2 = registry.get('a.com');
    expect(p1).toBe(p2);
  });

  it('returns different policies for different domains', () => {
    const registry = createBulkheadRegistry();
    const p1 = registry.get('a.com');
    const p2 = registry.get('b.com');
    expect(p1).not.toBe(p2);
  });

  it('limits concurrency per domain', async () => {
    const registry = createBulkheadRegistry({ bulkheadMaxConcurrentPerDomain: 1 });
    const policy = registry.get('example.com');

    let concurrentCount = 0;
    let maxConcurrent = 0;

    const tasks = Array.from({ length: 3 }, () =>
      policy.execute(async () => {
        concurrentCount++;
        maxConcurrent = Math.max(maxConcurrent, concurrentCount);
        await new Promise((resolve) => { setTimeout(resolve, 50); });
        concurrentCount--;
        return 'done';
      }),
    );

    await Promise.all(tasks);
    expect(maxConcurrent).toBe(1);
  });

  it('tracks size', () => {
    const registry = createBulkheadRegistry();
    expect(registry.size()).toBe(0);
    registry.get('a.com');
    registry.get('b.com');
    expect(registry.size()).toBe(2);
  });

  it('clear removes all entries', () => {
    const registry = createBulkheadRegistry();
    registry.get('a.com');
    registry.get('b.com');
    registry.clear();
    expect(registry.size()).toBe(0);
  });
});
