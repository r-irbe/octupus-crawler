// Validates REQ-ARCH-015: Narrow config slice types for each consumer
import { describe, it, expect } from 'vitest';
import type { RedisConfig, DatabaseConfig, S3Config, CrawlerConfig } from './config-slices.js';
import { loadConfig } from './load-config.js';

// Minimal valid environment for testing
function validEnv(): Record<string, string> {
  return {
    SERVICE_NAME: 'test-service',
    REDIS_URL: 'redis://localhost:6379',
    DATABASE_URL: 'postgres://user:pass@localhost:5432/db',
    S3_ENDPOINT: 'http://localhost:9000',
    S3_ACCESS_KEY: 'minioadmin',
    S3_SECRET_KEY: 'minioadmin',
  };
}

describe('config slices', () => {
  // Validates REQ-ARCH-015: narrow types containing only required fields
  it('Config is structurally compatible with RedisConfig slice', () => {
    const result = loadConfig(validEnv());
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      const redis: RedisConfig = result.value;
      expect(redis.REDIS_URL).toBe('redis://localhost:6379');
      expect(redis.REDIS_MAX_RETRIES).toBe(3);
    }
  });

  it('Config is structurally compatible with DatabaseConfig slice', () => {
    const result = loadConfig(validEnv());
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      const db: DatabaseConfig = result.value;
      expect(db.DATABASE_URL).toContain('postgres://');
      expect(db.DATABASE_POOL_SIZE).toBe(20);
    }
  });

  it('Config is structurally compatible with S3Config slice', () => {
    const result = loadConfig(validEnv());
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      const s3: S3Config = result.value;
      expect(s3.S3_ENDPOINT).toContain('http');
      expect(s3.S3_ACCESS_KEY).toBe('minioadmin');
    }
  });

  it('Config is structurally compatible with CrawlerConfig slice', () => {
    const result = loadConfig(validEnv());
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      const crawler: CrawlerConfig = result.value;
      expect(crawler.CRAWL_MAX_DEPTH).toBe(3);
      expect(crawler.CRAWL_USER_AGENT).toContain('IPF');
    }
  });
});
