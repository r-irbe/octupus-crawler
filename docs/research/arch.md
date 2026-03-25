# TypeScript/Node.js Distributed High-Concurrency Low-Latency Backend Architecture
## Master Plan — Step-by-Step Execution Guide

> **Purpose:** This document is a comprehensive, ordered execution plan. Each numbered Phase is a discrete deep-dive prompt session. Complete every phase fully before beginning the next. Quality target: production-grade, 99.999%-ready systems at every layer.

***

## Executive Summary

Building a world-class TypeScript/Node.js distributed backend requires mastery across nine interconnected disciplines: foundational setup, core framework architecture, Redis integration, API design, resilience engineering, observability, testing, CI/CD, and deployment. This plan structures those disciplines into 12 sequential phases, each producing a working, verifiable artifact. Every decision below is informed by the current (2025–2026) state of the ecosystem.

***

## Guiding Philosophy

Before entering any phase, internalize these principles:

1. **Type safety is non-negotiable** — TypeScript's compiler and Zod's runtime validation form a dual-layer correctness guarantee. A bug caught at compile time costs nothing; in production it costs everything.
2. **Correctness over cleverness** — Prefer explicit, boring, readable code over terse abstractions. The best distributed system is the one your team can debug at 3 AM.
3. **Observability is a first-class feature** — Every service emits structured logs, metrics, and traces from day one. Observability is not retrofitted.
4. **Resilience is designed in** — Circuit breakers, retries, timeouts, and graceful degradation are architectural components, not afterthoughts.
5. **DevEx multiplies team velocity** — Fast feedback loops (type checking, hot reload, test watch mode, local service mesh) reduce cognitive overhead and accelerate iteration.
6. **Infrastructure is code** — Every environment configuration, from local Docker Compose to cloud Kubernetes, is version-controlled, reproducible, and testable.

***

## Ecosystem Baseline (2026 State of the Art)

The plan uses the following technology selections, justified by research:

| Concern | Selected Technology | Rationale |
|---------|-------------------|-----------|
| Runtime | Node.js 22+ LTS | Native TypeScript strip-types, improved performance, stable |
| Language | TypeScript 5.5+ strict mode | 30–40% fewer production bugs; 20–25% faster onboarding[^1] |
| HTTP Framework | Fastify 5 + NestJS Fastify adapter | 2–3x more RPS than Express; NestJS DI for large teams[^2][^3] |
| Caching / Pub-Sub / Queue | Redis 8 (ioredis client) | 1M+ ops/sec; new parallel replication streams; 87.4% latency reduction across commands[^4][^5] |
| Job Queue | BullMQ (Redis Streams) | TypeScript-native, production-ready, built on Redis[^6][^7] |
| ORM (write) | Prisma 7 | Pure-TS engine (no binary), schema migration management[^8] |
| ORM (read/perf) | Drizzle ORM | SQL-like, no codegen, max query control[^8] |
| Runtime Validation | Zod | Schema = type inference; single source of truth[^9][^10][^11] |
| Internal API | tRPC (TypeScript monorepos) | Zero codegen, instant type inference, Zod input validation[^12][^13][^14] |
| Public API | OpenAPI 3.1 + TypeSpec | Contract-first, multi-language client generation[^15][^16][^17] |
| Observability | OpenTelemetry (OTLP) | Vendor-neutral; traces + metrics + logs[^18][^19] |
| Testing | Vitest 4 | 30–70% faster CI; native ESM/TS; Jest-compatible API[^20][^21][^22][^23] |
| Monorepo | Turborepo + pnpm workspaces | Default for JS/TS; 70% build time reduction with remote caching[^24] |
| Container Runtime | Docker + Docker Compose (dev) | Reproducible local environments[^25] |
| Orchestration (staging/prod) | Kubernetes (EKS/GKE/AKS) | Superior HA, GitOps, RBAC, ecosystem[^26][^27] |
| IaC | Pulumi (TypeScript) | Same language as application code; programmable infra[^28][^29][^30] |
| CI/CD | GitHub Actions + ArgoCD | GitOps-driven; zero-downtime deployments[^26][^25][^31] |
| Secrets | Vault / AWS Secrets Manager | Never hardcode; rotate regularly[^32] |
| Security baseline | OWASP Top 10, Helmet, npm audit | Defense-in-depth[^32][^33][^34] |

***

## Phase Overview (12 Phases)

```
Phase 1  → Foundational Setup & Project Structure
Phase 2  → TypeScript Configuration & Code Quality Toolchain
Phase 3  → Core Framework Architecture (Fastify / NestJS)
Phase 4  → Redis Architecture & Patterns
Phase 5  → API Design & Contract-First Development
Phase 6  → Database Layer (ORM, Migrations, Transactions)
Phase 7  → Resilience Engineering (Circuit Breakers, Rate Limiting, Retries)
Phase 8  → Observability (OpenTelemetry, Logging, Metrics, Tracing)
Phase 9  → Testing Architecture (Unit, Integration, E2E, Contract, Chaos)
Phase 10 → Security Architecture
Phase 11 → CI/CD Pipelines & Developer Experience
Phase 12 → Cloud Deployment, Kubernetes, and IaC
```

***

## Phase 1: Foundational Setup & Project Structure

**Goal:** A monorepo skeleton that all subsequent phases build upon. Establish conventions once, enforce them everywhere.

### 1.1 Monorepo Topology

```
/
├── apps/
│   ├── api-gateway/         # Public-facing tRPC / REST / GraphQL gateway
│   ├── auth-service/        # Authentication microservice
│   ├── worker-service/      # BullMQ job processors
│   └── ...                  # Additional microservices
├── packages/
│   ├── core/                # Shared domain types, value objects, errors
│   ├── redis/               # Redis client abstraction + circuit breaker
│   ├── observability/       # OpenTelemetry bootstrap, structured logging
│   ├── validation/          # Zod schemas, shared validation utilities
│   ├── config/              # Environment schema validation (Zod)
│   ├── testing/             # Shared test utilities, fixtures, mocks
│   ├── database/            # Prisma client, Drizzle schemas, migrations
│   └── eslint-config/       # Shared ESLint configuration
├── infra/
│   ├── docker/              # Dockerfiles per service
│   ├── k8s/                 # Kubernetes manifests (Helm charts)
│   └── pulumi/              # TypeScript IaC for cloud providers
├── .github/
│   └── workflows/           # GitHub Actions CI/CD
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
└── tsconfig.base.json
```

**Step outputs:**
- [ ] Turborepo + pnpm workspaces initialized[^24][^35]
- [ ] `tsconfig.base.json` shared strict configuration
- [ ] Changesets configured for versioning[^36]
- [ ] EditorConfig + `.nvmrc` / `.node-version` pinned
- [ ] Git hooks (Husky + lint-staged) enforcing quality gates pre-commit

### 1.2 Package Manager & Toolchain

```bash
# Bootstrap
pnpm init
pnpm add -D turbo husky lint-staged changesets
npx turbo init
```

**Decision:** Use **pnpm** exclusively. Strict node_modules isolation prevents phantom dependency bugs. Workspace protocol (`workspace:*`) for cross-package references.

### 1.3 Configuration Management

Environment variables are the single biggest source of production incidents in Node.js services. Use Zod schemas to validate all configuration at startup — fail fast if required variables are missing or malformed:

```typescript
// packages/config/src/index.ts
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  REDIS_URL: z.string().url(),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  LOG_LEVEL: z.enum(['fatal','error','warn','info','debug','trace']).default('info'),
});

export type Config = z.infer<typeof envSchema>;

export function loadConfig(): Config {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Invalid configuration:', result.error.format());
    process.exit(1);
  }
  return result.data;
}
```

**Step outputs:**
- [ ] `packages/config` validated with Zod at startup[^9][^10]
- [ ] `.env.example` committed; `.env` gitignored
- [ ] Docker Compose `env_file` wiring

***

## Phase 2: TypeScript Configuration & Code Quality Toolchain

**Goal:** A TypeScript setup so strict that an entire class of bugs becomes impossible to write.

### 2.1 TypeScript Compiler Configuration

```json
// tsconfig.base.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "strict": true,
    "exactOptionalPropertyTypes": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": false,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "outDir": "./dist",
    "rootDir": "./src"
  }
}
```

**Critical flags explained:**
- `exactOptionalPropertyTypes`: Prevents assigning `undefined` to optional properties — eliminates a major class of subtle bugs
- `noUncheckedIndexedAccess`: Array/map access returns `T | undefined`, forcing null checks
- `noImplicitOverride`: Forces explicit `override` keyword in class hierarchies
- `moduleResolution: NodeNext`: Required for ESM with explicit `.js` extensions in imports

### 2.2 Linting & Formatting

```bash
pnpm add -D eslint typescript-eslint prettier eslint-config-prettier
pnpm add -D @typescript-eslint/strict-type-checked
pnpm add -D eslint-plugin-unicorn eslint-plugin-import-x
```

**Key ESLint rules to enforce:**
- `@typescript-eslint/no-explicit-any` — error
- `@typescript-eslint/no-floating-promises` — error (critical for async correctness)
- `@typescript-eslint/no-misused-promises` — error
- `@typescript-eslint/consistent-type-imports` — error
- `unicorn/prefer-module` — enforce ESM
- `import-x/no-cycle` — prevent circular dependencies (silent runtime killers)

### 2.3 Pre-commit Quality Gates

```json
// .husky/pre-commit
{
  "lint-staged": {
    "*.ts": ["eslint --fix", "prettier --write"],
    "*.{json,yaml,md}": ["prettier --write"]
  }
}
```

**Step outputs:**
- [ ] `strict: true` + `exactOptionalPropertyTypes` + `noUncheckedIndexedAccess` enforced
- [ ] ESLint with `@typescript-eslint/strict-type-checked`[^1]
- [ ] No `any` types in production code (use `unknown` + Zod)
- [ ] Circular dependency detection in CI (`madge` or `eslint-plugin-import-x`)
- [ ] `tsc --noEmit` runs in every CI pipeline[^1]

***

## Phase 3: Core Framework Architecture (Fastify / NestJS)

**Goal:** A request lifecycle that is correct, fast, composable, and fully typed from transport to domain layer.

### 3.1 Framework Decision Matrix

| Criterion | Fastify standalone | NestJS + Fastify adapter |
|-----------|-------------------|--------------------------|
| Raw performance | ★★★★★ | ★★★★☆ |
| DI / IoC container | Manual | Built-in |
| Decorator-based routing | Plugin | Built-in |
| Team scaling | Harder (convention-based) | Easier (enforced structure) |
| Cold start | Faster | +500ms overhead[^37] |
| Microservice transport | Manual | Built-in (gRPC, MQTT, Redis) |

**Recommendation:** NestJS with Fastify adapter for services with teams > 3 engineers or where cross-cutting concerns (auth guards, interceptors, pipes) need DI. Raw Fastify for performance-critical gateway/edge services.[^3]

### 3.2 Clean Architecture Layers

Every service follows strict layered architecture — dependencies only point inward:

```
┌─────────────────────────────────────┐
│      Infrastructure Layer           │  ← Redis, DB, HTTP, external APIs
├─────────────────────────────────────┤
│      Application Layer              │  ← Use cases, commands, queries
├─────────────────────────────────────┤
│      Domain Layer                   │  ← Entities, value objects, domain events
├─────────────────────────────────────┤
│      Ports (Interfaces)             │  ← Repository interfaces, service interfaces
└─────────────────────────────────────┘
```

Domain layer has **zero** infrastructure dependencies. Infrastructure layer implements domain interfaces. This enables testing domain logic without any I/O.[^38][^39][^40]

### 3.3 Request Lifecycle Architecture

```
Client Request
    ↓
[Transport] Fastify/HTTP → WebSocket → gRPC
    ↓
[Auth Middleware] JWT verification + RBAC
    ↓
[Rate Limiter] Redis sliding window per client
    ↓
[Request Validation] Zod schema validation (fail fast)
    ↓
[Route Handler / Controller]
    ↓
[Use Case / Application Service]
    ↓
[Domain Logic]
    ↓
[Repository / Port]
    ↓
[Infrastructure] DB / Redis / External API
    ↓
[Response Serialization] Typed response schema
    ↓
[Response Middleware] Correlation ID, timing headers
    ↓
Client Response
```

### 3.4 Microservice Communication Patterns

Each communication pattern has a specific use case:[^41]

| Pattern | Use Case | Implementation |
|---------|---------|----------------|
| **tRPC** | Internal TypeScript service-to-service | tRPC client + shared router types |
| **REST/OpenAPI** | Public or polyglot consumers | Fastify + OpenAPI plugin |
| **gRPC** | High-throughput service mesh | `@grpc/grpc-js` + Protobuf |
| **BullMQ jobs** | Async background processing | Redis Streams + BullMQ[^6][^42] |
| **Redis Pub/Sub** | Event fan-out, real-time | `ioredis` SUBSCRIBE/PUBLISH |
| **Redis Streams** | Durable event log, consumer groups | `ioredis` XADD/XREAD/XGROUP |

### 3.5 Feature-Based Folder Structure (Per Service)

```
src/
├── main.ts              # Bootstrap + OpenTelemetry init (MUST be first import)
├── app.module.ts        # NestJS root module
├── features/
│   ├── users/
│   │   ├── domain/
│   │   │   ├── user.entity.ts
│   │   │   ├── user.repository.ts      # Interface (Port)
│   │   │   └── user.errors.ts
│   │   ├── application/
│   │   │   ├── create-user.command.ts
│   │   │   ├── get-user.query.ts
│   │   │   └── user.service.ts
│   │   ├── infrastructure/
│   │   │   ├── user.prisma.repository.ts
│   │   │   └── user.cache.repository.ts
│   │   └── presentation/
│   │       ├── user.controller.ts
│   │       ├── user.dto.ts             # Zod schemas → types
│   │       └── user.module.ts
├── shared/
│   ├── filters/          # Global exception filters
│   ├── guards/           # Auth guards
│   ├── interceptors/     # Logging, timing, correlation
│   └── pipes/            # Global validation pipe (Zod)
└── health/               # Liveness + readiness endpoints
```

**Step outputs:**
- [ ] Fastify/NestJS bootstrapped with Fastify adapter[^2][^3]
- [ ] Clean Architecture layers enforced via ESLint rules (no cross-layer imports)
- [ ] Global validation pipe using Zod
- [ ] Correlation ID middleware on all requests
- [ ] Feature-based module structure[^43]
- [ ] Response serialization with JSON schema[^2]

***

## Phase 4: Redis Architecture & Patterns

**Goal:** A Redis integration that is atomic, resilient, observable, and correctly modeled for distributed concurrency.

### 4.1 Redis Client Architecture

```typescript
// packages/redis/src/client.ts
import { Redis, type RedisOptions } from 'ioredis';
import CircuitBreaker from 'opossum';

// Singleton pattern — one connection per process
export function createRedisClient(config: RedisOptions): Redis {
  return new Redis({
    ...config,
    retryStrategy(times) {
      if (times > 5) return null; // Give up after 5 retries
      return Math.min(times * 200, 2000); // Exponential backoff
    },
    maxRetriesPerRequest: 1,
    enableAutoPipelining: true, // Auto-batch sequential commands
    lazyConnect: true,          // Don't connect until first command
  });
}

// Circuit breaker wrapping all Redis commands
export function createRedisBreaker(client: Redis) {
  return new CircuitBreaker(
    async (cmd: keyof Redis, ...args: unknown[]) =>
      (client[cmd] as Function)(...args),
    {
      timeout: 500,                    // Command timeout
      errorThresholdPercentage: 50,   // Open after 50% failures
      resetTimeout: 30_000,            // Half-open after 30s
      volumeThreshold: 10,             // Minimum calls before opening
    }
  )
    .on('open', () => logger.warn('Redis circuit OPEN'))
    .on('halfOpen', () => logger.info('Redis circuit HALF-OPEN'))
    .on('close', () => logger.info('Redis circuit CLOSED'))
    .fallback(() => null);
}
```

### 4.2 Redis Usage Patterns (with Code Templates)

**Pattern 1: Distributed Rate Limiting (Sliding Window)**
```typescript
async function slidingWindowRateLimit(
  client: Redis,
  key: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number }> {
  const now = Date.now();
  const windowStart = now - windowMs;
  
  const pipeline = client.pipeline();
  pipeline.zremrangebyscore(key, '-inf', windowStart);  // Remove expired
  pipeline.zadd(key, now, `${now}-${Math.random()}`);  // Add current
  pipeline.zcard(key);                                   // Count in window
  pipeline.pexpire(key, windowMs);                      // Set TTL
  
  const results = await pipeline.exec();
  const count = results?.[^2]?.[^1] as number;
  
  return { allowed: count <= limit, remaining: Math.max(0, limit - count) };
}
```

**Pattern 2: Distributed Lock (Redlock algorithm)**
```typescript
import Redlock from 'redlock';

const redlock = new Redlock([client], {
  retryCount: 3,
  retryDelay: 200,
  retryJitter: 100,
});

async function withDistributedLock<T>(
  resource: string,
  ttlMs: number,
  fn: () => Promise<T>
): Promise<T> {
  const lock = await redlock.acquire([`lock:${resource}`], ttlMs);
  try {
    return await fn();
  } finally {
    await lock.release();
  }
}
```

**Pattern 3: Cache-Aside with Stampede Protection**
```typescript
// Probabilistic early expiration to prevent thundering herd
async function cachedFetch<T>(
  client: Redis,
  key: string,
  ttlMs: number,
  fetch: () => Promise<T>
): Promise<T> {
  const cached = await client.get(key);
  if (cached) {
    const { value, expiresAt, beta } = JSON.parse(cached);
    // Probabilistic early refresh: re-fetch before expiry to prevent stampede
    const now = Date.now();
    const delta = (ttlMs / 1000) * Math.log(Math.random());
    if (now - beta * delta < expiresAt) return value;
  }
  
  const value = await fetch();
  const expiresAt = Date.now() + ttlMs;
  await client.setex(key, ttlMs / 1000, JSON.stringify({ value, expiresAt, beta: 1 }));
  return value;
}
```

### 4.3 Redis Pub/Sub vs Streams Decision

| Feature | Pub/Sub | Redis Streams |
|---------|---------|---------------|
| Message durability | None (fire-and-forget) | Persistent, replayable |
| Consumer groups | No | Yes |
| Message acknowledgment | No | Yes (XACK) |
| Backpressure | No | Yes (XPENDING) |
| Best for | Ephemeral broadcasts | Durable event logs |

Use **Pub/Sub** for: live notifications, cache invalidation signals, presence updates.
Use **Streams** for: anything that needs durability, audit trail, exactly-once semantics.[^44][^41]

### 4.4 BullMQ Job Queue Architecture

```typescript
// Typed job definitions
interface EmailJob { to: string; subject: string; template: string; data: Record<string, unknown> }
interface ImageJob { url: string; operations: ImageOperation[]; outputFormat: 'webp' | 'png' | 'jpg' }

// Queue factory with production defaults
const emailQueue = createQueue<EmailJob>('email', {
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: { count: 1000, age: 24 * 3600 },
    removeOnFail: { count: 5000, age: 7 * 24 * 3600 },
  },
});
```

**Step outputs:**
- [ ] `packages/redis` with typed client wrapper + circuit breaker[^45][^46]
- [ ] Rate limiting middleware using Redis sliding window[^47]
- [ ] Distributed lock implementation (Redlock)
- [ ] Cache-aside pattern with stampede protection
- [ ] BullMQ queue factory with typed jobs[^6][^42]
- [ ] Redis health check registered in liveness/readiness[^48]
- [ ] Redis metrics (hit rate, connection pool, ops/sec) emitted via OpenTelemetry

***

## Phase 5: API Design & Contract-First Development

**Goal:** APIs that are impossible to misuse, self-documenting, and generate clients automatically.

### 5.1 Contract-First Workflow

```
Design API Contract (TypeSpec / OpenAPI YAML)
    ↓
Generate TypeScript types + validation schemas
    ↓
Implement route handlers against generated types
    ↓
Automated contract tests (Pact or Schemathesis)
    ↓
Generate client SDKs for consumers
```

### 5.2 API Style Decision Tree

```
Is this a TypeScript-only monorepo internal API?
  └─ YES → Use tRPC
  └─ NO → Is this a public API with multi-language consumers?
        └─ YES → Use OpenAPI/REST
        └─ NO → Are there rich, variable data requirements?
              └─ YES → Consider GraphQL
              └─ NO → Is it high-throughput service-to-service?
                    └─ YES → Use gRPC
                    └─ NO → Use REST
```

### 5.3 tRPC Setup (Internal APIs)

```typescript
// packages/core/src/trpc/router.ts
import { initTRPC, TRPCError } from '@trpc/server';
import { z } from 'zod';

const t = initTRPC.context<Context>().create({
  transformer: SuperJSON, // Handles Date, Map, Set serialization
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

// Middleware chain
const isAuthenticated = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(isAuthenticated);
```

### 5.4 OpenAPI Contract-First (Public APIs)

Use **TypeSpec** (Microsoft's open-source API description language) to define contracts in TypeScript-like syntax that compiles to OpenAPI 3.1, JSON Schema, and client code:[^16]

```typespec
import "@typespec/http";
using TypeSpec.Http;

@service({ title: "User Service", version: "1.0.0" })
namespace UserService;

model User {
  id: string;
  email: string;
  createdAt: utcDateTime;
}

model CreateUserRequest {
  email: string;
  @minLength(2) name: string;
}

@route("/users")
interface Users {
  @post create(@body body: CreateUserRequest): User | BadRequestResponse;
  @get @route("/{id}") get(@path id: string): User | NotFoundResponse;
}
```

### 5.5 Versioning Strategy

- **URL versioning** (`/api/v1/`, `/api/v2/`) for major breaking changes
- **Header versioning** (`Accept: application/vnd.api+json;version=2`) for fine-grained control
- Never remove a version without a deprecation period with telemetry tracking actual usage

**Step outputs:**
- [ ] tRPC router tree with typed procedures + Zod validation[^12][^14]
- [ ] OpenAPI 3.1 spec generated from TypeSpec or Fastify JSON Schema[^17][^16]
- [ ] API versioning strategy implemented
- [ ] Contract tests (Pact for consumer-driven contracts)
- [ ] Auto-generated client SDKs via `openapi-ts`[^15]
- [ ] Swagger UI / Scalar served in non-production environments

***

## Phase 6: Database Layer

**Goal:** A type-safe, performant, and evolvable data layer with correct transaction semantics.

### 6.1 Prisma for Schema & Migrations

```prisma
// packages/database/prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
  output   = "../src/generated"
}

model User {
  id        String    @id @default(cuid())
  email     String    @unique
  name      String?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  posts     Post[]
  @@index([email])
}
```

### 6.2 Drizzle for Query Execution

```typescript
// packages/database/src/schema.ts — SQL-mirroring TypeScript schema
import { pgTable, text, timestamp, index } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';

export const users = pgTable('User', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  email: text('email').notNull().unique(),
  name: text('name'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
}, (t) => ({
  emailIdx: index('user_email_idx').on(t.email),
}));

// Complex query — full control over SQL
export async function getUsersWithPostCount(db: DrizzleDB) {
  return db
    .select({
      id: users.id,
      email: users.email,
      postCount: sql<number>`count(${posts.id})::int`,
    })
    .from(users)
    .leftJoin(posts, eq(users.id, posts.authorId))
    .groupBy(users.id)
    .orderBy(desc(sql`count(${posts.id})`));
}
```

### 6.3 Repository Pattern

```typescript
// Domain interface (Port) — no infrastructure coupling
interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  save(user: User): Promise<void>;
  delete(id: string): Promise<void>;
}

// Infrastructure implementation
class DrizzleUserRepository implements UserRepository {
  constructor(private db: DrizzleDB, private cache: RedisClient) {}
  
  async findById(id: string): Promise<User | null> {
    return cachedFetch(this.cache, `user:${id}`, 300_000, () =>
      this.db.select().from(users).where(eq(users.id, id)).limit(1)
        .then(rows => rows ?? null)
    );
  }
}
```

### 6.4 CQRS Pattern

For services with read/write asymmetry or complex querying, apply CQRS:[^49][^50]

- **Write side**: Validates commands → applies domain logic → persists event → publishes to Redis Streams
- **Read side**: Consumes events → projects into read-optimized view → stores in Redis or read DB

**Step outputs:**
- [ ] Prisma schema + migrations pipeline[^8]
- [ ] Drizzle for query execution (complex reads)[^8]
- [ ] Repository interfaces in domain layer
- [ ] Infrastructure implementations behind interfaces
- [ ] Transactions wrapped in domain operations
- [ ] CQRS pattern for high-traffic read paths[^50][^49]
- [ ] Read-model cache invalidation via Redis Streams

***

## Phase 7: Resilience Engineering

**Goal:** A system that degrades gracefully, recovers automatically, and never takes down its dependencies.

### 7.1 The Resilience Stack (in order, outermost to innermost)

```
Incoming Request
    ↓
[^1] Global Rate Limiter       (Redis sliding window, per IP/user)
    ↓
[^2] Request Timeout           (30s hard deadline, configurable per route)
    ↓
[^3] Circuit Breaker           (Opossum, per downstream dependency)
    ↓
[^4] Retry with Backoff        (exponential + jitter, idempotent ops only)
    ↓
[^5] Bulkhead                  (resource isolation per dependency)
    ↓
[^6] Fallback / Degraded Mode  (cached stale data, default response)
    ↓
[^7] Dead Letter Queue         (failed jobs survive in BullMQ)
    ↓
Downstream Service / DB / Redis
```

### 7.2 Circuit Breaker Configuration Reference

```typescript
// packages/redis/src/circuit-breaker.ts
const CIRCUIT_CONFIGS = {
  redis: { timeout: 500, errorThresholdPercentage: 50, resetTimeout: 30_000 },
  database: { timeout: 5_000, errorThresholdPercentage: 25, resetTimeout: 60_000 },
  externalApi: { timeout: 3_000, errorThresholdPercentage: 40, resetTimeout: 45_000 },
} as const;
```

### 7.3 Graceful Shutdown (Zero-Downtime Deployments)

```typescript
// src/main.ts — required for Kubernetes rolling updates
let isShuttingDown = false;

process.on('SIGTERM', async () => {
  isShuttingDown = true;           // Readiness probe fails → removed from LB
  logger.info('SIGTERM received — starting graceful shutdown');
  
  // 1. Stop accepting new connections
  await httpServer.close();
  
  // 2. Wait for in-flight requests (terminationGracePeriodSeconds - 2s)
  await sleep(10_000);
  
  // 3. Drain job queue workers
  await Promise.all(workers.map(w => w.close()));
  
  // 4. Close DB connections
  await prisma.$disconnect();
  
  // 5. Close Redis connections
  await redis.quit();
  
  // 6. Flush telemetry
  await otelSdk.shutdown();
  
  logger.info('Graceful shutdown complete');
  process.exit(0);
});

// Health endpoints
app.get('/health/live', () => ({ status: 'ok', uptime: process.uptime() }));
app.get('/health/ready', () => {
  if (isShuttingDown) return reply.status(503).send({ ready: false });
  // Check Redis + DB connectivity...
  return { ready: true };
});
```

### 7.4 Idempotency Keys

Every mutating operation exposed via API must support idempotency keys to enable safe client retries:

```typescript
// Middleware: check Redis for duplicate request
async function idempotencyMiddleware(req, reply, next) {
  const key = req.headers['idempotency-key'];
  if (key) {
    const cached = await redis.get(`idem:${key}`);
    if (cached) return reply.status(200).send(JSON.parse(cached));
  }
  // After handler: cache response
  reply.addHook('onSend', async (req, reply, payload) => {
    if (key && reply.statusCode < 400) {
      await redis.setex(`idem:${key}`, 86400, payload);
    }
  });
}
```

**Step outputs:**
- [ ] Multi-layer resilience stack implemented[^46][^51][^45]
- [ ] Rate limiting (global + per-route + per-user)[^51][^47]
- [ ] Circuit breakers for Redis, DB, and external APIs[^45][^46]
- [ ] Retry with exponential backoff + full jitter
- [ ] Bulkhead isolation (separate connection pools per dependency)
- [ ] Graceful shutdown with probe-aware drain[^52][^53][^48]
- [ ] Idempotency key middleware for POST/PUT/PATCH
- [ ] BullMQ dead letter queues for failed jobs[^42]

***

## Phase 8: Observability

**Goal:** Complete system visibility through the three pillars: traces, metrics, and logs — all correlated by trace ID.

### 8.1 OpenTelemetry Bootstrap (Must be First Import)

```typescript
// src/instrumentation.ts — import before everything else
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

const sdk = new NodeSDK({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: process.env.SERVICE_NAME ?? 'unknown',
    [ATTR_SERVICE_VERSION]: process.env.SERVICE_VERSION ?? '0.0.0',
    environment: process.env.NODE_ENV,
  }),
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter(),
    exportIntervalMillis: 10_000,
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false }, // Too noisy
    }),
  ],
});

sdk.start();
process.on('SIGTERM', () => sdk.shutdown());
```



### 8.2 Structured Logging (Pino)

Pino is the fastest Node.js logger — structured JSON output, zero-overhead for disabled log levels:

```typescript
// packages/observability/src/logger.ts
import pino from 'pino';
import { trace } from '@opentelemetry/api';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  formatters: {
    log(obj) {
      // Inject trace context into every log line for correlation
      const span = trace.getActiveSpan();
      if (span) {
        const ctx = span.spanContext();
        return { ...obj, traceId: ctx.traceId, spanId: ctx.spanId };
      }
      return obj;
    },
  },
  redact: ['req.headers.authorization', '*.password', '*.creditCard'],
});
```

### 8.3 Metrics Taxonomy

Define metrics that answer operational and business questions:

```
# RED Method (Request-oriented)
http_requests_total{method, route, status}           # Rate
http_request_duration_seconds{method, route, quantile} # Latency (p50, p95, p99)
http_request_errors_total{method, route, error_type}  # Error rate

# USE Method (Resource-oriented)  
redis_pool_connections{state}      # Utilization
redis_operations_total{command}    # Saturation
db_query_duration_seconds          # Errors

# Business metrics
jobs_processed_total{queue, status}
cache_hit_ratio{cache_name}
active_users_gauge
```

### 8.4 Distributed Trace Context Propagation

Every async operation (BullMQ jobs, Redis Pub/Sub messages, scheduled tasks) must carry trace context:

```typescript
// Inject trace into BullMQ job data
async function enqueueWithTrace<T>(queue: Queue<T>, name: string, data: T) {
  const traceContext = {};
  propagation.inject(context.active(), traceContext);
  return queue.add(name, { ...data, _traceContext: traceContext });
}

// Restore trace in worker
async function processWithTrace<T>(job: Job<T & { _traceContext?: unknown }>, fn: () => Promise<void>) {
  const parentContext = propagation.extract(context.active(), job.data._traceContext ?? {});
  return context.with(parentContext, fn);
}
```

### 8.5 Local Observability Stack (Docker Compose)

```yaml
# infra/docker/observability.yml
services:
  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    ports: ["4318:4318"]
    
  jaeger:
    image: jaegertracing/all-in-one:latest
    ports: ["16686:16686"]  # UI
    
  prometheus:
    image: prom/prometheus:latest
    ports: ["9090:9090"]
    
  grafana:
    image: grafana/grafana:latest
    ports: ["3000:3000"]
    
  loki:
    image: grafana/loki:latest  # Log aggregation
```

**Step outputs:**
- [ ] OpenTelemetry SDK bootstrapped before all imports[^19]
- [ ] Auto-instrumentation: HTTP, Redis, PostgreSQL, gRPC
- [ ] Custom spans for business-critical operations[^19]
- [ ] Structured JSON logging with Pino + trace ID injection
- [ ] RED + USE metrics emitted per service[^19]
- [ ] Trace context propagated through BullMQ jobs and Redis Streams
- [ ] Local observability stack in Docker Compose
- [ ] Grafana dashboards as code (via `grafana-foundation-sdk`)
- [ ] Alerting rules: p99 > 500ms, error rate > 1%, queue depth > threshold

***

## Phase 9: Testing Architecture

**Goal:** A test suite that catches bugs before production, runs fast enough to not slow development, and covers the entire system boundary.

### 9.1 Testing Pyramid

```
                    ┌─────────────────┐
                    │    E2E Tests    │  5% — Full stack, real infra
                    │  (Playwright)   │
                ┌───┴─────────────────┴───┐
                │  Integration Tests      │  20% — Real DB/Redis, HTTP calls
                │  (Vitest + Testcontainers│
            ┌───┴─────────────────────────┴───┐
            │        Contract Tests           │  10% — API contracts (Pact)
            ├─────────────────────────────────┤
            │         Unit Tests              │  65% — Pure functions, domain logic
            │         (Vitest)                │
            └─────────────────────────────────┘
```

### 9.2 Vitest Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      thresholds: {
        lines: 80,
        branches: 75,
        functions: 80,
        statements: 80,
      },
    },
    typecheck: { enabled: true },       // Type-check test files too
    sequence: { concurrent: true },      // Run test files in parallel
  },
});
```

### 9.3 Integration Tests with Testcontainers

```typescript
// Real Redis and Postgres in Docker — no mocks for infrastructure
import { GenericContainer, StartedTestContainer } from 'testcontainers';

describe('UserRepository', () => {
  let redisContainer: StartedTestContainer;
  
  beforeAll(async () => {
    redisContainer = await new GenericContainer('redis:7-alpine')
      .withExposedPorts(6379)
      .start();
  });

  afterAll(() => redisContainer.stop());
  
  it('caches user on first fetch and serves from cache on second', async () => {
    // Test against real Redis, not mocks
  });
});
```

### 9.4 Testing Conventions

- **Unit tests**: Test domain logic in isolation. No I/O. `vi.mock()` only at boundaries.
- **Integration tests**: Test repositories, services, and use cases with real infrastructure via Testcontainers.
- **Contract tests**: Pact for consumer-driven contract testing between services.
- **E2E tests**: Full HTTP calls against a locally running Docker Compose stack.
- **Chaos tests**: Kill Redis, introduce network delays, assert degraded-mode behavior.
- **Performance tests**: k6 or Artillery load tests with SLO assertions.

### 9.5 Golden Rules for Distributed System Testing

1. Never mock Redis or DB in integration tests — use real containers
2. Test error paths as rigorously as happy paths
3. Test idempotency: calling the same mutation twice should produce the same result
4. Test circuit breaker state transitions explicitly
5. Test graceful shutdown: in-flight requests must complete during SIGTERM

**Step outputs:**
- [ ] Vitest 4 with type-checking enabled[^20][^22][^23]
- [ ] Coverage thresholds enforced in CI (80% lines minimum)
- [ ] Testcontainers for Redis and PostgreSQL integration tests
- [ ] Pact contract tests for service boundaries
- [ ] Property-based tests for domain logic (fast-check)
- [ ] Performance benchmarks with k6
- [ ] Test factories and fixtures in `packages/testing`[^54]
- [ ] Mutation testing (Stryker) for critical domain modules

***

## Phase 10: Security Architecture

**Goal:** Defense-in-depth that addresses OWASP Top 10 systematically, with security as code.

### 10.1 Security Layer Matrix

| Layer | Control | Implementation |
|-------|---------|----------------|
| **Transport** | TLS 1.3 termination | Kubernetes Ingress / Load Balancer |
| **Authentication** | JWT (RS256) / OAuth 2.0 | `jose` library, short-lived tokens |
| **Authorization** | RBAC + ABAC | Custom NestJS guards + Zod-validated roles |
| **Input validation** | Zod schemas at every boundary | Global validation pipe[^9][^10][^11] |
| **Rate limiting** | Sliding window per IP + user | Redis INCR[^47] |
| **HTTP headers** | Security headers | Helmet.js[^32] |
| **SQL injection** | Parameterized queries | Prisma + Drizzle ORM[^8] |
| **Secrets** | Vault / AWS Secrets Manager | Never in env files in production |
| **Dependencies** | Vulnerability scanning | `npm audit` + Snyk in CI[^55] |
| **Container** | Non-root user, read-only FS | Dockerfile hardening |
| **Supply chain** | Pinned package versions | `pnpm-lock.yaml` committed |

### 10.2 JWT Best Practices

```typescript
// Use asymmetric RS256 — public key for verify, private key for sign
// Short-lived access tokens (15 min) + long-lived refresh tokens (7 days)
// Store refresh tokens in Redis with device fingerprint
// Implement token rotation on every refresh
// Maintain blocklist of revoked access tokens in Redis (until expiry)
```

### 10.3 Dockerfile Hardening

```dockerfile
FROM node:22-alpine AS base
# Run as non-root
RUN addgroup -g 1001 nodejs && adduser -S -u 1001 nextjs
USER nextjs

# Multi-stage build — production image has no dev deps, no source maps
FROM base AS runner
COPY --chown=nextjs:nodejs dist/ ./
EXPOSE 3000
CMD ["node", "main.js"]
```

### 10.4 Dependency Security Pipeline

```yaml
# .github/workflows/security.yml
- name: Audit dependencies
  run: pnpm audit --audit-level=high
  
- name: SAST scan
  uses: returntocorp/semgrep-action@v1
  
- name: Container scan
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: ${{ env.IMAGE }}
    severity: HIGH,CRITICAL
```

**Step outputs:**
- [ ] Helmet.js HTTP security headers[^32]
- [ ] JWT with RS256, token rotation, Redis blocklist
- [ ] Zod validation at all external boundaries[^10][^11][^9]
- [ ] Role-based access control with explicit permission checks[^33]
- [ ] npm audit + Snyk in CI[^55]
- [ ] Trivy container image scanning in CI
- [ ] Secrets management (no hardcoded values)
- [ ] Non-root Docker containers with read-only filesystem
- [ ] CORS strictly configured (allowlist, not `*`)

***

## Phase 11: CI/CD Pipelines & Developer Experience

**Goal:** A developer who can go from `git clone` to running tests in under 5 minutes, and from merge to production in under 15 minutes.

### 11.1 GitHub Actions Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Pull Request Event                        │
├─────────────────────────────────────────────────────────────┤
│  Job: quality-gates (fast, parallel)                        │
│   ├── tsc --noEmit (type check)                    │
│   ├── eslint (linting)                                      │
│   ├── prettier --check (formatting)                         │
│   ├── vitest run --coverage (unit tests)                    │
│   └── pnpm audit --audit-level=high (security)             │
├─────────────────────────────────────────────────────────────┤
│  Job: integration-tests (needs: quality-gates)              │
│   ├── Testcontainers: Redis + PostgreSQL                    │
│   ├── vitest run --project=integration                      │
│   └── Pact contract tests                                   │
├─────────────────────────────────────────────────────────────┤
│  Job: build (needs: quality-gates, parallel)                │
│   ├── turbo build (cached)                                  │
│   ├── docker buildx (multi-arch)                            │
│   └── trivy scan (on build image)                          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      Main Branch Push                        │
├─────────────────────────────────────────────────────────────┤
│  Job: release (on merged PR)                                │
│   ├── changesets version                                    │
│   ├── docker push (registry)             │
│   └── argocd sync (GitOps deploy)                          │
└─────────────────────────────────────────────────────────────┘
```

### 11.2 Turborepo CI Optimization

```json
// turbo.json — only rebuild what changed
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"],
      "cache": true
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"],
      "cache": true
    },
    "typecheck": {
      "dependsOn": ["^build"],
      "cache": true
    }
  },
  "remoteCache": { "enabled": true }
}
```

### 11.3 Local Development Experience

```yaml
# docker-compose.dev.yml — everything needed to develop locally
services:
  redis:
    image: redis/redis-stack:latest
    ports: ["6379:6379", "8001:8001"]  # 8001 = RedisInsight UI
    
  postgres:
    image: postgres:16-alpine
    ports: ["5432:5432"]
    
  otel-collector:
    # ... observability stack
    
  maildev:
    image: maildev/maildev:latest
    ports: ["1080:1080"]  # Web UI for email testing
```

```bash
# Developer workflow
pnpm install          # < 30 seconds with cache
docker compose up -d  # Spin up infra
pnpm dev              # Start all services with hot reload (tsx watch)
pnpm test:watch       # Vitest watch mode — < 1s feedback
```

### 11.4 Deployment Strategy (Zero-Downtime)

- **Blue-Green**: Maintain two production environments; switch traffic atomically[^56][^57]
- **Canary**: Route 5% → 25% → 100% of traffic to new version based on error rate SLO
- **Feature Flags**: Decouple deploy from release using LaunchDarkly or Unleash

**Step outputs:**
- [ ] GitHub Actions with Turborepo caching[^25][^31][^24]
- [ ] Quality gates: typecheck + lint + test + audit in parallel
- [ ] Docker multi-arch builds (amd64 + arm64)[^25]
- [ ] Trivy security scanning on every image
- [ ] GitOps with ArgoCD (manifest in git = production state)[^26]
- [ ] `docker-compose.dev.yml` with full local stack
- [ ] Hot reload with `tsx watch` / `nodemon`
- [ ] Changesets for automated semantic versioning[^36]

***

## Phase 12: Cloud Deployment, Kubernetes, and IaC

**Goal:** Infrastructure that is reproducible, auditable, self-healing, and scales automatically.

### 12.1 Kubernetes Manifest Anatomy (per service)

Every service deployment requires all of the following:[^58][^53][^59][^52][^48]

```yaml
apiVersion: apps/v1
kind: Deployment
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 0      # Zero downtime
      maxSurge: 1
  template:
    spec:
      terminationGracePeriodSeconds: 60
      containers:
        - name: api
          resources:
            requests: { memory: "256Mi", cpu: "100m" }
            limits:   { memory: "512Mi", cpu: "500m" }
          
          startupProbe:
            httpGet: { path: /health/ready, port: 3000 }
            failureThreshold: 30
            periodSeconds: 5
            
          livenessProbe:
            httpGet: { path: /health/live, port: 3000 }
            periodSeconds: 10
            timeoutSeconds: 5
            failureThreshold: 3
            
          readinessProbe:
            httpGet: { path: /health/ready, port: 3000 }
            periodSeconds: 5
            timeoutSeconds: 3
            failureThreshold: 2
            
          env:
            - name: NODE_ENV
              value: production
            - name: REDIS_URL
              valueFrom:
                secretKeyRef: { name: redis-secret, key: url }
```

### 12.2 Pulumi IaC (TypeScript)

```typescript
// infra/pulumi/index.ts — Infrastructure as TypeScript
import * as aws from '@pulumi/aws';
import * as k8s from '@pulumi/kubernetes';

const cluster = new aws.eks.Cluster('main', {
  version: '1.30',
  nodeGroups: [{
    instanceType: 't3.medium',
    minSize: 2,
    maxSize: 10,
    desiredSize: 3,
  }],
});

// Redis cluster (ElastiCache)
const redisCluster = new aws.elasticache.ReplicationGroup('redis', {
  replicationGroupDescription: 'Redis cluster',
  engine: 'redis',
  engineVersion: '8.0',
  nodeType: 'cache.r7g.large',
  numCacheClusters: 3,
  automaticFailoverEnabled: true,
  multiAzEnabled: true,
});

// All Kubernetes manifests as typed Pulumi resources
const deployment = new k8s.apps.v1.Deployment('api', {
  spec: {
    replicas: 3,
    // ... (same as above Kubernetes manifest)
  },
}, { provider: clusterProvider });
```

### 12.3 Multi-Environment Strategy

```
environments/
├── local/       docker-compose.dev.yml        — Developer laptop
├── ci/          docker-compose.ci.yml          — GitHub Actions
├── staging/     k8s/ + Pulumi staging stack   — Pre-production
└── production/  k8s/ + Pulumi production stack — Real traffic
```

### 12.4 Redis in Production (High-Availability)

| Setup | Throughput | Availability | Use Case |
|-------|-----------|--------------|---------|
| Single instance | ~1M ops/sec | 99.9% | Dev/staging |
| Redis Sentinel | ~1M ops/sec | 99.99% | Simple HA |
| Redis Cluster (sharded) | N×1M ops/sec | 99.99% | High-throughput production[^60][^4] |
| Redis Enterprise | Custom | 99.999% | Regulated/critical |

### 12.5 HPA (Horizontal Pod Autoscaling)

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
spec:
  minReplicas: 2
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target: { type: Utilization, averageUtilization: 70 }
    - type: Pods
      pods:
        metric: { name: http_requests_per_second }
        target: { type: AverageValue, averageValue: "1000" }
```

**Step outputs:**
- [ ] Kubernetes Deployments with all three probe types[^53][^59][^52][^48][^58]
- [ ] HPA based on CPU + custom metrics (Prometheus adapter)
- [ ] Network Policies (default deny, explicit allow)
- [ ] PodDisruptionBudgets (minimum available during maintenance)
- [ ] Pulumi TypeScript IaC for full cloud stack[^28][^29][^30]
- [ ] Redis Cluster or Redis Enterprise for production HA[^60][^4]
- [ ] ArgoCD ApplicationSet for GitOps per environment[^26]
- [ ] Multi-region failover strategy
- [ ] Cost optimization: Spot instances for non-critical worker services

***

## Cross-Cutting Concerns (Apply Throughout All Phases)

### Naming Conventions

| Artifact | Convention | Example |
|----------|-----------|---------|
| Files | kebab-case | `user-repository.ts` |
| Classes | PascalCase | `UserRepository` |
| Interfaces | PascalCase | `IUserRepository` |
| Type aliases | PascalCase | `UserId` |
| Functions | camelCase | `findUserById` |
| Constants | SCREAMING_SNAKE | `MAX_RETRY_ATTEMPTS` |
| Zod schemas | PascalCase + `Schema` | `CreateUserSchema` |
| Env variables | SCREAMING_SNAKE | `REDIS_CLUSTER_URL` |

### Error Handling Strategy

```typescript
// Typed domain errors — never throw raw Error objects
class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number,
    public readonly context?: Record<string, unknown>
  ) { super(message); }
}

class UserNotFoundError extends DomainError {
  constructor(id: string) {
    super(`User ${id} not found`, 'USER_NOT_FOUND', 404, { id });
  }
}

// Result type pattern — no throws in application layer
type Result<T, E = DomainError> = { ok: true; value: T } | { ok: false; error: E };
```

### Documentation Standards

- Every public function has a JSDoc comment with `@param`, `@returns`, `@throws`
- ADRs (Architecture Decision Records) in `/docs/adr/` for major decisions
- OpenAPI spec auto-deployed to developer portal
- `CHANGELOG.md` auto-generated by Changesets

***

## Execution Order Summary

| # | Phase | Duration Est. | Key Deliverables |
|---|-------|--------------|-----------------|
| 1 | Foundational Setup | Session 1 | Monorepo, config validation, Git hooks |
| 2 | TypeScript Config | Session 2 | Strict tsconfig, ESLint rules, type conventions |
| 3 | Core Framework | Session 3 | Fastify/NestJS, Clean Architecture, request lifecycle |
| 4 | Redis Architecture | Session 4 | Client, circuit breaker, rate limiting, BullMQ |
| 5 | API Design | Session 5 | tRPC, OpenAPI/TypeSpec, versioning, contract tests |
| 6 | Database Layer | Session 6 | Prisma + Drizzle, repository pattern, CQRS |
| 7 | Resilience | Session 7 | Circuit breakers, graceful shutdown, idempotency |
| 8 | Observability | Session 8 | OpenTelemetry, Pino logging, Grafana dashboards |
| 9 | Testing | Session 9 | Vitest, Testcontainers, Pact, k6 load tests |
| 10 | Security | Session 10 | OWASP, JWT, secrets, container hardening |
| 11 | CI/CD & DevEx | Session 11 | GitHub Actions, GitOps, local dev stack |
| 12 | Cloud & Kubernetes | Session 12 | Pulumi IaC, Kubernetes probes, HPA, multi-region |

***

## Questions to Resolve Before Starting (Ask if Unclear)

Before beginning Phase 1, confirm the following:

1. **Team size & experience** — affects choice of NestJS vs raw Fastify; DI overhead is justified for teams > 3
2. **Public vs internal API surface** — determines tRPC vs REST/OpenAPI as primary API style
3. **Expected traffic profile** — orders of magnitude matter for Redis topology (single/sentinel/cluster)
4. **Cloud provider** — AWS (EKS/ElastiCache), GCP (GKE/Memorystore), Azure (AKS/Redis Cache); Pulumi IaC is provider-specific
5. **Compliance requirements** — GDPR/HIPAA affects data residency, audit logging, and encryption at rest
6. **Existing service mesh** — adopting Istio or Linkerd changes how mTLS, circuit breaking, and observability work
7. **Monorepo vs polyrepo** — affects Turborepo scope vs GitHub Packages
8. **Database choice** — PostgreSQL is assumed throughout; MongoDB, CockroachDB, or PlanetScale require different configurations

---

## References

1. [Node.js with TypeScript: Should You Make the Switch in ...](https://www.abbacustechnologies.com/node-js-with-typescript-should-you-make-the-switch-in-2025/) - Switching to Node.js with TypeScript has both direct and indirect costs. Direct Costs: Training: Tea...

2. [Fastify vs Express vs Hono - Node.js Frameworks](https://betterstack.com/community/guides/scaling-nodejs/fastify-vs-express-vs-hono/) - Hono prioritizes TypeScript as a first-class feature. Route handlers, middleware functions, and cont...

3. [NestJS vs Fastify in 2026: Opinionated vs Minimal Backend](https://www.pkgpulse.com/blog/nestjs-vs-fastify-2026) - NestJS and Fastify serve different needs — NestJS for large team architecture, Fastify for performan...

4. [The Engineering Wisdom Behind Redis's Single-Threaded ...](https://riferrei.com/the-engineering-wisdom-behind-rediss-single-threaded-design/) - Redis 8 represents the most significant performance improvement in Redis history, with latency reduc...

5. [Adapting with developers through every era](https://redis.io/blog/redis-then-and-now-adapting-with-developers-through-every-era/) - Redis evolved from being just a caching layer to the comprehensive data platform we know today. This...

6. [How to Set Up BullMQ with TypeScript - OneUptime](https://oneuptime.com/blog/post/2026-01-21-bullmq-typescript-setup/view) - A comprehensive guide to setting up BullMQ with TypeScript for type-safe job queues, including proje...

7. [Background Job Processing in Node.js: BullMQ, Queues, and ...](https://dev.to/young_gao/background-job-processing-in-nodejs-bullmq-queues-and-worker-patterns-31d4) - BullMQ is the successor to Bull. It's built on Redis Streams, supports TypeScript natively, and hand...

8. [Prisma vs Drizzle ORM in 2026 and Why Your Database Layer ...](https://jsgurujobs.com/blog/prisma-vs-drizzle-orm-in-2026-and-why-your-database-layer-choice-affects-performance-more-than-your-framework) - Drizzle's approach is more explicit and gives you complete control over the generated SQL, including...

9. [Zod + TypeScript: Schema Validation Made Easy](https://www.telerik.com/blogs/zod-typescript-schema-validation-made-easy) - Zod is a TypeScript-first schema validation library that bridges the gap between compile-time type s...

10. [TypeScript vs Zod: Clearing up validation confusion](https://blog.logrocket.com/when-use-zod-typescript-both-developers-guide/) - Learn when to use TypeScript, Zod, or both for data validation. Avoid redundant checks and build saf...

11. [Zod Boosts Runtime Safety with Compile-Time Validation](https://www.linkedin.com/posts/abdul-halim123_typescript-webdevelopment-frontendengineering-activity-7429245641819852801-_CWI) - Runtime type safety changed how I build frontends. Here's why Zod matters. TypeScript gives us compi...

12. [REST vs GraphQL vs tRPC vs gRPC in 2026: The Definitive Guide ...](https://dev.to/pockit_tools/rest-vs-graphql-vs-trpc-vs-grpc-in-2026-the-definitive-guide-to-choosing-your-api-layer-1j8m) - Key insight: For browser-to-server calls, the performance difference between REST, GraphQL, and tRPC...

13. [REST API vs GraphQL vs tRPC in 2026 and Why Your ... - JSGuruJobs](https://jsgurujobs.com/blog/rest-api-vs-graphql-vs-trpc-in-2026-and-why-your-api-layer-choice-affects-your-team-size-more-than-your-tech-stack) - In early 2025, roughly 40% of full-stack JavaScript listings mentioned GraphQL as a requirement. By ...

14. [tRPC & End-to-End Type Safety: TypeScript API Revolution 2026](https://www.askantech.com/trpc-end-to-end-type-safety-typescript-first-apis/) - tRPC takes a completely different approach: instead of building an API layer with REST endpoints or ...

15. [Contract-First API Design - harrisoncramer.me](https://harrisoncramer.me/contract-first-api-design) - When using OpenAPI, engineers can write these contract documents first, often as YAML or JSON, befor...

16. [Doron Feldman @ NodeTLV '25 | A Practical Guide to API- ...](https://www.youtube.com/watch?v=Ban7PBQ501Q) - Key principles and benefits of API-first design for ... Gil Tayar @ NodeTLV '25 | TypeScript in Node...

17. [A Developer's Guide to API Design-First](https://apisyouwonthate.com/blog/a-developers-guide-to-api-design-first/) - API Design-First, also known as "schema-first" or "contract-first", is all about designing the inter...

18. [Instrumentation of Software Systems with OpenTelemetry for Software
  Visualization](http://arxiv.org/pdf/2411.12380.pdf) - As software systems grow in complexity, data and tools that provide valuable
insights for easier pro...

19. [Opentelemetry-Js | Terminal Skills](https://terminalskills.io/skills/opentelemetry-js) - OpenTelemetry is the vendor-neutral standard for application observability. Add tracing, metrics, an...

20. [Vitest vs Jest 30: Why 2026 is the Year of Browser-Native Testing](https://dev.to/dataformathub/vitest-vs-jest-30-why-2026-is-the-year-of-browser-native-testing-2fgb) - The release of Jest 30 in June 2025 brought a substantial number of improvements, focusing on perfor...

21. [Vitest vs Jest: Which Testing Framework Should You Choose?](https://www.testmuai.com/blog/vitest-vs-jest/) - Jest focuses on stability, extensive ecosystem support, and compatibility across various JavaScript ...

22. [Top Node.js Development Tools and Frameworks for 2025](https://intelligentfuturetech.com/blog/nodejs-development-tools-frameworks-2025/) - Testing: Vitest for unit/integration tests, Playwright for end-to-end tests. Build Tool: Vite for fr...

23. [Vitest 4 adoption guide: Overview and migrating from Jest](https://blog.logrocket.com/vitest-adoption-guide/) - Learn how Vitest 4 makes migrating from Jest painless, with codemods, faster tests, native ESM, brow...

24. [Turborepo vs Nx vs Moon: Monorepo Tools 2026 - PkgPulse](https://www.pkgpulse.com/blog/turborepo-vs-nx-vs-moon-build-tools-2026) - Turborepo is the right default for most JavaScript/TypeScript monorepos — simple setup, excellent ca...

25. [Build a CI/CD with GitHub Actions to Deploy a Node.js API](https://blog.tericcabrel.com/build-cicd-github-actions-deploy-nodejs/) - This post shows how to build a CI/CD pipeline with GitHub Actions to deploy a Node.js application on...

26. [Kubernetes vs Docker Swarm: Which One Rules in 2025?](https://empowercodes.com/articles/kubernetes-vs-docker-swarm-which-one-rules-in-2025) - In 2025, the container orchestration landscape has continued evolving rapidly. Kubernetes dominates ...

27. [Docker Swarm vs Kubernetes: Which Should You Use in 2026?](https://www.portainer.io/blog/docker-swarm-vs-kubernetes) - For new deployments in 2026, Kubernetes is the safer starting point. It has stronger ecosystem suppo...

28. [Terraform vs. Pulumi vs. CDK in 2025 - Everyday IT](https://www.ai-infra-link.com/terraform-vs-pulumi-vs-cdk-in-2025-a-comprehensive-infrastructure-as-code-comparison/) - With Pulumi, you can define infrastructure for multiple cloud providers using the same programming l...

29. [Top IaC Tools in 2025: From Terraform to Pulumi and Beyond](https://www.gocodeo.com/post/top-iac-tools-in-2025-from-terraform-to-pulumi-and-beyond) - Explore the top Infrastructure as Code tools of 2025, Terraform, Pulumi, Crossplane & more, powerful...

30. [Choosing the Best IaC Tool in 2025: Terraform, Pulumi, AWS CDK](https://www.linkedin.com/posts/huzaif-bin-israr-562b38197_devops-infrastructureascode-terraform-activity-7346484367583510528-9Bxc) - Terraform vs Pulumi vs AWS CDK Choosing the Best Infrastructure as Code Tool in 2025 If you're manag...

31. [🧠 CI/CD Pipeline for Node.js with GitHub Actions and Docker](https://www.linkedin.com/pulse/cicd-pipeline-nodejs-github-actions-docker-tejesh-kumar-gantyada-4mr1c) - In this article, we'll walk through each and every file, command, and configuration used to build a ...

32. [Node.js Security: A Developer's Ultimate Guide to Best Practices ...](https://codercrafter.in/blogs/nodejs/nodejs-security-a-developers-ultimate-guide-to-best-practices-2025) - Fortify your Node.js applications! This in-depth guide covers essential security practices, from dep...

33. [Secure Coding with OWASP Top 10 2025 - OnlineHashCrack](https://www.onlinehashcrack.com/guides/best-practices/secure-coding-with-owasp-top-10-2025.php) - Write code that resists OWASP Top 10 risks: implement parameterised queries, XSS filters, CSRF token...

34. [OWASP Node.js Best Practices Guide | Liran Tal - LinkedIn](https://www.linkedin.com/posts/talliran_owasp-nodejs-best-practices-guide-activity-7163894908880076800-vC6R) - Learn how to secure Node.js applications with OWASP's comprehensive best practices guidelines https:...

35. [Sharing TypeScript with Nx and Turborepo: An Introduction ...](https://javascript.plainenglish.io/sharing-typescript-with-nx-and-turborepo-part-1-introduction-to-monorepos-d8d54b805e46) - This series explains how to use Nx and Turborepo monorepos to share code and configuration across mu...

36. [Best Practices with Yarn, NX and Changesets](https://hackernoon.com/building-a-robust-jsts-monorepo-best-practices-with-yarn-nx-and-changesets) - Build a robust JS/TS monorepo with Yarn v4, NX & Changesets. Organize apps, features & libs, and aut...

37. [NestJS vs SonicJS vs Hono: Backend Framework ...](https://sonicjs.com/blog/nestjs-vs-sonicjs-vs-hono) - TL;DR — NestJS excels at enterprise apps with its Angular-inspired architecture but adds 500-2000ms ...

38. [lucas4tech/ts-node-clean-architecture-api-project - GitHub](https://github.com/silva4dev/ts-node-clean-architecture-api-project) - Building an API with Node.js, TypeScript using TDD, DDD, Clean Architecture, Design Patterns and SOL...

39. [clean-architecture · GitHub Topics](https://www.github-zh.com/topics/clean-architecture?l=TypeScript) - A sample project showcasing Clean Architecture and monorepo structure for designing multiple web ser...

40. [eduzera/ddd-patterns-with-clean-architecture - GitHub](https://github.com/eduzera/ddd-patterns-with-clean-architecture) - Using TypeScript has allowed us to enforce a certain level of correctness at compile-time and make o...

41. [My Favorite Microservice Design Patterns for Node.js - Bits and Pieces](https://blog.bitsrc.io/my-favorite-microservice-design-patterns-for-node-js-fe048c635d83) - Here are some useful and interesting design patterns for your microservices. The idea is that you st...

42. [How to Build a Job Queue in Node.js with BullMQ and Redis](https://oneuptime.com/blog/post/2026-01-06-nodejs-job-queue-bullmq-redis/view) - Learn to build production-ready job queues in Node.js using BullMQ and Redis, including delayed jobs...

43. [Recommended Folder Structure for Node(TS) 2025](https://dev.to/pramod_boda/recommended-folder-structure-for-nodets-2025-39jl) - A common and effective folder structure for a Node.js web application with Express in 2025 is based ...

44. [Make Your Own Message Queue with Redis and TypeScript - Upstash](https://upstash.com/blog/redis-message-queue) - In this tutorial, we're going to build a message queue from scratch using Redis lists. While there a...

45. [Building Resilient Redis Connections in Node.js - LinkedIn](https://www.linkedin.com/pulse/building-resilient-redis-connections-nodejs-lazy-loading-jayan-inryc) - To prevent overwhelming Redis during downtimes, we can use the Opossum library to implement a circui...

46. [Reliable Redis Connections in Node.js: Lazy Loading, Retry Logic ...](https://dev.to/silentwatcher_95/reliable-redis-connections-in-nodejs-lazy-loading-retry-logic-circuit-breakers-29lg) - In this blog, I'll show you how I built a resilient Redis integration in Express.js using ioredis, l...

47. [Rate Limiting with Redis and Node.js: Under the Hood - Webdock](https://webdock.io/en/docs/how-guides/javascript-guides/rate-limiting-redis-and-nodejs-under-hood) - The magic of this rate limiter lies in Redis's atomic INCR command. Imagine multiple concurrent requ...

48. [How to Implement Health Checks and Readiness Probes ...](https://oneuptime.com/blog/post/2026-01-06-nodejs-health-checks-kubernetes/view) - Learn to implement health checks and readiness probes in Node.js applications for Kubernetes, includ...

49. [Typescript API that implements CQRS & Event Sourcing - GitHub](https://github.com/yerinadler/typescript-event-sourcing-sample-app) - In this example, we use MongoDB as an event store and Redis as the read store. The commands are sent...

50. [How to Build Event Sourcing Systems in Node.js - OneUptime](https://oneuptime.com/blog/post/2026-01-26-nodejs-event-sourcing/view) - In this guide, we will build an event sourcing system from scratch in Node.js using TypeScript. We w...

51. [Fortifying Node.js APIs with Rate Limiting and Circuit Breakers](https://leapcell.io/blog/fortifying-node-js-apis-with-rate-limiting-and-circuit-breakers) - This article delves into the critical role of rate limiting and circuit breakers in building robust ...

52. [Implementing Graceful Shutdown in Node.js with Signals and ...](https://piresfernando.com/blog/graceful-shutdown-node) - In this post, we'll explore how to implement graceful shutdown in your Node.js app using Kubernetes ...

53. [Graceful shutdown with Node.js and Kubernetes](https://blog.risingstack.com/graceful-shutdown-node-js-kubernetes/) - In Kubernetes, for a proper graceful shutdown we need to add a readinessProbe to our application's D...

54. [goldbergyoni/nodejs-testing-best-practices: Beyond the ...](https://github.com/goldbergyoni/nodejs-testing-best-practices) - A detailed guide to modern testing with Node.js. 1. 50+ Best Practices List - Detailed instructions ...

55. [10 Critical Security Best Practices for Node.js Applications - LinkedIn](https://www.linkedin.com/pulse/10-critical-security-best-practices-nodejs-lessons-from-dhruv-patel-h8z8c) - Use environment variables; Never commit .env files; Rotate keys regularly ; Run npm audit regularly;...

56. [Docker Swarm vs Kubernetes - Travis CI](https://www.travis-ci.com/blog/docker-swarm-vs-kubernetes/) - Docker Swarm has Fewer Features than Kubernetes: Docker Swarm is easier to use, but it does not have...

57. [Deploy Any Node.js App to Render with Docker and ...](https://www.watadtech.om/post/tutorial-advanced-ci-cd-with-github-actions-docker-and-render) - In conclusion, this guide walks you through setting up a complete CI/CD pipeline for a Node.js app u...

58. [Kubernetes Health Checks Node.js FAQ & Answers](https://agentskb.com/kb/kubernetes_health_checks_nodejs/) - Kubernetes probe types: (1) Liveness probe - kubelet uses to know when to restart container. Checks ...

59. [Prepare Node.js apps production ready for Kubernetes](https://outshift.cisco.com/blog/in-depth-tech/nodejs-in-production) - Kubernetes provides liveness probes to detect and remedy such situations. readiness: Sometimes, appl...

60. [Redis Scaling: Architecting for High-Concurrency with Redis](https://www.linkedin.com/posts/steve-arnold-otieno_softwarearchitecture-systemdesign-redis-activity-7424354188220104704-Q2to) - ... Redis is widely used for low-latency caching. Standard cache flow ... architecture In practice: ...

