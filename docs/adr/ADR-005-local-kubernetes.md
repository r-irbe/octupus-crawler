# ADR-005: Local Kubernetes — k3d

| Field | Value |
| --- | --- |
| **Status** | Accepted |
| **Created** | 2026-03-24 |
| **Last Updated** | 2026-03-24 |
| **Author(s)** | Architecture Council |
| **Reviewers** | Architect, Skeptic, DevEx Advisor, DevOps Advisor, SRE |
| **Supersedes** | N/A |
| **Superseded By** | N/A |

## Context

Developers and CI pipelines need a lightweight local Kubernetes environment that closely mirrors production topology. The tool must support multi-node clusters, local container registries, and be scriptable for automated setup/teardown.

## Decision Drivers

- Startup speed (cluster ready in seconds)
- Multi-node support (simulate production topology)
- Built-in local registry (no Docker Hub rate limits)
- LoadBalancer support without extra setup
- CI/CD compatibility (GitHub Actions, etc.)
- Resource footprint on developer machines
- Scriptability for automated setup

## Considered Options

### Option A: k3d (k3s in Docker)

**Pros:**

- Multi-node cluster creation in < 30 seconds
- Built-in local registry support (`k3d registry create`)
- ServiceLB for LoadBalancer support out of the box
- Traefik ingress controller pre-installed
- Minimal resource footprint (k3s is lightweight)
- Docker-based — works everywhere Docker runs
- Easy scripting via CLI
- CI-friendly: works in GitHub Actions Docker-in-Docker

**Cons:**

- Runs k3s, not full K8s (some API differences)
- Docker-in-Docker can have networking quirks
- Less common in enterprise guides than kind/minikube

### Option B: kind (Kubernetes IN Docker)

**Pros:**

- Uses full K8s (kubeadm-based)
- Kubernetes SIG-maintained
- Good CI support

**Cons:**

- No built-in local registry (requires manual setup)
- No LoadBalancer support without MetalLB
- Slower startup than k3d
- No built-in ingress controller

### Option C: minikube

**Pros:**

- Most widely documented
- Multiple driver options (Docker, Hyperkit, etc.)
- Built-in addons system

**Cons:**

- Single-node only by default (multi-node is experimental)
- Heavier resource requirements
- Slower startup time
- Less suited for CI environments

## Decision

Adopt **k3d** as the local Kubernetes development and CI environment.

### Cluster Configuration

```bash
#!/bin/bash
# scripts/setup-local.sh

# Create local registry
k3d registry create ipf-registry.localhost --port 5111

# Create cluster with local registry
k3d cluster create ipf-local \
  --servers 1 \
  --agents 3 \
  --registry-use k3d-ipf-registry.localhost:5111 \
  --port "8080:80@loadbalancer" \
  --port "8443:443@loadbalancer" \
  --k3s-arg "--disable=traefik@server:0" \
  --wait

# Verify
kubectl cluster-info
kubectl get nodes
```

### Local Development Workflow

1. `pnpm run dev:infra` — Start docker-compose for Redis, PG, MinIO
2. `pnpm run dev:scheduler` — Run scheduler locally (connects to docker-compose services)
3. `pnpm run dev:worker` — Run worker locally
4. **OR** `scripts/setup-local.sh` — Full k3d cluster for K8s-native testing

## Consequences

### Positive

- Developers can run full multi-node cluster locally in seconds
- Local registry eliminates Docker Hub rate limiting and speeds image pushes
- Same K8s primitives as production (Deployments, Services, ConfigMaps)
- CI can spin up identical clusters for e2e tests
- KEDA, ArgoCD, and other controllers can be tested locally

### Negative

- k3s has minor API differences from full K8s (mitigated: differences are in rarely-used features)
- Docker-in-Docker networking requires care with port mappings
- Developers need Docker Desktop or equivalent

### Risks

- k3s API incompatibility with production K8s (mitigated: test with exact target K8s version in CI)
- Resource constraints on developer laptops with large clusters (mitigated: 1 server + 2 agents is sufficient)

## Validation

- Cluster creation to first pod running: < 60 seconds
- All application manifests deploy successfully to k3d
- CI e2e tests pass consistently on k3d clusters
- Local↔cloud manifest parity verified via `kustomize build` diff

## Related

- [ADR-003: Infrastructure as Code](ADR-003-infrastructure-as-code.md) — Pulumi local stack targets k3d
- [ADR-004: GitOps Deployment](ADR-004-gitops-deployment.md) — ArgoCD can run in k3d
- [ADR-012: CI/CD Pipeline](ADR-012-ci-cd-pipeline.md) — CI creates k3d clusters for e2e

---

> **Provenance**: Created 2026-03-24 during initial architecture design phase. Based on evaluation of local Kubernetes tooling for developer experience and CI compatibility.
