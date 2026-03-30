// Integration test: Redis Streams publish/consume round-trip
// Validates REQ-COMM-009: Durable event delivery via Redis Streams
// Implements: T-COMM-024
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Redis } from 'ioredis';
import { startRedisContainer, type ManagedRedisContainer } from '@ipf/testing/containers/redis';
import { createRedisStreamPublisher, type StreamEvent } from './stream-publisher.js';
import { createRedisStreamConsumer } from './stream-consumer.js';

describe('Redis Streams round-trip (integration)', () => {
  let container: ManagedRedisContainer;
  let redis: Redis;

  beforeAll(async () => {
    container = await startRedisContainer();
    redis = new Redis({
      host: container.connection.host,
      port: container.connection.port,
      maxRetriesPerRequest: null,
      lazyConnect: false,
    });
  }, 30_000);

  afterAll(async () => {
    await redis.quit();
    await container.stop();
  });

  // Validates REQ-COMM-009
  it('publishes and consumes a single event', async () => {
    const publisher = createRedisStreamPublisher(redis);
    const consumer = createRedisStreamConsumer(redis);

    const stream = 'test:events:single';
    const group = 'test-group';
    const consumerName = 'worker-1';

    await consumer.createGroup(stream, group);

    const event: StreamEvent = {
      type: 'CrawlCompleted',
      version: 1,
      payload: { url: 'https://example.com', statusCode: 200 },
      id: 'evt-001',
      timestamp: new Date().toISOString(),
      source: 'worker',
    };

    const pubResult = await publisher.publish(stream, event);
    expect(pubResult.isOk()).toBe(true);

    const consumeResult = await consumer.consume(stream, group, consumerName, 10, 1_000);
    expect(consumeResult.isOk()).toBe(true);
    if (consumeResult.isOk()) {
      expect(consumeResult.value.length).toBe(1);
      const entry = consumeResult.value[0];
      expect(entry).toBeDefined();
      if (entry) {
        const parsed = JSON.parse(entry.data) as StreamEvent;
        expect(parsed.type).toBe('CrawlCompleted');
        expect(parsed.id).toBe('evt-001');

        // Ack the entry
        const ackResult = await consumer.ack(stream, group, [entry.entryId]);
        expect(ackResult.isOk()).toBe(true);
      }
    }
  });

  // Validates REQ-COMM-009
  it('publishes batch and consumes all events', async () => {
    const publisher = createRedisStreamPublisher(redis);
    const consumer = createRedisStreamConsumer(redis);

    const stream = 'test:events:batch';
    const group = 'batch-group';

    await consumer.createGroup(stream, group);

    const events: StreamEvent[] = Array.from({ length: 5 }, (_, i) => ({
      type: 'URLDiscovered',
      version: 1,
      payload: { url: `https://example.com/page-${String(i)}` },
      id: `evt-batch-${String(i)}`,
      timestamp: new Date().toISOString(),
      source: 'parser',
    }));

    const batchResult = await publisher.publishBatch(stream, events);
    expect(batchResult.isOk()).toBe(true);
    if (batchResult.isOk()) {
      expect(batchResult.value.length).toBe(5);
    }

    const consumeResult = await consumer.consume(stream, group, 'worker-1', 10, 1_000);
    expect(consumeResult.isOk()).toBe(true);
    if (consumeResult.isOk()) {
      expect(consumeResult.value.length).toBe(5);
    }
  });

  // Validates REQ-COMM-009
  it('consumer group is idempotent (BUSYGROUP handled)', async () => {
    const consumer = createRedisStreamConsumer(redis);
    const stream = 'test:events:idempotent';

    // Create group twice — second call should not error
    const r1 = await consumer.createGroup(stream, 'dup-group');
    expect(r1.isOk()).toBe(true);
    const r2 = await consumer.createGroup(stream, 'dup-group');
    expect(r2.isOk()).toBe(true);
  });

  // Validates REQ-COMM-009
  it('no messages when stream is empty', async () => {
    const consumer = createRedisStreamConsumer(redis);
    const stream = 'test:events:empty';

    await consumer.createGroup(stream, 'empty-group');

    const result = await consumer.consume(stream, 'empty-group', 'worker-1', 10, 100);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.length).toBe(0);
    }
  });
}, 60_000);
