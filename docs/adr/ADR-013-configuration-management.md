# ADR-013: Configuration Management — Zod + ConfigMaps + External Secrets Operator

| Field | Value |
| --- | --- |
| **Status** | Accepted |
| **Created** | 2026-03-24 |
| **Last Updated** | 2026-03-24 |
| **Author(s)** | Architecture Council |
| **Reviewers** | Architect, Skeptic, SecOps Advisor, SecEng Advisor, SRE |
| **Supersedes** | N/A |
| **Superseded By** | N/A |

## Context

Distributed services need configuration for database URLs, Redis connections, queue settings, rate limits, feature flags, and secrets (API keys, credentials). Configuration must be type-safe, validated at startup (fail-fast), environment-specific, and secrets must never be stored in git.

## Decision Drivers

- Type-safe configuration with compile-time checks
- Runtime validation at startup (fail-fast on bad config)
- Environment-specific overrides (local, staging, prod)
- Secret management that never touches git
- K8s-native configuration patterns
- Developer experience (easy to add new config keys)
- Audit trail for configuration changes

## Considered Options

### Option A: Zod-validated env vars + K8s ConfigMaps + External Secrets Operator (ESO)

**Pros:**

- Zod: type-safe config schema validating env vars at startup
- ConfigMaps: K8s-native, ArgoCD-managed, versioned in git
- ESO: syncs secrets from external vaults (AWS SM, GCP SM, Vault) to K8s Secrets
- Single pattern: all config flows through env vars → Zod validation
- Fail-fast: app crashes on startup with clear error if config is invalid
- ESO supports multiple secret backends without code changes

**Cons:**

- ESO is an additional cluster component to manage
- Env vars have size limits (mitigated: configs are small)

### Option B: dotenv + JSON config files

**Pros:**

- Simple, widely understood
- No K8s dependencies for local dev

**Cons:**

- No runtime type validation without additional library
- Config files risk being committed with secrets
- No K8s-native secret management

### Option C: Vault direct integration

**Pros:**

- Direct secret access with fine-grained policies
- Dynamic secrets (rotating DB credentials)

**Cons:**

- Vault client in every service
- Vault availability becomes a runtime dependency
- More complex configuration per service
- Overkill for initial deployment

## Decision

Adopt **Zod-validated environment variables** sourced from **K8s ConfigMaps** (non-secret) and **External Secrets Operator** (secrets).

### Configuration Schema

```typescript
// packages/shared/src/config.ts
import { z } from 'zod';

const configSchema = z.object({
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

export type Config = z.infer<typeof configSchema>;

let _config: Config;

export function loadConfig(): Config {
  if (_config) return _config;

  const result = configSchema.safeParse(process.env);

  if (!result.success) {
    console.error('Invalid configuration:');
    for (const issue of result.error.issues) {
      console.error(`  ${issue.path.join('.')}: ${issue.message}`);
    }
    process.exit(1); // Fail fast
  }

  _config = result.data;
  return _config;
}
```

### Kubernetes Resources

```yaml
# infrastructure/k8s/base/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: ipf-config
data:
  NODE_ENV: "production"
  LOG_LEVEL: "info"
  REDIS_URL: "redis://dragonfly:6379"
  S3_ENDPOINT: "http://minio:9000"
  S3_BUCKET: "ipf-crawl-pages"
  OTEL_EXPORTER_OTLP_ENDPOINT: "http://otel-collector:4318"
  CRAWL_MAX_DEPTH: "3"
  CRAWL_RATE_LIMIT_PER_DOMAIN: "2000"
  CRAWL_USER_AGENT: "IPF-Crawler/1.0"
  HEALTH_PORT: "8081"
```

```yaml
# infrastructure/k8s/base/external-secret.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: ipf-secrets
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager  # or vault, gcp-sm
    kind: ClusterSecretStore
  target:
    name: ipf-secrets
  data:
    - secretKey: DATABASE_URL
      remoteRef:
        key: ipf/database-url
    - secretKey: S3_ACCESS_KEY
      remoteRef:
        key: ipf/s3-access-key
    - secretKey: S3_SECRET_KEY
      remoteRef:
        key: ipf/s3-secret-key
```

```yaml
# Deployment envFrom
spec:
  containers:
    - name: worker
      envFrom:
        - configMapRef:
            name: ipf-config
        - secretRef:
            name: ipf-secrets
```

## Consequences

### Positive

- App crashes at startup with clear errors if config is invalid (fail-fast)
- TypeScript types inferred from Zod schema — IDE autocompletion for all config
- Secrets never in git — ESO manages the sync from external vaults
- ConfigMaps are version-controlled, ArgoCD-managed, reviewable in PRs
- Adding a new config key = add to Zod schema + ConfigMap/Secret
- Same Zod schema validates both local .env and K8s-sourced env vars

### Negative

- ESO adds a cluster component (mitigated: lightweight operator)
- All config as env vars can get verbose (mitigated: grouped in configSchema sections)

### Risks

- ESO secret sync delay on rotation (mitigated: refreshInterval config)
- Zod schema diverging from actual ConfigMap keys (mitigated: CI validates schema against ConfigMap)

## Validation

- App fails to start with clear Zod error when required config is missing
- All secrets sourced from ESO, zero secrets in git (audit via `git log`)
- Config changes deployed via ArgoCD after PR review
- Zod schema matches ConfigMap keys (validated in CI)

## Schema-First as Agent Reliability Pattern (ADR-018)

Zod schemas serve a dual role in agentic workflows: they are both the runtime validation layer and the **contract between stochastic LLM generation and deterministic domain logic**.

Agent reliability benefits:

- **Type derivation via `z.infer`**: Agents use `z.infer<typeof Schema>` to derive TypeScript types rather than writing types separately — eliminates agent-introduced divergence between runtime and compile-time shapes
- **Runtime boundary validation**: Agent-generated data (config values, API payloads, tool call results) is validated against Zod schemas before entering domain logic
- **Structured output validation**: LLM structured output should always be parsed through Zod before use, turning parse failures into actionable error messages for Guard Function retries
- **Schema = specification**: The Zod schema is a machine-readable specification that constrains what generated code can produce, narrowing the valid generation space

## Related

- [ADR-004: GitOps Deployment](ADR-004-gitops-deployment.md) — ConfigMaps managed via ArgoCD
- [ADR-011: API Framework](ADR-011-api-framework.md) — Fastify uses validated config
- [ADR-006: Observability Stack](ADR-006-observability-stack.md) — OTel config via env vars
- [ADR-018: Agentic Coding](ADR-018-agentic-coding-conventions.md) — Schema-first as agent reliability pattern

---

> **Provenance**: Created 2026-03-24; updated 2026-03-25 with schema-first agent reliability pattern from [docs/research/ai_coding.md](../research/ai_coding.md).

- [ADR-004: GitOps Deployment](ADR-004-gitops-deployment.md) — ConfigMaps managed via ArgoCD
- [ADR-011: API Framework](ADR-011-api-framework.md) — Fastify uses validated config
- [ADR-006: Observability Stack](ADR-006-observability-stack.md) — OTel config via env vars

---

> **Provenance**: Created 2026-03-24 during initial architecture design phase. Based on analysis of configuration management patterns for secure, type-safe, K8s-native distributed systems.
