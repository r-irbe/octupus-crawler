// Integration test: Idempotency key store with Testcontainers Redis
// Validates REQ-COMM-021, REQ-COMM-022
// Implements: T-COMM-025
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Redis } from 'ioredis';
import { startRedisContainer, type ManagedRedisContainer } from '@ipf/testing/containers/redis';
import { createIdempotencyStore, type CachedResponse } from './idempotency-store.js';

describe('IdempotencyStore (integration)', () => {
  let container: ManagedRedisContainer;
  let redis: Redis;

  beforeAll(async () => {
    container = await startRedisContainer();
    redis = new Redis({
      host: container.connection.host,
      port: container.connection.port,
      maxRetriesPerRequest: null,
      lazyConnect: false,
    });
  }, 30_000);

  afterAll(async () => {
    await redis.quit();
    await container.stop();
  });

  // Validates REQ-COMM-022
  it('returns cached response for known key', async () => {
    const store = createIdempotencyStore(redis);
    const response: CachedResponse = {
      statusCode: 201,
      body: '{"id":"crawl-123"}',
      contentType: 'application/json',
    };

    // Set the cached response
    const setResult = await store.set('req-abc-123', response);
    expect(setResult.isOk()).toBe(true);

    // Get should return the cached response
    const getResult = await store.get('req-abc-123');
    expect(getResult.isOk()).toBe(true);
    if (getResult.isOk()) {
      expect(getResult.value).toEqual(response);
    }
  });

  // Validates REQ-COMM-021
  it('returns undefined for unknown key', async () => {
    const store = createIdempotencyStore(redis);
    const result = await store.get('nonexistent-key');
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBeUndefined();
    }
  });

  // Validates REQ-COMM-021
  it('deletes cached key', async () => {
    const store = createIdempotencyStore(redis);
    const response: CachedResponse = {
      statusCode: 200,
      body: '',
      contentType: 'text/plain',
    };

    await store.set('to-delete', response);
    await store.delete('to-delete');

    const result = await store.get('to-delete');
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBeUndefined();
    }
  });

  // Validates REQ-COMM-022
  it('key isolation across prefixes', async () => {
    const store1 = createIdempotencyStore(redis, { keyPrefix: 'api-v1' });
    const store2 = createIdempotencyStore(redis, { keyPrefix: 'api-v2' });
    const response: CachedResponse = { statusCode: 200, body: 'v1', contentType: 'text/plain' };

    await store1.set('shared-key', response);

    // store2 with different prefix should not see store1's key
    const result = await store2.get('shared-key');
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBeUndefined();
    }
  });
}, 60_000);
