# ADR-004: GitOps Deployment — ArgoCD + Kustomize

| Field | Value |
| --- | --- |
| **Status** | Accepted |
| **Created** | 2026-03-24 |
| **Last Updated** | 2026-03-24 |
| **Author(s)** | Architecture Council |
| **Reviewers** | Architect, Skeptic, SRE, DevOps Advisor, SecOps Advisor |
| **Supersedes** | N/A |
| **Superseded By** | N/A |

## Context

We need a deployment strategy that provides declarative, auditable, and reproducible deployments across multiple environments (local k3d, staging, production). The system must support progressive rollouts, drift detection, and easy rollback.

## Decision Drivers

- Declarative deployment model (GitOps principles)
- Multi-environment support (local, staging, production)
- Audit trail for all deployment changes
- Drift detection and auto-reconciliation
- Rollback simplicity (git revert)
- UI for deployment visibility and debugging
- Kustomize-native support (avoid Helm complexity for simple apps)

## Considered Options

### Option A: ArgoCD + Kustomize

**Pros:**

- Best-in-class GitOps UI for debugging sync state
- First-class Kustomize support (no Helm required)
- ApplicationSets for multi-environment templating
- Sync waves and hooks for ordered deployments
- Automated drift detection and optionally auto-sync
- SSO integration, RBAC, audit logging
- Notification integrations (Slack, GitHub)

**Cons:**

- Heavier installation footprint than Flux
- UI can be resource-intensive in constrained environments
- Learning curve for ApplicationSet generators

### Option B: FluxCD

**Pros:**

- Lighter resource footprint
- GitOps Toolkit is modular
- Multi-tenancy built-in

**Cons:**

- No built-in UI (requires Weave GitOps or third-party)
- Debugging sync failures requires CLI
- Less mature ApplicationSet-equivalent (Kustomization controller)

### Option C: Direct CI/CD Deploy (kubectl apply in pipeline)

**Pros:**

- Simplest to set up initially
- No additional controllers in-cluster

**Cons:**

- No drift detection
- No reconciliation loop
- Rollback requires re-running pipelines
- No audit trail beyond CI logs
- Anti-pattern for production systems

## Decision

Adopt **ArgoCD** as the GitOps controller with **Kustomize overlays** for environment-specific configuration.

### Repository Layout

```
infrastructure/
├── argocd/
│   ├── appproject.yaml         # ArgoCD project scoping
│   └── applications/
│       ├── crawler.yaml        # App-of-apps for crawler components
│       └── infra.yaml          # Infrastructure components
└── k8s/
    ├── base/
    │   ├── kustomization.yaml
    │   ├── scheduler-deployment.yaml
    │   ├── worker-deployment.yaml
    │   ├── api-deployment.yaml
    │   ├── configmap.yaml
    │   └── service.yaml
    └── overlays/
        ├── local/
        │   ├── kustomization.yaml  # Fewer replicas, lower resources
        │   └── patches/
        └── production/
            ├── kustomization.yaml  # HPA, PDB, node affinity
            └── patches/
```

### Sync Strategy

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: ipf-crawler
spec:
  source:
    repoURL: https://github.com/org/ipf_clean
    path: infrastructure/k8s/overlays/production
    targetRevision: main
  destination:
    server: https://kubernetes.default.svc
    namespace: ipf
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

## Consequences

### Positive

- Every deployment is a git commit — full audit trail
- Rollback = `git revert` + ArgoCD auto-sync
- Drift from desired state is detected and corrected automatically
- Kustomize overlays keep base manifests DRY
- ArgoCD UI provides instant deployment status visibility

### Negative

- ArgoCD adds ~500MB memory footprint to cluster
- Initial RBAC and project setup has a learning curve
- Image tag updates require either image updater or CI commit

### Risks

- ArgoCD controller pod failure pauses all syncs (mitigated: HA mode with multiple replicas in prod)
- Git repository availability becomes a deployment dependency (mitigated: ArgoCD caches last-known state)

## Validation

- All production deployments traceable to a git commit
- Drift detected and reconciled within 3 minutes
- Zero manual `kubectl apply` commands in production
- Kustomize overlays render correctly: `kustomize build` in CI

## Related

- [ADR-003: Infrastructure as Code](ADR-003-infrastructure-as-code.md) — Pulumi provisions ArgoCD itself
- [ADR-005: Local Kubernetes](ADR-005-local-kubernetes.md) — ArgoCD deployed in k3d for local testing
- [ADR-012: CI/CD Pipeline](ADR-012-ci-cd-pipeline.md) — CI builds images, ArgoCD deploys them

---

> **Provenance**: Created 2026-03-24 during initial architecture design phase. Based on analysis of GitOps deployment strategies for multi-environment Kubernetes workloads.
