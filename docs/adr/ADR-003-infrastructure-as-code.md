# ADR-003: Infrastructure as Code — Pulumi (TypeScript)

| Field | Value |
| --- | --- |
| **Status** | Accepted |
| **Created** | 2026-03-24 |
| **Last Updated** | 2026-03-24 |
| **Author(s)** | Architecture Council |
| **Reviewers** | Architect, Skeptic, SRE, DevOps Advisor, Enterprise Architect Advisor |
| **Supersedes** | N/A |
| **Superseded By** | N/A |

## Context

We need Infrastructure as Code tooling that can provision and manage both local (k3d) and cloud (EKS/GKE/AKS) Kubernetes clusters along with supporting infrastructure (Redis/Dragonfly, PostgreSQL, MinIO/S3, monitoring stack). The IaC tool must support multiple environments with minimal duplication.

## Decision Drivers

- Single language across app and infra (TypeScript)
- Type safety for infrastructure definitions
- Local-to-cloud portability (same IaC, different configs)
- Real programming constructs (loops, conditionals, abstractions)
- Kubernetes-native provisioning
- State management reliability
- Team familiarity and onboarding

## Considered Options

### Option A: Pulumi (TypeScript)

**Pros:**

- TypeScript everywhere — shared types between app and infra code
- Real programming: loops, conditionals, functions, classes
- Compile-time error catching for infra definitions
- First-class K8s provider with full API coverage
- Stack configs for multi-environment (local, staging, prod)
- Supports all major cloud providers (AWS, GCP, Azure)
- Policy as Code (CrossGuard) for compliance

**Cons:**

- Smaller community than Terraform
- Requires a Pulumi backend (self-hosted or Pulumi Cloud)
- State locking less battle-tested than Terraform's

### Option B: Terraform (HCL)

**Pros:**

- Industry standard, largest community and module ecosystem
- Battle-tested state management and locking
- Extensive provider coverage

**Cons:**

- HCL is a separate language to learn and maintain
- No real programming constructs (loops are DSL-based, limited)
- No type safety — errors caught at plan time, not compile time
- Cannot share types with the TypeScript application
- Requires wrapper tools (Terragrunt) for DRY multi-environment configs

### Option C: CDK for Terraform (CDKTF)

**Pros:**

- TypeScript with Terraform providers
- Leverages Terraform's execution engine

**Cons:**

- Additional abstraction layer over Terraform
- Generated types can be inconsistent
- Less mature than native Pulumi

## Decision

Adopt **Pulumi with TypeScript** as the Infrastructure as Code tool.

### Stack Configuration

```
infrastructure/pulumi/
├── src/
│   ├── index.ts          # Stack entry point
│   ├── redis.ts          # Dragonfly/Redis deployment
│   ├── postgres.ts       # CloudNativePG or managed PG
│   ├── minio.ts          # MinIO (local) / S3 config (cloud)
│   ├── monitoring.ts     # Prometheus, Grafana, Loki, Tempo
│   └── keda.ts           # KEDA ScaledObjects for workers
├── Pulumi.yaml           # Project metadata
├── Pulumi.local.yaml     # k3d stack config
├── Pulumi.staging.yaml   # Staging stack config
└── Pulumi.prod.yaml      # Production stack config
```

### Environment Abstraction

```typescript
import * as pulumi from '@pulumi/pulumi';
import * as k8s from '@pulumi/kubernetes';

const config = new pulumi.Config();
const env = pulumi.getStack(); // 'local' | 'staging' | 'prod'

// Same code, different config
const redisReplicas = config.getNumber('redisReplicas') ?? (env === 'prod' ? 3 : 1);
```

## Consequences

### Positive

- Engineers write TypeScript for everything — no context switching
- Shared interfaces between app code and infra (e.g., config schemas)
- IDE autocompletion and type checking for all infra resources
- Function extraction enables DRY infra definitions
- Stack configs make local↔cloud a config change, not a code rewrite

### Negative

- Smaller module ecosystem than Terraform (mitigated: K8s provider is comprehensive)
- Team members unfamiliar with Pulumi need onboarding (mitigated: it's just TypeScript)
- Requires Pulumi backend for state (mitigated: self-host with S3 + DynamoDB or use Pulumi Cloud free tier)

### Risks

- Pulumi provider bugs may lag behind Terraform provider maturity (mitigated: K8s provider is well-maintained)
- State backend availability becomes a deployment dependency (mitigated: S3 backend has 99.999% availability)

## Validation

- `pulumi preview` runs successfully for all stacks in CI
- Local→cloud migration tested: same Pulumi code deploys to both k3d and cloud K8s
- No hand-crafted K8s manifests outside of Kustomize overlays

## Related

- [ADR-004: GitOps Deployment](ADR-004-gitops-deployment.md) — ArgoCD syncs rendered K8s manifests
- [ADR-005: Local Kubernetes](ADR-005-local-kubernetes.md) — Pulumi local stack targets k3d
- [ADR-001: Monorepo Tooling](ADR-001-monorepo-tooling.md) — Pulumi is a workspace package

---

> **Provenance**: Created 2026-03-24 during initial architecture design phase. Based on analysis of IaC tooling with emphasis on TypeScript ecosystem consistency and local-to-cloud portability.
