// Repository interface contract tests
// Validates: REQ-DATA-012 (repository pattern), REQ-DATA-013 (CrawlURLRepository),
//            REQ-DATA-014 (PageContentRepository), REQ-DATA-016 (Result types)

import { describe, it, expect } from 'vitest';
import { ok, err } from 'neverthrow';
import { createNotFound, createS3Error } from './errors.js';
import type { CrawlURLRepository } from './repositories/crawl-url-repository.js';
import type { PageContentRepository } from './repositories/page-content-repository.js';
import type { CrawlURL, NewCrawlURL } from './types.js';

// --- Mock implementations to verify interface contracts ---

function createMockCrawlURLRepo(
  data: Map<string, CrawlURL>,
): CrawlURLRepository {
  return {
    findById: (id) => {
      for (const entry of data.values()) {
        if (entry.id === id) return Promise.resolve(ok(entry));
      }
      return Promise.resolve(ok(undefined));
    },
    findByHash: (hash) =>
      Promise.resolve(ok(data.get(hash))),
    save: (input) => {
      const entity: CrawlURL = {
        id: 1n,
        url: input.url,
        urlHash: input.urlHash,
        domain: input.domain,
        status: 'pending',
        statusCode: null,
        contentType: null,
        s3Key: null,
        depth: input.depth,
        discoveredAt: new Date(),
        fetchedAt: null,
        parentUrlId: input.parentUrlId ?? null,
        metadata: input.metadata ?? {},
      };
      data.set(input.urlHash, entity);
      return Promise.resolve(ok(entity));
    },
    saveBatch: (urls) => {
      for (const u of urls) {
        data.set(u.urlHash, {
          id: BigInt(data.size + 1),
          url: u.url,
          urlHash: u.urlHash,
          domain: u.domain,
          status: 'pending',
          statusCode: null,
          contentType: null,
          s3Key: null,
          depth: u.depth,
          discoveredAt: new Date(),
          fetchedAt: null,
          parentUrlId: u.parentUrlId ?? null,
          metadata: u.metadata ?? {},
        });
      }
      return Promise.resolve(ok(urls.length));
    },
    findPendingByDomain: (domain, limit) => {
      const results: CrawlURL[] = [];
      for (const entry of data.values()) {
        if (entry.domain === domain && entry.status === 'pending' && results.length < limit) {
          results.push(entry);
        }
      }
      return Promise.resolve(ok(results));
    },
    updateStatus: (id, status) => {
      for (const [hash, entry] of data.entries()) {
        if (entry.id === id) {
          // Simulate mutation (in real impl would be SQL UPDATE)
          data.set(hash, { ...entry, status });
          return Promise.resolve(ok(undefined));
        }
      }
      return Promise.resolve(err(createNotFound('CrawlURL', String(id))));
    },
  };
}

function createMockPageContentRepo(): PageContentRepository {
  const storage = new Map<string, Uint8Array>();
  return {
    store: (key, content) => {
      storage.set(`${key.sessionId}/${key.domain}/${key.urlHash}`, content);
      return Promise.resolve(ok(undefined));
    },
    retrieve: (key) => {
      const k = `${key.sessionId}/${key.domain}/${key.urlHash}`;
      const data = storage.get(k);
      if (!data) return Promise.resolve(err(createS3Error('GetObject', new Error('not found'))));
      return Promise.resolve(ok(data));
    },
    delete: (key) => {
      storage.delete(`${key.sessionId}/${key.domain}/${key.urlHash}`);
      return Promise.resolve(ok(undefined));
    },
  };
}

describe('CrawlURLRepository contract', () => {
  const newUrl: NewCrawlURL = {
    url: 'https://example.com',
    urlHash: 'abc123',
    domain: 'example.com',
    depth: 0,
  };

  // Validates REQ-DATA-013: save returns ok with entity
  it('save returns ok with created entity', async () => {
    const repo = createMockCrawlURLRepo(new Map());
    const result = await repo.save(newUrl);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.url).toBe('https://example.com');
      expect(result.value.status).toBe('pending');
    }
  });

  // Validates REQ-DATA-013: findByHash returns entity after save
  it('findByHash returns entity after save', async () => {
    const repo = createMockCrawlURLRepo(new Map());
    await repo.save(newUrl);
    const result = await repo.findByHash('abc123');
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value?.urlHash).toBe('abc123');
    }
  });

  // Validates REQ-DATA-013: findByHash returns undefined for missing
  it('findByHash returns undefined for non-existent hash', async () => {
    const repo = createMockCrawlURLRepo(new Map());
    const result = await repo.findByHash('nonexistent');
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBeUndefined();
    }
  });

  // Validates REQ-DATA-013: saveBatch returns count
  it('saveBatch returns inserted count', async () => {
    const repo = createMockCrawlURLRepo(new Map());
    const urls: NewCrawlURL[] = [
      { url: 'https://a.com', urlHash: 'h1', domain: 'a.com', depth: 0 },
      { url: 'https://b.com', urlHash: 'h2', domain: 'b.com', depth: 0 },
    ];
    const result = await repo.saveBatch(urls);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBe(2);
    }
  });

  // Validates REQ-DATA-013: findPendingByDomain filters correctly
  it('findPendingByDomain returns only matching domain', async () => {
    const repo = createMockCrawlURLRepo(new Map());
    await repo.saveBatch([
      { url: 'https://a.com/1', urlHash: 'a1', domain: 'a.com', depth: 0 },
      { url: 'https://b.com/1', urlHash: 'b1', domain: 'b.com', depth: 0 },
      { url: 'https://a.com/2', urlHash: 'a2', domain: 'a.com', depth: 1 },
    ]);
    const result = await repo.findPendingByDomain('a.com', 10);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.length).toBe(2);
    }
  });

  // Validates REQ-DATA-016: updateStatus returns err(NotFound) for missing ID
  it('updateStatus returns NotFound for non-existent ID', async () => {
    const repo = createMockCrawlURLRepo(new Map());
    const result = await repo.updateStatus(999n, 'fetched');
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe('NotFound');
    }
  });
});

describe('PageContentRepository contract', () => {
  const key = { sessionId: 's1', domain: 'example.com', urlHash: 'hash1' };
  const content = new Uint8Array([72, 84, 77, 76]);
  const metadata = {
    url: 'https://example.com',
    statusCode: 200,
    contentType: 'text/html',
    fetchedAt: '2025-01-15T10:00:00Z',
    fetchDurationMs: 150,
  };

  // Validates REQ-DATA-014: store + retrieve round-trip
  it('store then retrieve returns same content', async () => {
    const repo = createMockPageContentRepo();
    const storeResult = await repo.store(key, content, metadata);
    expect(storeResult.isOk()).toBe(true);

    const retrieveResult = await repo.retrieve(key);
    expect(retrieveResult.isOk()).toBe(true);
    if (retrieveResult.isOk()) {
      expect(retrieveResult.value).toEqual(content);
    }
  });

  // Validates REQ-DATA-014: retrieve missing returns error
  it('retrieve missing content returns S3Error', async () => {
    const repo = createMockPageContentRepo();
    const result = await repo.retrieve(key);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error._tag).toBe('S3Error');
    }
  });

  // Validates REQ-DATA-014: delete removes content
  it('delete removes stored content', async () => {
    const repo = createMockPageContentRepo();
    await repo.store(key, content, metadata);
    await repo.delete(key);
    const result = await repo.retrieve(key);
    expect(result.isErr()).toBe(true);
  });
});
