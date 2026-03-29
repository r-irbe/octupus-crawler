// Config slices — narrow types for each consumer (structural subtyping)
// Implements: T-ARCH-015, REQ-ARCH-015, T-LIFE-001, T-LIFE-002

import type { Config } from './config-schema.js';

export type RedisConfig = Pick<Config, 'REDIS_URL' | 'REDIS_MAX_RETRIES'>;

export type DatabaseConfig = Pick<Config, 'DATABASE_URL' | 'DATABASE_POOL_SIZE'>;

export type S3Config = Pick<Config, 'S3_ENDPOINT' | 'S3_BUCKET' | 'S3_ACCESS_KEY' | 'S3_SECRET_KEY'>;

export type CrawlerConfig = Pick<Config,
  'CRAWL_MAX_DEPTH' | 'CRAWL_RATE_LIMIT_PER_DOMAIN' | 'CRAWL_MAX_CONCURRENT_DOMAINS' | 'CRAWL_USER_AGENT'
>;

export type ObservabilityConfig = Pick<Config, 'OTEL_EXPORTER_OTLP_ENDPOINT' | 'OTEL_SERVICE_NAME' | 'LOG_LEVEL'>;

export type HealthConfig = Pick<Config, 'HEALTH_PORT' | 'METRICS_PORT'>;

// Application lifecycle slices — REQ-LIFE-CFG-001 to 003

export type SeedConfig = Pick<Config, 'SEED_URLS'>;

export type FetchConfig = Pick<Config,
  'CRAWL_FETCH_TIMEOUT_MS' | 'CRAWL_MAX_REDIRECTS' | 'CRAWL_MAX_RESPONSE_BYTES' |
  'CRAWL_MAX_RETRIES' | 'CRAWL_USER_AGENT' | 'ALLOW_PRIVATE_IPS'
>;

export type WorkerConfig = Pick<Config,
  'WORKER_ID' | 'SERVICE_NAME' | 'CRAWL_MAX_CONCURRENT_FETCHES' | 'CRAWL_POLITENESS_DELAY_MS'
>;

export type DomainFilterConfig = Pick<Config, 'ALLOWED_DOMAINS'>;

// Resilience config slice — REQ-RES-003, REQ-RES-005, REQ-RES-008

export type ResilienceConfigSlice = Pick<Config,
  'CB_THRESHOLD' | 'CB_HALF_OPEN_AFTER_MS' | 'CB_MAX_DOMAINS' |
  'RETRY_MAX_ATTEMPTS' | 'RETRY_INITIAL_DELAY_MS' | 'RETRY_MAX_DELAY_MS' |
  'CRAWL_FETCH_TIMEOUT_MS' | 'TIMEOUT_DB_MS' | 'TIMEOUT_REDIS_MS' |
  'BULKHEAD_MAX_CONCURRENT_PER_DOMAIN' |
  'TOKEN_BUCKET_MAX_TOKENS' | 'TOKEN_BUCKET_REFILL_RATE'
>;
