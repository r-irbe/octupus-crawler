// Unit tests for connection pool configuration and S3 client factory
// Validates: T-DATA-012 (REQ-DATA-015), T-DATA-013 (REQ-DATA-018), T-DATA-014 (REQ-DATA-022)

import { describe, expect, it } from 'vitest';
import { PoolConfigSchema } from './connection/pool.js';
import { S3ConfigSchema } from './connection/s3-client.js';

describe('PoolConfigSchema', () => {
  // Validates REQ-DATA-015: configurable connection pooling
  it('parses valid config with all fields', () => {
    const result = PoolConfigSchema.safeParse({
      connectionString: 'postgresql://user:pass@localhost:5432/db',
      min: 5,
      max: 50,
      idleTimeoutMillis: 60_000,
      connectionTimeoutMillis: 10_000,
      statementTimeout: 30_000,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.min).toBe(5);
      expect(result.data.max).toBe(50);
    }
  });

  it('applies defaults for optional fields', () => {
    const result = PoolConfigSchema.safeParse({
      connectionString: 'postgresql://localhost/test',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.min).toBe(2);
      expect(result.data.max).toBe(20);
      expect(result.data.idleTimeoutMillis).toBe(30_000);
      expect(result.data.connectionTimeoutMillis).toBe(5_000);
      expect(result.data.statementTimeout).toBe(10_000);
    }
  });

  it('rejects empty connection string', () => {
    const result = PoolConfigSchema.safeParse({
      connectionString: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative min', () => {
    const result = PoolConfigSchema.safeParse({
      connectionString: 'postgresql://localhost/test',
      min: -1,
    });
    expect(result.success).toBe(false);
  });

  it('rejects zero max', () => {
    const result = PoolConfigSchema.safeParse({
      connectionString: 'postgresql://localhost/test',
      max: 0,
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer values', () => {
    const result = PoolConfigSchema.safeParse({
      connectionString: 'postgresql://localhost/test',
      min: 1.5,
    });
    expect(result.success).toBe(false);
  });
});

describe('S3ConfigSchema', () => {
  // Validates REQ-DATA-022: S3 API compatibility config
  it('parses valid MinIO config', () => {
    const result = S3ConfigSchema.safeParse({
      endpoint: 'http://localhost:9000',
      bucket: 'ipf-crawl-pages',
      accessKeyId: 'minioadmin',
      secretAccessKey: 'minioadmin',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.region).toBe('us-east-1');
      expect(result.data.forcePathStyle).toBe(true);
    }
  });

  it('parses valid AWS S3 config', () => {
    const result = S3ConfigSchema.safeParse({
      endpoint: 'https://s3.amazonaws.com',
      region: 'eu-west-1',
      bucket: 'my-crawl-data',
      accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
      secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      forcePathStyle: false,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.region).toBe('eu-west-1');
      expect(result.data.forcePathStyle).toBe(false);
    }
  });

  it('rejects missing endpoint', () => {
    const result = S3ConfigSchema.safeParse({
      bucket: 'test',
      accessKeyId: 'key',
      secretAccessKey: 'secret',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty bucket name', () => {
    const result = S3ConfigSchema.safeParse({
      endpoint: 'http://localhost:9000',
      bucket: '',
      accessKeyId: 'key',
      secretAccessKey: 'secret',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing credentials', () => {
    const result = S3ConfigSchema.safeParse({
      endpoint: 'http://localhost:9000',
      bucket: 'test',
    });
    expect(result.success).toBe(false);
  });
});
