// S3PageContentRepository — Infrastructure implementation of PageContentRepository port
// Implements: T-DATA-021 (REQ-DATA-006, REQ-DATA-014)
// REQ-DATA-006: Stores raw HTML as Zstandard-compressed files at {session_id}/{domain}/{url_hash}.html.zst
//               Stores fetch metadata at {url_hash}.meta.json
// REQ-DATA-014: store, retrieve, delete operations
// REQ-DATA-016: All operations return Result<T, DataError>
// REQ-DATA-022: Same code paths for MinIO (local) and S3 (cloud)

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  type S3Client,
} from '@aws-sdk/client-s3';
import { zstdCompress, zstdDecompress } from 'node:zlib';
import { promisify } from 'node:util';
import { err, ok, type Result } from 'neverthrow';
import type { DataError } from '../errors.js';
import { createS3Error } from '../errors.js';
import type { FetchMetadata, PageKey } from '../types.js';
import type { PageContentRepository } from './page-content-repository.js';

const compress = promisify(zstdCompress);
const decompress = promisify(zstdDecompress);

// --- Key helpers ---

function contentKey(key: PageKey): string {
  return `${key.sessionId}/${key.domain}/${key.urlHash}.html.zst`;
}

function metadataKey(key: PageKey): string {
  return `${key.sessionId}/${key.domain}/${key.urlHash}.meta.json`;
}

// --- Factory ---

export function createS3PageContentRepository(
  client: S3Client,
  bucket: string,
): PageContentRepository {
  const store = async (
    key: PageKey,
    content: Uint8Array,
    metadata: FetchMetadata,
  ): Promise<Result<void, DataError>> => {
    try {
      const compressed = await compress(Buffer.from(content));
      const metaJson = JSON.stringify(metadata);

      await Promise.all([
        client.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: contentKey(key),
            Body: compressed,
            ContentType: 'application/zstd',
          }),
        ),
        client.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: metadataKey(key),
            Body: metaJson,
            ContentType: 'application/json',
          }),
        ),
      ]);
      return ok(undefined);
    } catch (cause: unknown) {
      return err(createS3Error('store', cause));
    }
  };

  const retrieve = async (key: PageKey): Promise<Result<Uint8Array, DataError>> => {
    try {
      const response = await client.send(
        new GetObjectCommand({
          Bucket: bucket,
          Key: contentKey(key),
        }),
      );
      if (!response.Body) {
        return err(createS3Error('retrieve', new Error('Empty response body')));
      }
      const compressedBytes = await response.Body.transformToByteArray();
      const decompressed = await decompress(Buffer.from(compressedBytes));
      return ok(new Uint8Array(decompressed));
    } catch (cause: unknown) {
      if (isNoSuchKeyError(cause)) {
        return err(createS3Error('retrieve', new Error(`Object not found: ${contentKey(key)}`)));
      }
      return err(createS3Error('retrieve', cause));
    }
  };

  const deleteContent = async (key: PageKey): Promise<Result<void, DataError>> => {
    try {
      await Promise.all([
        client.send(
          new DeleteObjectCommand({
            Bucket: bucket,
            Key: contentKey(key),
          }),
        ),
        client.send(
          new DeleteObjectCommand({
            Bucket: bucket,
            Key: metadataKey(key),
          }),
        ),
      ]);
      return ok(undefined);
    } catch (cause: unknown) {
      return err(createS3Error('delete', cause));
    }
  };

  return { store, retrieve, delete: deleteContent };
}

// --- Helpers ---

function isNoSuchKeyError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.name === 'NoSuchKey';
  }
  return false;
}
