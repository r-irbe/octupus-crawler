// Unit tests: Resilient CrawlURLRepository with DB circuit breaker
// Validates REQ-RES-001: Database queries use circuit breakers
import { describe, it, expect, vi } from 'vitest';
import { ok, err } from 'neverthrow';
import type { CrawlURLRepository } from './crawl-url-repository.js';
import type { DatabaseCircuitBreaker } from '../connection/circuit-breaker.js';
import { createResilientCrawlURLRepository } from './resilient-crawl-url-repository.js';

function createMockRepo(): CrawlURLRepository {
  return {
    findById: vi.fn(() => Promise.resolve(ok(undefined))),
    findByHash: vi.fn(() => Promise.resolve(ok(undefined))),
    save: vi.fn(() => Promise.resolve(ok({
      id: 1n, url: 'https://x.com', urlHash: 'abc', domain: 'x.com',
      status: 'pending' as const, statusCode: null, contentType: null,
      s3Key: null, depth: 0, discoveredAt: new Date(), fetchedAt: null,
      parentUrlId: null, metadata: {},
    }))),
    saveBatch: vi.fn(() => Promise.resolve(ok(1))),
    findPendingByDomain: vi.fn(() => Promise.resolve(ok([]))),
    updateStatus: vi.fn(() => Promise.resolve(ok(undefined))),
  };
}

function createMockCB(passthrough = true): DatabaseCircuitBreaker {
  return {
    execute: vi.fn((fn: () => Promise<unknown>) => {
      if (passthrough) {
        return fn();
      }
      return Promise.resolve(err({ _tag: 'CircuitOpen' as const, service: 'database', message: 'Circuit is open' }));
    }) as unknown as DatabaseCircuitBreaker['execute'],
    state: vi.fn().mockReturnValue('closed') as unknown as DatabaseCircuitBreaker['state'],
    onStateChange: vi.fn(() => ({ dispose: vi.fn() })) as unknown as DatabaseCircuitBreaker['onStateChange'],
  };
}

describe('ResilientCrawlURLRepository', () => {
  // Validates REQ-RES-001
  it('delegates findById through circuit breaker', async () => {
    const repo = createMockRepo();
    const cb = createMockCB();
    const resilient = createResilientCrawlURLRepository(repo, cb);

    await resilient.findById(1n);
    expect(cb.execute).toHaveBeenCalledTimes(1);
    expect(repo.findById).toHaveBeenCalledWith(1n);
  });

  // Validates REQ-RES-001
  it('delegates findByHash through circuit breaker', async () => {
    const repo = createMockRepo();
    const cb = createMockCB();
    const resilient = createResilientCrawlURLRepository(repo, cb);

    await resilient.findByHash('abc123');
    expect(cb.execute).toHaveBeenCalledTimes(1);
    expect(repo.findByHash).toHaveBeenCalledWith('abc123');
  });

  // Validates REQ-RES-001
  it('delegates save through circuit breaker', async () => {
    const repo = createMockRepo();
    const cb = createMockCB();
    const resilient = createResilientCrawlURLRepository(repo, cb);

    await resilient.save({ url: 'https://x.com', urlHash: 'abc', domain: 'x.com', depth: 0 });
    expect(cb.execute).toHaveBeenCalledTimes(1);
  });

  // Validates REQ-RES-001
  it('returns CircuitOpen when CB is open', async () => {
    const repo = createMockRepo();
    const cb = createMockCB(false);
    const resilient = createResilientCrawlURLRepository(repo, cb);

    const result = await resilient.findById(1n);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe('CircuitOpen');
    }
    expect(repo.findById).not.toHaveBeenCalled();
  });

  // Validates REQ-RES-001
  it('delegates saveBatch through circuit breaker', async () => {
    const repo = createMockRepo();
    const cb = createMockCB();
    const resilient = createResilientCrawlURLRepository(repo, cb);

    await resilient.saveBatch([{ url: 'https://x.com', urlHash: 'abc', domain: 'x.com', depth: 0 }]);
    expect(cb.execute).toHaveBeenCalledTimes(1);
  });

  // Validates REQ-RES-001
  it('delegates updateStatus through circuit breaker', async () => {
    const repo = createMockRepo();
    const cb = createMockCB();
    const resilient = createResilientCrawlURLRepository(repo, cb);

    await resilient.updateStatus(1n, 'fetched');
    expect(cb.execute).toHaveBeenCalledTimes(1);
  });
});
