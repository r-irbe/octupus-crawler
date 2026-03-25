# Skill: Infrastructure Management

| Field | Value |
| --- | --- |
| **ID** | `infrastructure-management` |
| **Status** | Active |
| **Created** | 2026-03-24 |
| **Used By** | DevOps |

## Purpose

Manage Kubernetes manifests, Dockerfiles, Pulumi IaC, CI/CD pipelines, and local development environments.

## Capabilities

### Kubernetes (ADR-004, ADR-005)

- Write Kustomize base manifests and overlays
- Configure KEDA ScaledObjects
- Manage ConfigMaps, Secrets (via ESO), Services
- Set resource requests/limits, PDBs, node affinity

### Docker (ADR-012)

- Multi-stage Dockerfile builds
- Layer caching optimization
- Security: non-root user, minimal base image, .dockerignore

### Pulumi (ADR-003)

- TypeScript infrastructure definitions
- Stack configuration for local/staging/prod
- Resource provisioning: Redis, PG, MinIO, monitoring

### CI/CD (ADR-012)

- GitHub Actions workflow definitions
- Turborepo cache integration
- Container build and publish
- Security scanning with Trivy

### Local Dev (ADR-005)

- k3d cluster setup scripts
- docker-compose for dev services
- Local registry configuration

## ADR Compliance Matrix

| Task | Must Follow |
| --- | --- |
| K8s manifests | ADR-004 (Kustomize overlays, ArgoCD) |
| Dockerfiles | ADR-012 (multi-stage, layer cache) |
| IaC | ADR-003 (Pulumi TypeScript) |
| Local env | ADR-005 (k3d, local registry) |
| CI/CD | ADR-012 (GitHub Actions, Turborepo) |
| Config | ADR-013 (ConfigMaps + ESO, no secrets in git) |

## Related

- [DevOps Agent](../agents/devops.md)
- [ADR-003](../adr/ADR-003-infrastructure-as-code.md), [ADR-004](../adr/ADR-004-gitops-deployment.md), [ADR-005](../adr/ADR-005-local-kubernetes.md), [ADR-012](../adr/ADR-012-ci-cd-pipeline.md)
- [ADR-017: Service Communication](../adr/ADR-017-service-communication.md) — Temporal server deployment, gRPC service mesh

---

> **Provenance**: Created 2026-03-24 as part of the AI agent framework. Updated 2026-03-25: added ADR-017 cross-reference.
