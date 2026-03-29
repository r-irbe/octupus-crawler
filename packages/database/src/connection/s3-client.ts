// S3/MinIO client factory with configurable endpoint
// Implements: T-DATA-014 (REQ-DATA-022) — S3-compatible client for local/cloud parity
// REQ-DATA-021: Same code paths for MinIO (local) and S3 (cloud) via config

import { S3Client } from '@aws-sdk/client-s3';
import { z } from 'zod';

// --- S3 configuration schema ---

export const S3ConfigSchema = z.object({
  endpoint: z.string().min(1),
  region: z.string().min(1).default('us-east-1'),
  bucket: z.string().min(1),
  accessKeyId: z.string().min(1),
  secretAccessKey: z.string().min(1),
  forcePathStyle: z.boolean().default(true),
});

export type S3Config = z.infer<typeof S3ConfigSchema>;

// --- Client factory ---

export function createS3Client(config: S3Config): S3Client {
  return new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    forcePathStyle: config.forcePathStyle,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}
