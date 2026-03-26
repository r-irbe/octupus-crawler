// Validates T-FETCH-018 (partial): LRU Map eviction + bounded size
// REQ-FETCH-013: Hard cap with LRU eviction

import { describe, it, expect } from 'vitest';
import { LruMap } from './lru-map.js';

describe('LruMap', () => {
  it('stores and retrieves values', () => {
    const map = new LruMap<string, number>(10);
    map.set('a', 1);
    expect(map.get('a')).toBe(1);
  });

  it('returns undefined for missing keys', () => {
    const map = new LruMap<string, number>(10);
    expect(map.get('missing')).toBeUndefined();
  });

  it('evicts oldest entry when at capacity', () => {
    const map = new LruMap<string, number>(3);
    map.set('a', 1);
    map.set('b', 2);
    map.set('c', 3);
    map.set('d', 4); // evicts 'a'

    expect(map.get('a')).toBeUndefined();
    expect(map.get('b')).toBe(2);
    expect(map.get('d')).toBe(4);
    expect(map.size).toBe(3);
  });

  it('refreshes access order on get()', () => {
    const map = new LruMap<string, number>(3);
    map.set('a', 1);
    map.set('b', 2);
    map.set('c', 3);

    map.get('a'); // 'a' is now most recently used
    map.set('d', 4); // evicts 'b' (oldest after refresh)

    expect(map.get('a')).toBe(1);
    expect(map.get('b')).toBeUndefined();
  });

  it('refreshes access order on set() for existing key', () => {
    const map = new LruMap<string, number>(3);
    map.set('a', 1);
    map.set('b', 2);
    map.set('c', 3);

    map.set('a', 10); // refresh 'a'
    map.set('d', 4); // evicts 'b'

    expect(map.get('a')).toBe(10);
    expect(map.get('b')).toBeUndefined();
  });

  it('respects maxSize of 1', () => {
    const map = new LruMap<string, number>(1);
    map.set('a', 1);
    map.set('b', 2);

    expect(map.size).toBe(1);
    expect(map.get('a')).toBeUndefined();
    expect(map.get('b')).toBe(2);
  });

  it('throws on maxSize < 1', () => {
    expect(() => new LruMap<string, number>(0)).toThrow(RangeError);
    expect(() => new LruMap<string, number>(-1)).toThrow(RangeError);
  });

  it('reports correct size', () => {
    const map = new LruMap<string, number>(5);
    expect(map.size).toBe(0);
    map.set('a', 1);
    map.set('b', 2);
    expect(map.size).toBe(2);
    map.delete('a');
    expect(map.size).toBe(1);
  });

  it('clears all entries', () => {
    const map = new LruMap<string, number>(5);
    map.set('a', 1);
    map.set('b', 2);
    map.clear();
    expect(map.size).toBe(0);
    expect(map.get('a')).toBeUndefined();
  });

  it('iterates entries in insertion order', () => {
    const map = new LruMap<string, number>(5);
    map.set('a', 1);
    map.set('b', 2);
    map.set('c', 3);

    const entries = [...map.entries()];
    expect(entries).toEqual([['a', 1], ['b', 2], ['c', 3]]);
  });

  it('has() does not affect LRU order', () => {
    const map = new LruMap<string, number>(3);
    map.set('a', 1);
    map.set('b', 2);
    map.set('c', 3);

    map.has('a'); // should NOT refresh
    map.set('d', 4); // evicts 'a' since has() didn't refresh

    expect(map.get('a')).toBeUndefined();
    expect(map.has('d')).toBe(true);
  });
});
