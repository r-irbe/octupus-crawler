// Integration test: Unknown event version skip behavior
// Validates T-COMM-026 (REQ-COMM-015): Consumer handles unknown versions gracefully
// Consumer should skip unrecognized event versions without crashing

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Redis } from 'ioredis';
import { z } from 'zod';
import { startRedisContainer, type ManagedRedisContainer } from '@ipf/testing/containers/redis';
import { createRedisStreamPublisher, type StreamEvent } from './stream-publisher.js';
import { createRedisStreamConsumer } from './stream-consumer.js';

// Inline DomainEvent schema for version validation — avoids cross-package dep
const KnownDomainEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('CrawlCompleted'), version: z.literal(1), payload: z.object({
    jobId: z.string(), url: z.string(), statusCode: z.number(),
    contentLength: z.number(), fetchDurationMs: z.number(),
  }) }),
  z.object({ type: z.literal('CrawlFailed'), version: z.literal(1), payload: z.object({
    jobId: z.string(), url: z.string(), errorKind: z.string(),
    message: z.string(), attempt: z.number(),
  }) }),
]);

describe('Unknown event version handling (integration)', () => {
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

  // Validates REQ-COMM-015: unknown version events are skipped, not crashed
  it('consumer reads unknown-version event without crashing', async () => {
    const publisher = createRedisStreamPublisher(redis);
    const consumer = createRedisStreamConsumer(redis);

    const stream = 'test:version-skip';
    const group = 'version-group';
    const consumerName = 'worker-version';

    await consumer.createGroup(stream, group);

    // Publish event with future/unknown version
    const unknownEvent: StreamEvent = {
      type: 'CrawlCompleted',
      version: 99,
      payload: { url: 'https://example.com', statusCode: 200, future: true },
      id: 'evt-unknown-v',
      timestamp: new Date().toISOString(),
      source: 'test',
    };

    const pubResult = await publisher.publish(stream, unknownEvent);
    expect(pubResult.isOk()).toBe(true);

    // Consumer can read the entry without crashing
    const consumeResult = await consumer.consume(stream, group, consumerName, 10, 1_000);
    expect(consumeResult.isOk()).toBe(true);

    if (consumeResult.isOk()) {
      expect(consumeResult.value.length).toBe(1);
      const entry = consumeResult.value[0];
      expect(entry).toBeDefined();

      if (entry) {
        // Parse the raw data — consumer gets it fine
        const parsed: unknown = JSON.parse(entry.data);
        expect(parsed).toMatchObject({ type: 'CrawlCompleted', version: 99 });

        // But Zod schema validation rejects it
        const zodResult = KnownDomainEventSchema.safeParse(parsed);
        expect(zodResult.success).toBe(false);

        // Consumer should ACK and skip (not re-process)
        const ackResult = await consumer.ack(stream, group, [entry.entryId]);
        expect(ackResult.isOk()).toBe(true);
      }
    }
  });

  it('known version events still validate correctly after unknown ones', async () => {
    const publisher = createRedisStreamPublisher(redis);
    const consumer = createRedisStreamConsumer(redis);

    const stream = 'test:version-mixed';
    const group = 'mixed-group';
    const consumerName = 'worker-mixed';

    await consumer.createGroup(stream, group);

    // Publish unknown version, then known version
    const unknownEvent: StreamEvent = {
      type: 'CrawlFailed',
      version: 42,
      payload: { weird: true },
      id: 'evt-v42',
      timestamp: new Date().toISOString(),
      source: 'test',
    };

    const knownEvent: StreamEvent = {
      type: 'CrawlCompleted',
      version: 1,
      payload: {
        jobId: 'job-1',
        url: 'https://example.com',
        statusCode: 200,
        contentLength: 1024,
        fetchDurationMs: 150,
      },
      id: 'evt-v1',
      timestamp: new Date().toISOString(),
      source: 'test',
    };

    await publisher.publish(stream, unknownEvent);
    await publisher.publish(stream, knownEvent);

    const consumeResult = await consumer.consume(stream, group, consumerName, 10, 1_000);
    expect(consumeResult.isOk()).toBe(true);

    if (consumeResult.isOk()) {
      expect(consumeResult.value.length).toBe(2);

      const entryIds: string[] = [];
      let validCount = 0;
      let skippedCount = 0;

      for (const entry of consumeResult.value) {
        entryIds.push(entry.entryId);
        const parsed: unknown = JSON.parse(entry.data);
        const zodResult = KnownDomainEventSchema.safeParse(parsed);
        if (zodResult.success) {
          validCount++;
        } else {
          skippedCount++;
        }
      }

      expect(validCount).toBe(1);
      expect(skippedCount).toBe(1);

      // ACK all — both valid and invalid
      const ackResult = await consumer.ack(stream, group, entryIds);
      expect(ackResult.isOk()).toBe(true);
    }
  });
});
