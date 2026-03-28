// Redis container integration test — validates Testcontainer lifecycle
// Validates: REQ-TEST-005 (real infra), REQ-TEST-006 (no mocks),
//            REQ-TEST-024 (deterministic cleanup)

import { describe, it, expect, afterAll } from 'vitest';
import { createClient } from 'redis';
import { startRedisContainer, type ManagedRedisContainer } from './redis-container.js';

describe('Redis Testcontainer', () => {
  let container: ManagedRedisContainer;

  afterAll(async () => {
    // REQ-TEST-024: deterministic cleanup even if tests fail
    await container.stop();
  });

  // Validates REQ-TEST-005: integration tests use real Redis via Testcontainers
  it('starts a Redis container and connects', async () => {
    container = await startRedisContainer();

    const client = createClient({ url: container.connection.url });
    try {
      await client.connect();
      const pong = await client.ping();
      expect(pong).toBe('PONG');
    } finally {
      await client.quit();
    }
  }, 30_000);

  // Validates REQ-TEST-006: real SET/GET operations, no mocking
  it('performs real Redis operations', async () => {
    const client = createClient({ url: container.connection.url });
    try {
      await client.connect();
      await client.set('test-key', 'test-value');
      const value = await client.get('test-key');
      expect(value).toBe('test-value');

      await client.del('test-key');
      const deleted = await client.get('test-key');
      expect(deleted).toBeNull();
    } finally {
      await client.quit();
    }
  }, 10_000);

  // Validates REQ-TEST-024: stop() is idempotent
  it('stop() is idempotent', async () => {
    const ephemeral = await startRedisContainer();
    await ephemeral.stop();
    // Second stop should not throw
    await ephemeral.stop();
  }, 30_000);
});
