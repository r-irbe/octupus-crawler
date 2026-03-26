// Validates REQ-ARCH-014: Configuration validated at startup via schema validator
// Validates REQ-LIFE-CFG-001 to 003: Lifecycle config env vars
import { describe, it, expect } from 'vitest';
import { ConfigSchema } from './config-schema.js';

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

describe('ConfigSchema', () => {
  // Validates REQ-ARCH-014: schema validation at startup
  it('accepts a valid environment', () => {
    const result = ConfigSchema.safeParse(validEnv());
    expect(result.success).toBe(true);
  });

  it('applies defaults for optional fields', () => {
    const result = ConfigSchema.safeParse(validEnv());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.NODE_ENV).toBe('development');
      expect(result.data.LOG_LEVEL).toBe('info');
      expect(result.data.REDIS_MAX_RETRIES).toBe(3);
      expect(result.data.DATABASE_POOL_SIZE).toBe(20);
      expect(result.data.CRAWL_MAX_DEPTH).toBe(3);
      expect(result.data.HEALTH_PORT).toBe(8081);
    }
  });

  it('coerces number strings to numbers', () => {
    const env = { ...validEnv(), REDIS_MAX_RETRIES: '5', DATABASE_POOL_SIZE: '50' };
    const result = ConfigSchema.safeParse(env);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.REDIS_MAX_RETRIES).toBe(5);
      expect(result.data.DATABASE_POOL_SIZE).toBe(50);
    }
  });

  it('rejects missing required fields', () => {
    const result = ConfigSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects invalid NODE_ENV', () => {
    const env = { ...validEnv(), NODE_ENV: 'invalid' };
    const result = ConfigSchema.safeParse(env);
    expect(result.success).toBe(false);
  });

  it('rejects non-URL REDIS_URL', () => {
    const env = { ...validEnv(), REDIS_URL: 'not-a-url' };
    const result = ConfigSchema.safeParse(env);
    expect(result.success).toBe(false);
  });

  it('accepts rediss:// for TLS Redis', () => {
    const env = { ...validEnv(), REDIS_URL: 'rediss://localhost:6380' };
    const result = ConfigSchema.safeParse(env);
    expect(result.success).toBe(true);
  });

  it('accepts postgresql:// as DATABASE_URL', () => {
    const env = { ...validEnv(), DATABASE_URL: 'postgresql://user:pass@localhost:5432/db' };
    const result = ConfigSchema.safeParse(env);
    expect(result.success).toBe(true);
  });

  it('rejects DATABASE_POOL_SIZE out of range', () => {
    const env = { ...validEnv(), DATABASE_POOL_SIZE: '200' };
    const result = ConfigSchema.safeParse(env);
    expect(result.success).toBe(false);
  });
});

// Validates REQ-LIFE-CFG-002: Required lifecycle env vars
describe('ConfigSchema — lifecycle fields', () => {
  it('rejects missing SEED_URLS', () => {
    const { SEED_URLS: _, ...env } = validEnv();
    const result = ConfigSchema.safeParse(env);
    expect(result.success).toBe(false);
  });

  it('rejects empty SEED_URLS', () => {
    const env = { ...validEnv(), SEED_URLS: '' };
    const result = ConfigSchema.safeParse(env);
    expect(result.success).toBe(false);
  });

  it('accepts single seed URL string', () => {
    const env = { ...validEnv(), SEED_URLS: 'https://example.com' };
    const result = ConfigSchema.safeParse(env);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.SEED_URLS).toBe('https://example.com');
    }
  });

  // Validates REQ-LIFE-CFG-003: Optional fields with defaults
  it('applies lifecycle defaults', () => {
    const result = ConfigSchema.safeParse(validEnv());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.CRAWL_MAX_CONCURRENT_FETCHES).toBe(10);
      expect(result.data.CRAWL_FETCH_TIMEOUT_MS).toBe(30_000);
      expect(result.data.CRAWL_POLITENESS_DELAY_MS).toBe(2000);
      expect(result.data.CRAWL_MAX_RETRIES).toBe(3);
      expect(result.data.CRAWL_MAX_REDIRECTS).toBe(5);
      expect(result.data.CRAWL_MAX_RESPONSE_BYTES).toBe(10_485_760);
      expect(result.data.CRAWL_USER_AGENT).toBe('IPF-Crawler/1.0');
      expect(result.data.ALLOW_PRIVATE_IPS).toBe(false);
      expect(result.data.METRICS_PORT).toBe(9090);
    }
  });

  it('parses ALLOW_PRIVATE_IPS as boolean', () => {
    const env = { ...validEnv(), ALLOW_PRIVATE_IPS: 'true' };
    const result = ConfigSchema.safeParse(env);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.ALLOW_PRIVATE_IPS).toBe(true);
    }
  });

  it('rejects invalid ALLOW_PRIVATE_IPS value', () => {
    const env = { ...validEnv(), ALLOW_PRIVATE_IPS: 'yes' };
    const result = ConfigSchema.safeParse(env);
    expect(result.success).toBe(false);
  });

  it('accepts WORKER_ID when provided', () => {
    const env = { ...validEnv(), WORKER_ID: 'worker-1' };
    const result = ConfigSchema.safeParse(env);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.WORKER_ID).toBe('worker-1');
    }
  });

  it('leaves WORKER_ID undefined when not set', () => {
    const result = ConfigSchema.safeParse(validEnv());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.WORKER_ID).toBeUndefined();
    }
  });

  it('accepts ALLOWED_DOMAINS when provided', () => {
    const env = { ...validEnv(), ALLOWED_DOMAINS: 'example.com,example.org' };
    const result = ConfigSchema.safeParse(env);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.ALLOWED_DOMAINS).toBe('example.com,example.org');
    }
  });

  it('leaves ALLOWED_DOMAINS undefined when not set', () => {
    const result = ConfigSchema.safeParse(validEnv());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.ALLOWED_DOMAINS).toBeUndefined();
    }
  });

  it('coerces CRAWL_FETCH_TIMEOUT_MS from string', () => {
    const env = { ...validEnv(), CRAWL_FETCH_TIMEOUT_MS: '60000' };
    const result = ConfigSchema.safeParse(env);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.CRAWL_FETCH_TIMEOUT_MS).toBe(60_000);
    }
  });

  it('rejects CRAWL_FETCH_TIMEOUT_MS below minimum', () => {
    const env = { ...validEnv(), CRAWL_FETCH_TIMEOUT_MS: '500' };
    const result = ConfigSchema.safeParse(env);
    expect(result.success).toBe(false);
  });

  it('rejects CRAWL_FETCH_TIMEOUT_MS above maximum', () => {
    const env = { ...validEnv(), CRAWL_FETCH_TIMEOUT_MS: '200000' };
    const result = ConfigSchema.safeParse(env);
    expect(result.success).toBe(false);
  });

  it('rejects CRAWL_MAX_REDIRECTS above maximum', () => {
    const env = { ...validEnv(), CRAWL_MAX_REDIRECTS: '25' };
    const result = ConfigSchema.safeParse(env);
    expect(result.success).toBe(false);
  });

  it('coerces METRICS_PORT from string', () => {
    const env = { ...validEnv(), METRICS_PORT: '9091' };
    const result = ConfigSchema.safeParse(env);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.METRICS_PORT).toBe(9091);
    }
  });
});
