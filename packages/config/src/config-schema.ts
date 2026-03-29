// Config schema — Zod-validated environment variables
// Implements: T-ARCH-013, REQ-ARCH-014, ADR-013, T-LIFE-001, T-LIFE-002, REQ-LIFE-CFG-001 to 003

import { z } from 'zod/v4';

export const ConfigSchema = z.object({
  // Service identity
  SERVICE_NAME: z.string().min(1),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error']).default('info'),
  WORKER_ID: z.string().min(1).optional(),

  // Redis / Dragonfly (state store)
  REDIS_URL: z.url().refine(
    (v) => v.startsWith('redis://') || v.startsWith('rediss://'),
    { message: 'REDIS_URL must start with redis:// or rediss://' },
  ),
  REDIS_MAX_RETRIES: z.coerce.number().int().min(0).default(3),

  // PostgreSQL
  DATABASE_URL: z.url().refine(
    (v) => v.startsWith('postgres://') || v.startsWith('postgresql://'),
    { message: 'DATABASE_URL must start with postgres:// or postgresql://' },
  ),
  DATABASE_POOL_SIZE: z.coerce.number().int().min(1).max(100).default(20),

  // S3 / MinIO
  S3_ENDPOINT: z.url(),
  S3_BUCKET: z.string().min(1).default('ipf-crawl-pages'),
  S3_ACCESS_KEY: z.string().min(1),
  S3_SECRET_KEY: z.string().min(1),

  // Crawler settings — REQ-LIFE-CFG-002 required, REQ-LIFE-CFG-003 optional with defaults
  SEED_URLS: z.string().min(1).describe('Comma-separated list of seed URLs'),
  CRAWL_MAX_DEPTH: z.coerce.number().int().min(0).max(100).default(3),
  CRAWL_MAX_CONCURRENT_FETCHES: z.coerce.number().int().min(1).default(10),
  CRAWL_FETCH_TIMEOUT_MS: z.coerce.number().int().min(1000).max(120_000).default(30_000),
  CRAWL_POLITENESS_DELAY_MS: z.coerce.number().int().min(0).default(2000),
  CRAWL_RATE_LIMIT_PER_DOMAIN: z.coerce.number().int().min(100).default(2000),
  CRAWL_MAX_CONCURRENT_DOMAINS: z.coerce.number().int().min(1).default(100),
  CRAWL_MAX_RETRIES: z.coerce.number().int().min(0).max(20).default(3),
  CRAWL_MAX_REDIRECTS: z.coerce.number().int().min(0).max(20).default(5),
  CRAWL_MAX_RESPONSE_BYTES: z.coerce.number().int().min(1024).default(10_485_760),
  CRAWL_USER_AGENT: z.string().default('IPF-Crawler/1.0'),
  ALLOW_PRIVATE_IPS: z.enum(['true', 'false']).default('false').transform((v) => v === 'true'),
  ALLOWED_DOMAINS: z.string().optional(),

  // Resilience — REQ-RES-003, REQ-RES-005, REQ-RES-008, REQ-RES-012, REQ-RES-020
  CB_THRESHOLD: z.coerce.number().int().min(1).max(100).default(5),
  CB_HALF_OPEN_AFTER_MS: z.coerce.number().int().min(1000).max(300_000).default(30_000),
  RETRY_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(20).default(3),
  RETRY_INITIAL_DELAY_MS: z.coerce.number().int().min(100).max(60_000).default(1_000),
  RETRY_MAX_DELAY_MS: z.coerce.number().int().min(1000).max(300_000).default(30_000),
  TIMEOUT_DB_MS: z.coerce.number().int().min(1000).max(120_000).default(10_000),
  TIMEOUT_REDIS_MS: z.coerce.number().int().min(500).max(30_000).default(5_000),
  BULKHEAD_MAX_CONCURRENT_PER_DOMAIN: z.coerce.number().int().min(1).max(50).default(2),
  CB_MAX_DOMAINS: z.coerce.number().int().min(100).max(100_000).default(10_000),

  // Observability
  OTEL_EXPORTER_OTLP_ENDPOINT: z.url().default('http://otel-collector:4318'),
  OTEL_SERVICE_NAME: z.string().optional(),

  // Health / Metrics
  HEALTH_PORT: z.coerce.number().int().min(1024).max(65535).default(8081),
  METRICS_PORT: z.coerce.number().int().min(1024).max(65535).default(9090),
});

export type Config = z.infer<typeof ConfigSchema>;
