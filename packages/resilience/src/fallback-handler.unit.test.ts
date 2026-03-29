// Fallback handler — unit tests
// Validates REQ-RES-014

import { describe, it, expect, vi } from 'vitest';
import { createFallbackHandler } from './fallback-handler.js';

describe('createFallbackHandler', () => {
  it('returns primary result on success', async () => {
    const handler = createFallbackHandler<string>();
    const result = await handler.execute('a.com', () => Promise.resolve('fresh'));
    expect(result).toBe('fresh');
  });

  it('caches successful results', async () => {
    const handler = createFallbackHandler<string>();
    await handler.execute('a.com', () => Promise.resolve('data'));
    expect(handler.cache.has('a.com')).toBe(true);
    expect(handler.cache.get('a.com')).toBe('data');
  });

  it('serves cached data on failure', async () => {
    const handler = createFallbackHandler<string>();
    // Prime cache
    await handler.execute('a.com', () => Promise.resolve('cached-data'));
    // Now fail
    const result = await handler.execute('a.com', () =>
      Promise.reject(new Error('service down')),
    );
    expect(result).toBe('cached-data');
  });

  it('throws when no cache and primary fails', async () => {
    const handler = createFallbackHandler<string>();
    await expect(
      handler.execute('a.com', () =>
        Promise.reject(new Error('no cache')),
      ),
    ).rejects.toThrow('no cache');
  });

  it('calls onDegradedMode when serving cached data', async () => {
    const onDegraded = vi.fn();
    const handler = createFallbackHandler<string>(onDegraded);
    await handler.execute('a.com', () => Promise.resolve('data'));
    await handler.execute('a.com', () =>
      Promise.reject(new Error('fail')),
    );
    expect(onDegraded).toHaveBeenCalledOnce();
    expect(onDegraded).toHaveBeenCalledWith('a.com', expect.any(Error));
  });

  it('updates cache on subsequent successes', async () => {
    const handler = createFallbackHandler<string>();
    await handler.execute('a.com', () => Promise.resolve('v1'));
    await handler.execute('a.com', () => Promise.resolve('v2'));
    expect(handler.cache.get('a.com')).toBe('v2');
  });

  it('isolates domains in cache', async () => {
    const handler = createFallbackHandler<string>();
    await handler.execute('a.com', () => Promise.resolve('a-data'));
    await handler.execute('b.com', () => Promise.resolve('b-data'));
    expect(handler.cache.get('a.com')).toBe('a-data');
    expect(handler.cache.get('b.com')).toBe('b-data');
  });

  it('clear empties the cache', async () => {
    const handler = createFallbackHandler<string>();
    await handler.execute('a.com', () => Promise.resolve('data'));
    handler.cache.clear();
    expect(handler.cache.size()).toBe(0);
  });
});
