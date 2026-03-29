// S3PageContentRepository — Unit tests (structural, no real S3)
// Validates: T-DATA-021 (REQ-DATA-006, REQ-DATA-014, REQ-DATA-016)
// Integration tests with Testcontainers MinIO: T-DATA-030

import { describe, it, expect } from 'vitest';
import { createS3PageContentRepository } from './repositories/s3-page-content-repository.js';
import type { S3Client } from '@aws-sdk/client-s3';
import type { FetchMetadata, PageKey } from './types.js';

const TEST_KEY: PageKey = {
  sessionId: 'session-1',
  domain: 'example.com',
  urlHash: 'abc123def456',
};

const TEST_METADATA: FetchMetadata = {
  url: 'https://example.com/page',
  statusCode: 200,
  contentType: 'text/html',
  fetchedAt: '2026-03-29T00:00:00Z',
  fetchDurationMs: 150,
};

const TEST_CONTENT = new TextEncoder().encode('<html><body>Hello</body></html>');

function createMockS3Client(sendFn: (...args: unknown[]) => unknown): S3Client {
  return { send: sendFn } as unknown as S3Client;
}

describe('S3PageContentRepository', () => {
  // Validates REQ-DATA-014: factory produces all required methods
  it('factory returns all PageContentRepository methods', () => {
    const client = createMockS3Client(() => ({}));
    const repo = createS3PageContentRepository(client, 'test-bucket');

    expect(repo.store).toBeTypeOf('function');
    expect(repo.retrieve).toBeTypeOf('function');
    expect(repo.delete).toBeTypeOf('function');
  });

  // Validates REQ-DATA-006: store calls S3 with correct keys
  it('store sends two PutObject commands (content + metadata)', async () => {
    const calls: unknown[] = [];
    const client = createMockS3Client((cmd: unknown) => {
      calls.push(cmd);
      return Promise.resolve({});
    });

    const repo = createS3PageContentRepository(client, 'test-bucket');
    const result = await repo.store(TEST_KEY, TEST_CONTENT, TEST_METADATA);

    expect(result.isOk()).toBe(true);
    // Two commands: content (.html.zst) and metadata (.meta.json)
    expect(calls).toHaveLength(2);
  });

  // Validates REQ-DATA-016: store wraps S3 errors in Result.err
  it('store wraps S3 errors in Result.err', async () => {
    const client = createMockS3Client(() => {
      throw new Error('access denied');
    });

    const repo = createS3PageContentRepository(client, 'test-bucket');
    const result = await repo.store(TEST_KEY, TEST_CONTENT, TEST_METADATA);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()._tag).toBe('S3Error');
    expect(result._unsafeUnwrapErr().message).toContain('store');
  });

  // Validates REQ-DATA-016: retrieve wraps errors
  it('retrieve returns S3Error for NoSuchKey', async () => {
    const noSuchKeyError = new Error('NoSuchKey');
    noSuchKeyError.name = 'NoSuchKey';

    const client = createMockS3Client(() => {
      throw noSuchKeyError;
    });

    const repo = createS3PageContentRepository(client, 'test-bucket');
    const result = await repo.retrieve(TEST_KEY);

    expect(result.isErr()).toBe(true);
    const error = result._unsafeUnwrapErr();
    expect(error._tag).toBe('S3Error');
    expect(error.message).toContain('retrieve');
  });

  // Validates REQ-DATA-016: retrieve wraps generic S3 errors
  it('retrieve wraps generic S3 errors in Result.err', async () => {
    const client = createMockS3Client(() => {
      throw new Error('network timeout');
    });

    const repo = createS3PageContentRepository(client, 'test-bucket');
    const result = await repo.retrieve(TEST_KEY);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()._tag).toBe('S3Error');
  });

  // Validates REQ-DATA-016: retrieve returns error for empty body
  it('retrieve returns error when response body is empty', async () => {
    const client = createMockS3Client(() => Promise.resolve({ Body: undefined }));

    const repo = createS3PageContentRepository(client, 'test-bucket');
    const result = await repo.retrieve(TEST_KEY);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()._tag).toBe('S3Error');
    expect(result._unsafeUnwrapErr().message).toContain('retrieve');
  });

  // Validates REQ-DATA-014: delete calls S3 with correct keys
  it('delete sends two DeleteObject commands', async () => {
    const calls: unknown[] = [];
    const client = createMockS3Client((cmd: unknown) => {
      calls.push(cmd);
      return Promise.resolve({});
    });

    const repo = createS3PageContentRepository(client, 'test-bucket');
    const result = await repo.delete(TEST_KEY);

    expect(result.isOk()).toBe(true);
    expect(calls).toHaveLength(2);
  });

  // Validates REQ-DATA-016: delete wraps errors
  it('delete wraps S3 errors in Result.err', async () => {
    const client = createMockS3Client(() => {
      throw new Error('forbidden');
    });

    const repo = createS3PageContentRepository(client, 'test-bucket');
    const result = await repo.delete(TEST_KEY);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()._tag).toBe('S3Error');
  });
});
