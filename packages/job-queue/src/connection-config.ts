// BullMQ connection configuration — Zod-validated Redis connection for BullMQ
// ADR-002: BullMQ + Dragonfly, ADR-013: Zod-validated config

import { z } from 'zod/v4';

// REQ-INFRA-011: connection via REDIS_URL or structured config
export const BullMQConnectionSchema = z.object({
  host: z.string().min(1).default('localhost'),
  port: z.number().int().positive().max(65535).default(6379),
  password: z.string().optional(),
  username: z.string().optional(),
  db: z.number().int().nonnegative().max(15).default(0),
  maxRetriesPerRequest: z.number().int().nonnegative().nullable().default(null),
  enableReadyCheck: z.boolean().default(false),
});

export type BullMQConnection = z.infer<typeof BullMQConnectionSchema>;

/** Queue configuration per ADR-002 §Queue Topology. */
export const QueueConfigSchema = z.object({
  queueName: z.string().min(1).default('crawl'),
  defaultAttempts: z.number().int().positive().default(3),
  backoffType: z.enum(['exponential', 'fixed']).default('exponential'),
  backoffDelay: z.number().int().positive().default(5_000),
  removeOnCompleteAge: z.number().int().nonnegative().default(3_600),
  removeOnCompleteCount: z.number().int().nonnegative().default(10_000),
  removeOnFailAge: z.number().int().nonnegative().default(86_400),
  concurrency: z.number().int().positive().default(10),
});

export type QueueConfig = z.infer<typeof QueueConfigSchema>;

/** Parse a Redis URL string into a BullMQ-compatible connection config. */
export function parseRedisUrl(url: string): BullMQConnection {
  const parsed = new URL(url);
  const db = parsed.pathname.length > 1 ? Number(parsed.pathname.slice(1)) : 0;

  return BullMQConnectionSchema.parse({
    host: parsed.hostname,
    port: parsed.port !== '' ? Number(parsed.port) : 6379,
    password: parsed.password !== '' ? decodeURIComponent(parsed.password) : undefined,
    username: parsed.username !== '' ? decodeURIComponent(parsed.username) : undefined,
    db,
  });
}
