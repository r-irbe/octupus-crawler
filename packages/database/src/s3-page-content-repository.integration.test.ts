// S3PageContentRepository integration test — real MinIO via Testcontainers
// Validates: T-DATA-030 (REQ-DATA-023, REQ-DATA-006, REQ-DATA-022)

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { S3Client, CreateBucketCommand } from '@aws-sdk/client-s3';
import {
  startMinioContainer,
  type ManagedMinioContainer,
} from '@ipf/testing/containers/minio';
import { createS3PageContentRepository } from './repositories/s3-page-content-repository.js';
import type { FetchMetadata, PageKey } from './types.js';

const TEST_BUCKET = 'test-crawl-data';

const TEST_KEY: PageKey = {
  sessionId: 'session-001',
  domain: 'example.com',
  urlHash: 'abc123def456',
};

const TEST_METADATA: FetchMetadata = {
  url: 'https://example.com/page',
  statusCode: 200,
  contentType: 'text/html',
  fetchedAt: '2026-03-30T00:00:00Z',
  fetchDurationMs: 150,
};

describe('S3PageContentRepository integration', () => {
  let container: ManagedMinioContainer;
  let s3Client: S3Client;

  beforeAll(async () => {
    container = await startMinioContainer();
    s3Client = new S3Client({
      endpoint: container.connection.endpoint,
      region: 'us-east-1',
      forcePathStyle: true,
      credentials: {
        accessKeyId: container.connection.accessKey,
        secretAccessKey: container.connection.secretKey,
      },
    });
    // Create the test bucket
    await s3Client.send(new CreateBucketCommand({ Bucket: TEST_BUCKET }));
  }, 60_000);

  afterAll(async () => {
    s3Client.destroy();
    await container.stop();
  });

  // Validates REQ-DATA-006: store compressed HTML + metadata, retrieve decompressed
  // T-DATA-030: S3PageContentRepository round-trip with MinIO
  it('store and retrieve round-trip', async () => {
    const repo = createS3PageContentRepository(s3Client, TEST_BUCKET);
    const content = new TextEncoder().encode('<html><body>Hello World</body></html>');

    const storeResult = await repo.store(TEST_KEY, content, TEST_METADATA);
    expect(storeResult.isOk()).toBe(true);

    const retrieveResult = await repo.retrieve(TEST_KEY);
    expect(retrieveResult.isOk()).toBe(true);
    const retrieved = retrieveResult._unsafeUnwrap();
    expect(new TextDecoder().decode(retrieved)).toBe('<html><body>Hello World</body></html>');
  });

  // Validates REQ-DATA-006: Zstandard compression
  it('stores content with Zstandard compression', async () => {
    const repo = createS3PageContentRepository(s3Client, TEST_BUCKET);
    const largeContent = new TextEncoder().encode('<html>' + 'x'.repeat(10_000) + '</html>');
    const key: PageKey = { ...TEST_KEY, urlHash: 'large-content-test' };

    await repo.store(key, largeContent, TEST_METADATA);

    const retrieved = (await repo.retrieve(key))._unsafeUnwrap();
    expect(new TextDecoder().decode(retrieved)).toBe('<html>' + 'x'.repeat(10_000) + '</html>');
  });

  // T-DATA-030: delete removes both content and metadata
  it('delete removes stored content', async () => {
    const repo = createS3PageContentRepository(s3Client, TEST_BUCKET);
    const key: PageKey = { ...TEST_KEY, urlHash: 'delete-test' };
    const content = new TextEncoder().encode('<html>delete me</html>');

    await repo.store(key, content, TEST_METADATA);
    const deleteResult = await repo.delete(key);
    expect(deleteResult.isOk()).toBe(true);

    const retrieveResult = await repo.retrieve(key);
    expect(retrieveResult.isErr()).toBe(true);
    expect(retrieveResult._unsafeUnwrapErr()._tag).toBe('S3Error');
  });

  // T-DATA-030: retrieve non-existent key returns S3Error
  it('retrieve non-existent key returns error', async () => {
    const repo = createS3PageContentRepository(s3Client, TEST_BUCKET);
    const key: PageKey = { sessionId: 'none', domain: 'none', urlHash: 'none' };

    const result = await repo.retrieve(key);
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()._tag).toBe('S3Error');
  });
});
