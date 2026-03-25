// stripUrlCredentials unit tests
// Validates: T-ARCH-033, Review finding S-2 (URL creds in errors)

import { describe, it, expect } from 'vitest';
import { stripUrlCredentials } from './strip-url-credentials.js';

describe('stripUrlCredentials', () => {
  // Validates: URLs without credentials pass through unchanged
  it('should return URL unchanged when no credentials present', () => {
    expect(stripUrlCredentials('https://example.com/path')).toBe('https://example.com/path');
  });

  // Validates: username:password stripped from URL
  it('should strip user:pass from URL', () => {
    const result = stripUrlCredentials('https://user:pass@example.com/path');
    expect(result).not.toContain('user');
    expect(result).not.toContain('pass');
    expect(result).toContain('***');
    expect(result).toContain('example.com/path');
  });

  // Validates: username-only stripped from URL
  it('should strip username-only from URL', () => {
    const result = stripUrlCredentials('https://admin@example.com/');
    expect(result).not.toContain('admin');
    expect(result).toContain('***');
  });

  // Validates: redis:// URLs with credentials
  it('should strip credentials from redis:// URLs', () => {
    const result = stripUrlCredentials('redis://secret:token@redis-host:6379');
    expect(result).not.toContain('secret');
    expect(result).not.toContain('token');
    expect(result).toContain('redis-host:6379');
  });

  // Validates: postgres:// URLs with credentials
  it('should strip credentials from postgres:// URLs', () => {
    const result = stripUrlCredentials('postgres://dbuser:dbpass@db-host:5432/mydb');
    expect(result).not.toContain('dbuser');
    expect(result).not.toContain('dbpass');
    expect(result).toContain('db-host:5432/mydb');
  });

  // Validates: invalid URLs returned unchanged
  it('should return invalid URL strings unchanged', () => {
    expect(stripUrlCredentials('not-a-url')).toBe('not-a-url');
  });

  // Validates: empty string handled
  it('should handle empty string', () => {
    expect(stripUrlCredentials('')).toBe('');
  });
});
