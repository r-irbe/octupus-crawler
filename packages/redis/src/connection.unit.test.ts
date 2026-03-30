// Unit tests for Redis connection configuration
// Validates: REQ-COMM-009 (Redis Streams infrastructure)

import { describe, it, expect } from 'vitest';
import { RedisConnectionSchema, parseRedisUrl } from './connection.js';

describe('RedisConnectionSchema', () => {
  // Validates REQ-COMM-009
  it('provides sensible defaults', () => {
    const result = RedisConnectionSchema.parse({});

    expect(result.host).toBe('localhost');
    expect(result.port).toBe(6379);
    expect(result.db).toBe(0);
    expect(result.lazyConnect).toBe(true);
    expect(result.connectTimeout).toBe(10_000);
  });

  // Validates REQ-COMM-009
  it('validates port range', () => {
    expect(() => RedisConnectionSchema.parse({ port: 0 })).toThrow();
    expect(() => RedisConnectionSchema.parse({ port: 70_000 })).toThrow();
    expect(() => RedisConnectionSchema.parse({ port: 6379 })).not.toThrow();
  });

  // Validates REQ-COMM-009
  it('validates db range', () => {
    expect(() => RedisConnectionSchema.parse({ db: -1 })).toThrow();
    expect(() => RedisConnectionSchema.parse({ db: 16 })).toThrow();
    expect(() => RedisConnectionSchema.parse({ db: 15 })).not.toThrow();
  });
});

describe('parseRedisUrl', () => {
  // Validates REQ-COMM-009
  it('parses standard redis URL', () => {
    const conn = parseRedisUrl('redis://myuser:mypass@redis.local:6380/2');

    expect(conn.host).toBe('redis.local');
    expect(conn.port).toBe(6380);
    expect(conn.username).toBe('myuser');
    expect(conn.password).toBe('mypass');
    expect(conn.db).toBe(2);
  });

  // Validates REQ-COMM-009
  it('handles URL without credentials', () => {
    const conn = parseRedisUrl('redis://localhost:6379/0');

    expect(conn.host).toBe('localhost');
    expect(conn.port).toBe(6379);
    expect(conn.db).toBe(0);
  });

  // Validates REQ-COMM-009
  it('defaults to port 6379 when not specified', () => {
    const conn = parseRedisUrl('redis://localhost/0');

    expect(conn.port).toBe(6379);
  });

  // Validates REQ-COMM-009
  it('defaults to db 0 when no path', () => {
    const conn = parseRedisUrl('redis://localhost:6379');

    expect(conn.db).toBe(0);
  });

  // Validates REQ-COMM-009
  it('decodes URI-encoded password', () => {
    const conn = parseRedisUrl('redis://user:p%40ss%3Aword@host:6379/0');

    expect(conn.password).toBe('p@ss:word');
    expect(conn.username).toBe('user');
  });
});
