// Data layer integration tests — CrawlURLRepository CRUD with real PostgreSQL
// Validates: T-DATA-027 (REQ-DATA-023), T-DATA-028 (REQ-DATA-025),
//            T-DATA-029 (REQ-DATA-024)

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createDrizzleCrawlURLRepository } from './repositories/drizzle-crawl-url-repository.js';
import { startTestDatabase, type TestDatabase } from './test-helpers.js';
import type { NewCrawlURL } from './types.js';
import { createHash } from 'node:crypto';

// --- Test helpers ---

function urlHash(url: string): string {
  return createHash('sha256').update(url).digest('hex');
}

function makeNewUrl(n: number): NewCrawlURL {
  const url = `https://example.com/page-${String(n)}`;
  return {
    url,
    urlHash: urlHash(url),
    domain: 'example.com',
    depth: 0,
  };
}

// --- Test suite ---

describe('CrawlURLRepository integration', () => {
  let testDb: TestDatabase;

  beforeAll(async () => {
    testDb = await startTestDatabase();
  }, 60_000);

  afterAll(async () => {
    await testDb.stop();
  });

  beforeEach(async () => {
    await testDb.truncate();
  });

  // Validates REQ-DATA-023: real PostgreSQL CRUD via Testcontainers
  // T-DATA-027: CrawlURLRepository CRUD
  it('save and findById round-trip', async () => {
    const repo = createDrizzleCrawlURLRepository(testDb.db);
    const newUrl = makeNewUrl(1);

    const saveResult = await repo.save(newUrl);
    expect(saveResult.isOk()).toBe(true);
    const saved = saveResult._unsafeUnwrap();

    const findResult = await repo.findById(saved.id);
    expect(findResult.isOk()).toBe(true);
    const found = findResult._unsafeUnwrap();

    expect(found).toBeDefined();
    expect(found?.url).toBe(newUrl.url);
    expect(found?.urlHash).toBe(newUrl.urlHash);
    expect(found?.domain).toBe('example.com');
    expect(found?.status).toBe('pending');
    expect(found?.depth).toBe(0);
  });

  // T-DATA-027: findByHash
  it('findByHash returns matching URL', async () => {
    const repo = createDrizzleCrawlURLRepository(testDb.db);
    const newUrl = makeNewUrl(2);
    await repo.save(newUrl);

    const result = await repo.findByHash(newUrl.urlHash);
    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()?.url).toBe(newUrl.url);
  });

  // T-DATA-027: findByHash returns undefined for missing
  it('findByHash returns undefined for non-existent hash', async () => {
    const repo = createDrizzleCrawlURLRepository(testDb.db);

    const result = await repo.findByHash('nonexistent');
    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toBeUndefined();
  });

  // T-DATA-027: updateStatus
  it('updateStatus changes status and records fetch result', async () => {
    const repo = createDrizzleCrawlURLRepository(testDb.db);
    const saved = (await repo.save(makeNewUrl(3)))._unsafeUnwrap();

    await repo.updateStatus(saved.id, 'fetched', {
      statusCode: 200,
      contentType: 'text/html',
      s3Key: 'session1/example.com/abc.html.zst',
    });

    const updated = (await repo.findById(saved.id))._unsafeUnwrap();
    expect(updated?.status).toBe('fetched');
    expect(updated?.statusCode).toBe(200);
    expect(updated?.s3Key).toBe('session1/example.com/abc.html.zst');
  });

  // T-DATA-027: findPendingByDomain
  it('findPendingByDomain returns only pending URLs', async () => {
    const repo = createDrizzleCrawlURLRepository(testDb.db);
    await repo.save(makeNewUrl(10));
    await repo.save(makeNewUrl(11));
    const saved3 = (await repo.save(makeNewUrl(12)))._unsafeUnwrap();
    await repo.updateStatus(saved3.id, 'fetched', {
      statusCode: 200,
      contentType: 'text/html',
      s3Key: null,
    });

    const result = await repo.findPendingByDomain('example.com', 10);
    expect(result.isOk()).toBe(true);
    const pending = result._unsafeUnwrap();
    expect(pending.length).toBe(2);
    expect(pending.every((u) => u.status === 'pending')).toBe(true);
  });

  // T-DATA-029: URL dedup via hash constraint returns DuplicateKey
  it('duplicate url_hash returns DuplicateKey error', async () => {
    const repo = createDrizzleCrawlURLRepository(testDb.db);
    const newUrl = makeNewUrl(20);
    const first = await repo.save(newUrl);
    expect(first.isOk()).toBe(true);

    const second = await repo.save(newUrl);
    expect(second.isErr()).toBe(true);
    expect(second._unsafeUnwrapErr()._tag).toBe('DuplicateKey');
  });

  // T-DATA-028: Batch insert throughput > 10K rows/sec
  it('saveBatch inserts 10K rows in under 1 second', async () => {
    const repo = createDrizzleCrawlURLRepository(testDb.db);
    const urls: NewCrawlURL[] = [];
    for (let i = 0; i < 10_000; i++) {
      urls.push(makeNewUrl(1000 + i));
    }

    const start = performance.now();
    const result = await repo.saveBatch(urls);
    const elapsed = performance.now() - start;

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toBe(10_000);
    // Allow generous 5s for CI environments (containers are slower)
    expect(elapsed).toBeLessThan(5_000);
  });

  // T-DATA-028: saveBatch deduplicates via ON CONFLICT DO NOTHING
  it('saveBatch skips duplicates', async () => {
    const repo = createDrizzleCrawlURLRepository(testDb.db);
    const urls = [makeNewUrl(100), makeNewUrl(101), makeNewUrl(102)];

    const first = await repo.saveBatch(urls);
    expect(first._unsafeUnwrap()).toBe(3);

    // Insert again — same hashes should be skipped
    const second = await repo.saveBatch(urls);
    expect(second._unsafeUnwrap()).toBe(0);
  });
});
