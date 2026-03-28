// Unit tests for state-store connection parsing
// Validates: T-COORD-012, REQ-DIST-021

import { describe, it, expect } from 'vitest';
import {
  StateStoreConnectionSchema,
  buildConnectionUrl,
  parseConnectionUrl,
} from './state-store-connection.js';

describe('StateStoreConnectionSchema', () => {
  // Validates REQ-DIST-021: host, port, password, username, database, TLS
  it('validates minimal config with defaults', () => {
    const result = StateStoreConnectionSchema.parse({ host: 'redis.local' });
    expect(result.host).toBe('redis.local');
    expect(result.port).toBe(6379);
    expect(result.database).toBe(0);
    expect(result.tls).toBe(false);
  });

  // Validates REQ-DIST-021: full config with ACL and TLS
  it('validates full config with all fields', () => {
    const result = StateStoreConnectionSchema.parse({
      host: 'redis.prod',
      port: 6380,
      password: 'secret',
      username: 'acl-user',
      database: 3,
      tls: true,
    });
    expect(result.host).toBe('redis.prod');
    expect(result.port).toBe(6380);
    expect(result.password).toBe('secret');
    expect(result.username).toBe('acl-user');
    expect(result.database).toBe(3);
    expect(result.tls).toBe(true);
  });

  // Validates REQ-DIST-021: port validation
  it('rejects invalid port', () => {
    expect(() => StateStoreConnectionSchema.parse({ host: 'x', port: 0 })).toThrow();
    expect(() => StateStoreConnectionSchema.parse({ host: 'x', port: 70000 })).toThrow();
  });

  // Validates REQ-DIST-021: database range
  it('rejects database out of range', () => {
    expect(() => StateStoreConnectionSchema.parse({ host: 'x', database: -1 })).toThrow();
    expect(() => StateStoreConnectionSchema.parse({ host: 'x', database: 16 })).toThrow();
  });
});

describe('buildConnectionUrl', () => {
  // Validates REQ-DIST-021: URL construction
  it('builds plain redis URL', () => {
    const url = buildConnectionUrl({ host: 'localhost', port: 6379, database: 0, tls: false });
    expect(url).toBe('redis://localhost:6379');
  });

  it('builds TLS URL', () => {
    const url = buildConnectionUrl({ host: 'redis.io', port: 6380, database: 0, tls: true });
    expect(url).toBe('rediss://redis.io:6380');
  });

  it('includes password in URL', () => {
    const url = buildConnectionUrl({ host: 'h', port: 6379, password: 'pass', database: 0, tls: false });
    expect(url).toBe('redis://:pass@h:6379');
  });

  it('includes username and password (ACL)', () => {
    const url = buildConnectionUrl({ host: 'h', port: 6379, username: 'user', password: 'pass', database: 0, tls: false });
    expect(url).toBe('redis://user:pass@h:6379');
  });

  it('includes database path', () => {
    const url = buildConnectionUrl({ host: 'h', port: 6379, database: 5, tls: false });
    expect(url).toBe('redis://h:6379/5');
  });
});

describe('parseConnectionUrl', () => {
  // Validates REQ-DIST-021: URL parsing roundtrip
  it('parses plain redis URL', () => {
    const conn = parseConnectionUrl('redis://localhost:6379');
    expect(conn.host).toBe('localhost');
    expect(conn.port).toBe(6379);
    expect(conn.tls).toBe(false);
  });

  it('parses TLS URL', () => {
    const conn = parseConnectionUrl('rediss://redis.prod:6380');
    expect(conn.tls).toBe(true);
    expect(conn.port).toBe(6380);
  });

  it('parses URL with password', () => {
    const conn = parseConnectionUrl('redis://:secret@host:6379');
    expect(conn.password).toBe('secret');
  });

  it('parses URL with ACL username + password', () => {
    const conn = parseConnectionUrl('redis://admin:secret@host:6379');
    expect(conn.username).toBe('admin');
    expect(conn.password).toBe('secret');
  });

  it('parses URL with database', () => {
    const conn = parseConnectionUrl('redis://host:6379/3');
    expect(conn.database).toBe(3);
  });

  it('defaults port to 6379 when not specified', () => {
    const conn = parseConnectionUrl('redis://host');
    expect(conn.port).toBe(6379);
  });

  // Validates REQ-DIST-021: rejects non-redis protocols
  it('rejects non-redis URL protocols', () => {
    expect(() => parseConnectionUrl('http://host:6379')).toThrow('Invalid Redis URL protocol');
    expect(() => parseConnectionUrl('https://host:6379')).toThrow('Invalid Redis URL protocol');
  });
});
