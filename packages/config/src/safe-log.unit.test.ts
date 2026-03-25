// toSafeLog unit tests
// Validates: T-ARCH-032, Review finding S-1 (secret redaction)

import { describe, it, expect } from 'vitest';
import { toSafeLog, SENSITIVE_FIELDS, REDACTED } from './safe-log.js';

describe('toSafeLog', () => {
  // Validates: sensitive fields are redacted
  it('should redact sensitive fields', () => {
    const config = {
      SERVICE_NAME: 'crawler',
      S3_ACCESS_KEY: 'AKIAIOSFODNN7EXAMPLE',
      S3_SECRET_KEY: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      DATABASE_URL: 'postgres://user:pass@localhost:5432/db',
      REDIS_URL: 'redis://secret@localhost:6379',
    };

    const safe = toSafeLog(config);

    expect(safe['SERVICE_NAME']).toBe('crawler');
    expect(safe['S3_ACCESS_KEY']).toBe(REDACTED);
    expect(safe['S3_SECRET_KEY']).toBe(REDACTED);
    expect(safe['DATABASE_URL']).toBe(REDACTED);
    expect(safe['REDIS_URL']).toBe(REDACTED);
  });

  // Validates: non-sensitive fields pass through
  it('should pass through non-sensitive fields unchanged', () => {
    const config = {
      SERVICE_NAME: 'api-gateway',
      NODE_ENV: 'production',
      LOG_LEVEL: 'info',
      HEALTH_PORT: 8081,
    };

    const safe = toSafeLog(config);

    expect(safe['SERVICE_NAME']).toBe('api-gateway');
    expect(safe['NODE_ENV']).toBe('production');
    expect(safe['LOG_LEVEL']).toBe('info');
    expect(safe['HEALTH_PORT']).toBe(8081);
  });

  // Validates: returns a new object (not mutating original)
  it('should not mutate the original config', () => {
    const config = {
      S3_ACCESS_KEY: 'secret-key',
      SERVICE_NAME: 'test',
    };

    const safe = toSafeLog(config);

    expect(config['S3_ACCESS_KEY']).toBe('secret-key');
    expect(safe['S3_ACCESS_KEY']).toBe(REDACTED);
    expect(safe).not.toBe(config);
  });

  // Validates: empty config handled
  it('should handle empty config', () => {
    expect(toSafeLog({})).toEqual({});
  });
});

describe('SENSITIVE_FIELDS', () => {
  // Validates: expected fields are in the set
  it('should contain all expected sensitive field names', () => {
    expect(SENSITIVE_FIELDS.has('S3_ACCESS_KEY')).toBe(true);
    expect(SENSITIVE_FIELDS.has('S3_SECRET_KEY')).toBe(true);
    expect(SENSITIVE_FIELDS.has('DATABASE_URL')).toBe(true);
    expect(SENSITIVE_FIELDS.has('REDIS_URL')).toBe(true);
  });

  // Validates: non-sensitive fields are not in the set
  it('should not contain non-sensitive fields', () => {
    expect(SENSITIVE_FIELDS.has('SERVICE_NAME')).toBe(false);
    expect(SENSITIVE_FIELDS.has('LOG_LEVEL')).toBe(false);
  });
});
