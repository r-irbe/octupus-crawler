# Environment Variable Reference

> Implements: REQ-INFRA-015, REQ-INFRA-018
> Source: `packages/config/src/config-schema.ts`

## Required Variables

| Variable | Type | Default | Description |
| --- | --- | --- | --- |
| `SERVICE_NAME` | string | — | Service identifier for logging and tracing |
| `REDIS_URL` | URL | — | Redis/Dragonfly connection (`redis://host:port`) |
| `DATABASE_URL` | URL | — | PostgreSQL connection (`postgresql://...`) |
| `S3_ENDPOINT` | URL | — | S3/MinIO endpoint URL |
| `S3_ACCESS_KEY` | string | — | S3 access key (via K8s Secret) |
| `S3_SECRET_KEY` | string | — | S3 secret key (via K8s Secret) |
| `SEED_URLS` | CSV string | — | Comma-separated initial crawl URLs |

## Optional Variables (with defaults)

| Variable | Type | Default | Description |
| --- | --- | --- | --- |
| `NODE_ENV` | enum | `development` | `development`, `test`, `production` |
| `LOG_LEVEL` | enum | `info` | `trace`, `debug`, `info`, `warn`, `error` |
| `WORKER_ID` | string | — | Unique worker identifier |
| `REDIS_MAX_RETRIES` | number | `3` | Max Redis connection retries |
| `DATABASE_POOL_SIZE` | number | `20` | PostgreSQL connection pool size |
| `S3_BUCKET` | string | `ipf-crawl-pages` | S3 bucket name |
| `CRAWL_MAX_DEPTH` | number | `3` | Maximum crawl depth from seeds |
| `CRAWL_MAX_CONCURRENT_FETCHES` | number | `10` | Parallel fetch limit |
| `CRAWL_FETCH_TIMEOUT_MS` | number | `30000` | HTTP fetch timeout (ms) |
| `CRAWL_POLITENESS_DELAY_MS` | number | `2000` | Per-domain delay between requests |
| `CRAWL_RATE_LIMIT_PER_DOMAIN` | number | `2000` | Rate limit per domain (ms) |
| `CRAWL_MAX_CONCURRENT_DOMAINS` | number | `100` | Max parallel domains |
| `CRAWL_MAX_RETRIES` | number | `3` | Fetch retry limit |
| `CRAWL_MAX_REDIRECTS` | number | `5` | Max HTTP redirects |
| `CRAWL_MAX_RESPONSE_BYTES` | number | `10485760` | Max response body (10MB) |
| `CRAWL_USER_AGENT` | string | `IPF-Crawler/1.0` | HTTP User-Agent header |
| `ALLOW_PRIVATE_IPS` | boolean | `false` | Allow fetching private IPs (dev only) |
| `ALLOWED_DOMAINS` | CSV string | — | Restrict crawl to listed domains |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | URL | `http://otel-collector:4318` | OTel collector endpoint |
| `OTEL_SERVICE_NAME` | string | — | Override OTel service name |
| `HEALTH_PORT` | number | `8081` | Health check HTTP port |
| `METRICS_PORT` | number | `9090` | Prometheus metrics HTTP port |

## Secret Injection

All secrets are injected via Kubernetes Secrets (REQ-INFRA-016):
- `state-store-credentials`: `REDIS_URL`
- `database-credentials`: `DATABASE_URL`
- `s3-credentials`: `S3_ACCESS_KEY`, `S3_SECRET_KEY`

In production, use External Secrets Operator to sync from a vault provider.
