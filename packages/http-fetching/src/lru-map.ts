// LRU Map — bounded Map with least-recently-used eviction
// Implements: T-FETCH-001, REQ-FETCH-013

export class LruMap<K, V> {
  private readonly map = new Map<K, V>();
  private readonly maxSize: number;

  constructor(maxSize: number) {
    if (maxSize < 1) {
      throw new RangeError('LruMap maxSize must be >= 1');
    }
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.map.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.map.delete(key);
      this.map.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    // If key exists, delete first to update insertion order
    if (this.map.has(key)) {
      this.map.delete(key);
    }

    // Evict LRU entries if at capacity
    while (this.map.size >= this.maxSize) {
      const oldest = this.map.keys().next();
      if (!oldest.done) {
        this.map.delete(oldest.value);
      }
    }

    this.map.set(key, value);
  }

  has(key: K): boolean {
    return this.map.has(key);
  }

  delete(key: K): boolean {
    return this.map.delete(key);
  }

  get size(): number {
    return this.map.size;
  }

  clear(): void {
    this.map.clear();
  }

  /** Iterate entries in insertion order (oldest first) */
  entries(): IterableIterator<[K, V]> {
    return this.map.entries();
  }

  keys(): IterableIterator<K> {
    return this.map.keys();
  }
}
