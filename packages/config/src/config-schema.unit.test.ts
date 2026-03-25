// Validates REQ-ARCH-014: Configuration validated at startup via schema validator
// Validates REQ-ARCH-015: Narrow config slice types for each consumer
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
