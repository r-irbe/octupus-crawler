// Config slices — narrow types for each consumer (structural subtyping)
// Implements: T-ARCH-015, REQ-ARCH-015

import type { Config } from './config-schema.js';

export type RedisConfig = Pick<Config, 'REDIS_URL' | 'REDIS_MAX_RETRIES'>;

export type DatabaseConfig = Pick<Config, 'DATABASE_URL' | 'DATABASE_POOL_SIZE'>;

export type S3Config = Pick<Config, 'S3_ENDPOINT' | 'S3_BUCKET' | 'S3_ACCESS_KEY' | 'S3_SECRET_KEY'>;

export type CrawlerConfig = Pick<Config,
  'CRAWL_MAX_DEPTH' | 'CRAWL_RATE_LIMIT_PER_DOMAIN' | 'CRAWL_MAX_CONCURRENT_DOMAINS' | 'CRAWL_USER_AGENT'
>;

export type ObservabilityConfig = Pick<Config, 'OTEL_EXPORTER_OTLP_ENDPOINT' | 'OTEL_SERVICE_NAME' | 'LOG_LEVEL'>;

export type HealthConfig = Pick<Config, 'HEALTH_PORT'>;
