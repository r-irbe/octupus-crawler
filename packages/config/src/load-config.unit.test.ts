// Validates REQ-ARCH-014: loadConfig returns Result<Config, ConfigError> — never throws
// Validates REQ-LIFE-CFG-001: Config validated at startup, structured error on failure
import { describe, it, expect } from 'vitest';
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
    SEED_URLS: 'https://example.com',
  };
}

describe('loadConfig', () => {
  // Validates REQ-ARCH-014: returns Result.ok for valid config
  it('returns ok for valid environment', () => {
    const result = loadConfig(validEnv());
    expect(result.isOk()).toBe(true);
  });

  it('returns the parsed config on success', () => {
    const result = loadConfig(validEnv());
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.SERVICE_NAME).toBe('test-service');
      expect(result.value.NODE_ENV).toBe('development');
    }
  });

  // Validates REQ-ARCH-014: returns Result.err with structured error
  it('returns err for invalid environment', () => {
    const result = loadConfig({});
    expect(result.isErr()).toBe(true);
  });

  it('returns a human-readable error message on failure', () => {
    const result = loadConfig({});
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.kind).toBe('config_validation');
      expect(result.error.message.length).toBeGreaterThan(0);
      expect(result.error.issues.length).toBeGreaterThan(0);
    }
  });
});
