// Validates REQ-ARCH-015: Narrow config slice types for each consumer
// Validates REQ-LIFE-CFG-001 to 003: Lifecycle config slices
import { describe, it, expect } from 'vitest';
import type {
  RedisConfig, DatabaseConfig, S3Config, CrawlerConfig,
  SeedConfig, FetchConfig, WorkerConfig, DomainFilterConfig, HealthConfig,
} from './config-slices.js';
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
    SEED_URLS: 'https://example.com,https://example.org',
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

// Validates REQ-LIFE-CFG-001 to 003: Lifecycle config slices
describe('lifecycle config slices', () => {
  it('Config is structurally compatible with SeedConfig slice', () => {
    const result = loadConfig(validEnv());
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      const seed: SeedConfig = result.value;
      expect(seed.SEED_URLS).toBe('https://example.com,https://example.org');
    }
  });

  it('Config is structurally compatible with FetchConfig slice', () => {
    const result = loadConfig(validEnv());
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      const fetch: FetchConfig = result.value;
      expect(fetch.CRAWL_FETCH_TIMEOUT_MS).toBe(30_000);
      expect(fetch.CRAWL_MAX_REDIRECTS).toBe(5);
      expect(fetch.CRAWL_MAX_RESPONSE_BYTES).toBe(10_485_760);
      expect(fetch.CRAWL_MAX_RETRIES).toBe(3);
      expect(fetch.CRAWL_USER_AGENT).toContain('IPF');
      expect(fetch.ALLOW_PRIVATE_IPS).toBe(false);
    }
  });

  it('Config is structurally compatible with WorkerConfig slice', () => {
    const env = { ...validEnv(), WORKER_ID: 'worker-42' };
    const result = loadConfig(env);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      const worker: WorkerConfig = result.value;
      expect(worker.WORKER_ID).toBe('worker-42');
      expect(worker.SERVICE_NAME).toBe('test-service');
      expect(worker.CRAWL_MAX_CONCURRENT_FETCHES).toBe(10);
      expect(worker.CRAWL_POLITENESS_DELAY_MS).toBe(2000);
    }
  });

  it('Config is structurally compatible with DomainFilterConfig slice', () => {
    const env = { ...validEnv(), ALLOWED_DOMAINS: 'example.com,test.org' };
    const result = loadConfig(env);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      const domains: DomainFilterConfig = result.value;
      expect(domains.ALLOWED_DOMAINS).toBe('example.com,test.org');
    }
  });

  it('Config is structurally compatible with HealthConfig slice', () => {
    const result = loadConfig(validEnv());
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      const health: HealthConfig = result.value;
      expect(health.HEALTH_PORT).toBe(8081);
      expect(health.METRICS_PORT).toBe(9090);
    }
  });
});
