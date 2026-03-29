// DrizzleCrawlURLRepository — Unit tests (structural, no real DB)
// Validates: T-DATA-018 (REQ-DATA-013, REQ-DATA-016), T-DATA-019 (REQ-DATA-025)
// Integration tests with Testcontainers: T-DATA-027, T-DATA-028, T-DATA-029

import { describe, it, expect } from 'vitest';
import { createDrizzleCrawlURLRepository } from './repositories/drizzle-crawl-url-repository.js';
import type { DrizzleDB } from './connection/drizzle.js';

// --- Minimal DB mock for structural tests ---

function createMockDB(): DrizzleDB {
  // We return a partial mock — only methods used by the repository
  // Real integration tests use Testcontainers (T-DATA-027+)
  return {} as DrizzleDB;
}

describe('DrizzleCrawlURLRepository', () => {
  // Validates REQ-DATA-013: factory produces all required methods
  it('factory returns all CrawlURLRepository methods', () => {
    const db = createMockDB();
    const repo = createDrizzleCrawlURLRepository(db);

    expect(repo.findById).toBeTypeOf('function');
    expect(repo.findByHash).toBeTypeOf('function');
    expect(repo.save).toBeTypeOf('function');
    expect(repo.saveBatch).toBeTypeOf('function');
    expect(repo.findPendingByDomain).toBeTypeOf('function');
    expect(repo.updateStatus).toBeTypeOf('function');
  });

  // Validates REQ-DATA-025: saveBatch handles empty array
  it('saveBatch returns ok(0) for empty input', async () => {
    const db = createMockDB();
    const repo = createDrizzleCrawlURLRepository(db);

    const result = await repo.saveBatch([]);
    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toBe(0);
  });

  // Validates REQ-DATA-016: errors are wrapped in Result, not thrown
  it('findById wraps DB errors in Result.err', async () => {
    const db = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: () => {
              throw new Error('connection refused');
            },
          }),
        }),
      }),
    } as unknown as DrizzleDB;

    const repo = createDrizzleCrawlURLRepository(db);
    const result = await repo.findById(1n);

    expect(result.isErr()).toBe(true);
    const error = result._unsafeUnwrapErr();
    expect(error._tag).toBe('QueryFailed');
  });

  // Validates REQ-DATA-016: findByHash wraps errors
  it('findByHash wraps DB errors in Result.err', async () => {
    const db = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: () => {
              throw new Error('timeout');
            },
          }),
        }),
      }),
    } as unknown as DrizzleDB;

    const repo = createDrizzleCrawlURLRepository(db);
    const result = await repo.findByHash('abc123');

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()._tag).toBe('QueryFailed');
  });

  // Validates REQ-DATA-024: duplicate key detection
  it('save returns DuplicateKey error on unique constraint violation', async () => {
    const pgError = new Error('duplicate key value violates unique constraint');
    Object.assign(pgError, { code: '23505' });

    const db = {
      insert: () => ({
        values: () => ({
          returning: () => {
            throw pgError;
          },
        }),
      }),
    } as unknown as DrizzleDB;

    const repo = createDrizzleCrawlURLRepository(db);
    const result = await repo.save({
      url: 'https://example.com',
      urlHash: 'hash123',
      domain: 'example.com',
      depth: 0,
    });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()._tag).toBe('DuplicateKey');
  });

  // Validates REQ-DATA-016: saveBatch wraps errors
  it('saveBatch wraps DB errors in Result.err', async () => {
    const db = {
      insert: () => ({
        values: () => ({
          onConflictDoNothing: () => ({
            returning: () => {
              throw new Error('disk full');
            },
          }),
        }),
      }),
    } as unknown as DrizzleDB;

    const repo = createDrizzleCrawlURLRepository(db);
    const result = await repo.saveBatch([
      { url: 'https://example.com', urlHash: 'h1', domain: 'example.com', depth: 0 },
    ]);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()._tag).toBe('QueryFailed');
  });

  // Validates REQ-DATA-016: findPendingByDomain wraps errors
  it('findPendingByDomain wraps DB errors in Result.err', async () => {
    const db = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: () => {
              throw new Error('pool exhausted');
            },
          }),
        }),
      }),
    } as unknown as DrizzleDB;

    const repo = createDrizzleCrawlURLRepository(db);
    const result = await repo.findPendingByDomain('example.com', 10);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()._tag).toBe('QueryFailed');
  });

  // Validates REQ-DATA-016: updateStatus wraps errors
  it('updateStatus wraps DB errors in Result.err', async () => {
    const db = {
      update: () => ({
        set: () => ({
          where: () => {
            throw new Error('connection lost');
          },
        }),
      }),
    } as unknown as DrizzleDB;

    const repo = createDrizzleCrawlURLRepository(db);
    const result = await repo.updateStatus(1n, 'fetched', {
      statusCode: 200,
      contentType: 'text/html',
      s3Key: 'key',
    });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()._tag).toBe('QueryFailed');
  });
});
