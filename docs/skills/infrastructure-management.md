# Skill: Infrastructure Management

**Agent**: DevOps

Manage K8s manifests, Dockerfiles, Pulumi IaC, CI/CD pipelines, local dev environments.

## Capabilities

- **Kubernetes** (ADR-004/005): Kustomize base + overlays, KEDA ScaledObjects, ConfigMaps, Secrets (ESO), resource limits, PDBs
- **Docker** (ADR-012): Multi-stage builds, layer caching, non-root user, minimal base image
- **Pulumi** (ADR-003): TypeScript IaC, stack config for local/staging/prod
- **CI/CD** (ADR-012): GitHub Actions, Turborepo cache, container build/publish, Trivy scanning
- **Local dev** (ADR-005): k3d cluster setup, docker-compose, local registry

## ADR Compliance

| Task | ADR |
| --- | --- |
| K8s manifests | ADR-004 (Kustomize, ArgoCD) |
| Dockerfiles | ADR-012 (multi-stage, layer cache) |
| IaC | ADR-003 (Pulumi TypeScript) |
| Local env | ADR-005 (k3d) |
| CI/CD | ADR-012 (GitHub Actions) |
| Config | ADR-013 (ConfigMaps + ESO) |

## Related

- [DevOps Agent](../agents/devops.md)
- [ADR-003](../adr/ADR-003-infrastructure-as-code.md), [ADR-004](../adr/ADR-004-gitops-deployment.md), [ADR-005](../adr/ADR-005-local-kubernetes.md), [ADR-012](../adr/ADR-012-ci-cd-pipeline.md)
