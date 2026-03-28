// Unit tests for connection-config — Zod validation + parseRedisUrl
// Validates: REQ-INFRA-011, ADR-013

import { describe, it, expect } from 'vitest';
import { BullMQConnectionSchema, QueueConfigSchema, parseRedisUrl } from './connection-config.js';

describe('BullMQConnectionSchema', () => {
  // Validates REQ-INFRA-011: connection config defaults
  it('provides sensible defaults when given empty object', () => {
    const result = BullMQConnectionSchema.parse({});
    expect(result.host).toBe('localhost');
    expect(result.port).toBe(6379);
    expect(result.db).toBe(0);
    expect(result.maxRetriesPerRequest).toBeNull();
    expect(result.enableReadyCheck).toBe(false);
  });

  it('accepts valid connection config', () => {
    const result = BullMQConnectionSchema.parse({
      host: 'redis.example.com',
      port: 6380,
      password: 'secret',
      db: 2,
    });
    expect(result.host).toBe('redis.example.com');
    expect(result.port).toBe(6380);
    expect(result.password).toBe('secret');
    expect(result.db).toBe(2);
  });

  it('rejects invalid port numbers', () => {
    expect(() => BullMQConnectionSchema.parse({ port: 0 })).toThrow();
    expect(() => BullMQConnectionSchema.parse({ port: 70000 })).toThrow();
    expect(() => BullMQConnectionSchema.parse({ port: -1 })).toThrow();
  });

  it('rejects empty host', () => {
    expect(() => BullMQConnectionSchema.parse({ host: '' })).toThrow();
  });

  it('rejects db out of range', () => {
    expect(() => BullMQConnectionSchema.parse({ db: 16 })).toThrow();
    expect(() => BullMQConnectionSchema.parse({ db: -1 })).toThrow();
  });
});

describe('QueueConfigSchema', () => {
  // Validates ADR-002: queue topology defaults
  it('provides ADR-002 defaults when given empty object', () => {
    const result = QueueConfigSchema.parse({});
    expect(result.queueName).toBe('crawl');
    expect(result.defaultAttempts).toBe(3);
    expect(result.backoffType).toBe('exponential');
    expect(result.backoffDelay).toBe(5_000);
    expect(result.removeOnCompleteAge).toBe(3_600);
    expect(result.removeOnCompleteCount).toBe(10_000);
    expect(result.removeOnFailAge).toBe(86_400);
    expect(result.concurrency).toBe(10);
  });

  it('accepts custom queue name', () => {
    const result = QueueConfigSchema.parse({ queueName: 'crawl:high' });
    expect(result.queueName).toBe('crawl:high');
  });

  it('rejects invalid backoff type', () => {
    expect(() => QueueConfigSchema.parse({ backoffType: 'linear' })).toThrow();
  });
});

describe('parseRedisUrl', () => {
  it('parses standard redis:// URL', () => {
    const result = parseRedisUrl('redis://localhost:6379/0');
    expect(result.host).toBe('localhost');
    expect(result.port).toBe(6379);
    expect(result.db).toBe(0);
  });

  it('extracts password from URL', () => {
    const result = parseRedisUrl('redis://:mypassword@redis.example.com:6380/3');
    expect(result.host).toBe('redis.example.com');
    expect(result.port).toBe(6380);
    expect(result.password).toBe('mypassword');
    expect(result.db).toBe(3);
  });

  it('extracts username and password from URL', () => {
    const result = parseRedisUrl('redis://user:pass@host:6379/1');
    expect(result.username).toBe('user');
    expect(result.password).toBe('pass');
    expect(result.db).toBe(1);
  });

  it('uses default port when not specified', () => {
    const result = parseRedisUrl('redis://localhost/0');
    expect(result.port).toBe(6379);
  });

  it('uses default db when path is empty', () => {
    const result = parseRedisUrl('redis://localhost:6379');
    expect(result.db).toBe(0);
  });

  it('decodes URI-encoded password', () => {
    const result = parseRedisUrl('redis://:p%40ss%23word@localhost:6379/0');
    expect(result.password).toBe('p@ss#word');
  });
});
