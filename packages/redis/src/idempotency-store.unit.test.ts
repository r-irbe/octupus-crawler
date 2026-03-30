// Unit tests: Idempotency key store
// Validates REQ-COMM-021, REQ-COMM-022: Idempotency key caching
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createIdempotencyStore, type CachedResponse } from './idempotency-store.js';

function createMockRedis(overrides: Record<string, unknown> = {}): Parameters<typeof createIdempotencyStore>[0] {
  return {
    get: vi.fn(() => Promise.resolve(null)),
    set: vi.fn(() => Promise.resolve('OK')),
    del: vi.fn(() => Promise.resolve(1)),
    ...overrides,
  } as unknown as Parameters<typeof createIdempotencyStore>[0];
}

describe('IdempotencyStore', () => {
  let redis: ReturnType<typeof createMockRedis>;

  beforeEach(() => {
    redis = createMockRedis();
  });

  // Validates REQ-COMM-022
  it('returns undefined when key not found', async () => {
    const store = createIdempotencyStore(redis);
    const result = await store.get('unknown-key');
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBeUndefined();
    }
  });

  // Validates REQ-COMM-022
  it('returns cached response when key exists', async () => {
    const cached: CachedResponse = { statusCode: 200, body: '{"id":1}', contentType: 'application/json' };
    const mockRedis = createMockRedis({
      get: vi.fn(() => Promise.resolve(JSON.stringify(cached))),
    });
    const store = createIdempotencyStore(mockRedis);
    const result = await store.get('idem-123');
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toEqual(cached);
    }
  });

  // Validates REQ-COMM-021
  it('stores response with TTL', async () => {
    const store = createIdempotencyStore(redis, { ttlMs: 3_600_000 });
    const response: CachedResponse = { statusCode: 201, body: '{}', contentType: 'application/json' };
    const result = await store.set('key-abc', response);
    expect(result.isOk()).toBe(true);
    expect(redis.set).toHaveBeenCalledWith(
      'idem:key-abc',
      JSON.stringify(response),
      'PX',
      3_600_000,
    );
  });

  // Validates REQ-COMM-021
  it('uses default 24h TTL', async () => {
    const store = createIdempotencyStore(redis);
    await store.set('key', { statusCode: 200, body: '', contentType: 'text/plain' });
    expect(redis.set).toHaveBeenCalledWith(
      'idem:key',
      expect.any(String),
      'PX',
      86_400_000,
    );
  });

  // Validates REQ-COMM-021
  it('uses custom key prefix', async () => {
    const store = createIdempotencyStore(redis, { keyPrefix: 'api-idem' });
    await store.get('k1');
    expect(redis.get).toHaveBeenCalledWith('api-idem:k1');
  });

  // Validates REQ-COMM-021
  it('deletes cached key', async () => {
    const store = createIdempotencyStore(redis);
    const result = await store.delete('old-key');
    expect(result.isOk()).toBe(true);
    expect(redis.del).toHaveBeenCalledWith('idem:old-key');
  });

  // Validates REQ-COMM-021
  it('returns ConnectionError on Redis failure', async () => {
    const failRedis = createMockRedis({
      get: vi.fn(() => Promise.reject(new Error('Connection refused'))),
    });
    const store = createIdempotencyStore(failRedis);
    const result = await store.get('key');
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe('ConnectionError');
    }
  });
});
