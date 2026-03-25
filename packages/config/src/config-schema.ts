// Config schema — Zod-validated environment variables
// Implements: T-ARCH-013, REQ-ARCH-014, ADR-013

import { z } from 'zod';

export const ConfigSchema = z.object({
  // Service identity
  SERVICE_NAME: z.string().min(1),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error']).default('info'),

  // Redis / Dragonfly
  REDIS_URL: z.string().url().startsWith('redis://'),
  REDIS_MAX_RETRIES: z.coerce.number().int().min(0).default(3),

  // PostgreSQL
  DATABASE_URL: z.string().url().startsWith('postgres://'),
  DATABASE_POOL_SIZE: z.coerce.number().int().min(1).max(100).default(20),

  // S3 / MinIO
  S3_ENDPOINT: z.string().url(),
  S3_BUCKET: z.string().min(1).default('ipf-crawl-pages'),
  S3_ACCESS_KEY: z.string().min(1),
  S3_SECRET_KEY: z.string().min(1),

  // Crawler settings
  CRAWL_MAX_DEPTH: z.coerce.number().int().min(0).max(100).default(3),
  CRAWL_RATE_LIMIT_PER_DOMAIN: z.coerce.number().int().min(100).default(2000),
  CRAWL_MAX_CONCURRENT_DOMAINS: z.coerce.number().int().min(1).default(100),
  CRAWL_USER_AGENT: z.string().default('IPF-Crawler/1.0'),

  // Observability
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().default('http://otel-collector:4318'),
  OTEL_SERVICE_NAME: z.string().optional(),

  // Health
  HEALTH_PORT: z.coerce.number().int().min(1024).max(65535).default(8081),
});

export type Config = z.infer<typeof ConfigSchema>;
