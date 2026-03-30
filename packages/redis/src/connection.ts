// Redis connection configuration — Zod-validated
// Implements: REQ-COMM-009 (Redis Streams infrastructure)

import { z } from 'zod';

export const RedisConnectionSchema = z.object({
  host: z.string().min(1).default('localhost'),
  port: z.number().int().positive().max(65535).default(6379),
  password: z.string().optional(),
  username: z.string().optional(),
  db: z.number().int().nonnegative().max(15).default(0),
  maxRetriesPerRequest: z.number().int().nonnegative().nullable().default(null),
  lazyConnect: z.boolean().default(true),
  connectTimeout: z.number().int().positive().default(10_000),
});

export type RedisConnection = z.infer<typeof RedisConnectionSchema>;

export function parseRedisUrl(url: string): RedisConnection {
  const parsed = new URL(url);
  const db = parsed.pathname.length > 1 ? Number(parsed.pathname.slice(1)) : 0;

  return RedisConnectionSchema.parse({
    host: parsed.hostname,
    port: parsed.port !== '' ? Number(parsed.port) : 6379,
    password: parsed.password !== '' ? decodeURIComponent(parsed.password) : undefined,
    username: parsed.username !== '' ? decodeURIComponent(parsed.username) : undefined,
    db,
  });
}
