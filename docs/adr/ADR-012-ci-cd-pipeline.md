# ADR-012: CI/CD Pipeline — GitHub Actions

| Field | Value |
| --- | --- |
| **Status** | Accepted |
| **Created** | 2026-03-24 |
| **Last Updated** | 2026-03-25 |
| **Author(s)** | Architecture Council |
| **Reviewers** | Architect, Skeptic, DevOps Advisor, SecOps Advisor, SRE |

## Context

Need a CI/CD pipeline for the monorepo: build only what changed, test, scan, publish containers, integrate with ArgoCD.

## Decision Drivers

- Monorepo-aware (only build/test affected packages)
- Container build and publish performance
- Security scanning integration
- ArgoCD deployment integration
- Developer feedback speed on PRs (< 5 min target)

## Considered Options

| Option | Pros | Cons |
| --- | --- | --- |
| **GitHub Actions** (chosen) | Native GitHub integration, Docker caching, Turborepo remote cache, ghcr.io registry | Runner cold starts 15-30s, YAML-based |
| GitLab CI | Built-in registry, DAG visualization | Requires migration from GitHub |
| Dagger (TS CI) | TypeScript pipelines, portable | Additional complexity, less mature |

## Decision

Adopt **GitHub Actions** as the CI/CD platform.

### PR Pipeline

```yaml
# .github/workflows/ci.yml
name: CI
on:
  pull_request:
    branches: [main]

jobs:
  changes:
    runs-on: ubuntu-latest
    outputs:
      packages: ${{ steps.filter.outputs.changes }}
    steps:
      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            shared: 'packages/shared/**'
            scheduler: 'packages/scheduler/**'
            worker: 'packages/worker/**'
            api: 'packages/api/**'
            infra: 'infrastructure/**'

  lint-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo lint typecheck

  test:
    needs: [changes]
    runs-on: ubuntu-latest
    strategy:
      matrix:
        package: ${{ fromJson(needs.changes.outputs.packages) }}
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo test --filter=${{ matrix.package }}

  build-containers:
    needs: [lint-typecheck, test]
    runs-on: ubuntu-latest
    strategy:
      matrix:
        service: [scheduler, worker, api]
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/build-push-action@v6
        with:
          context: .
          file: packages/${{ matrix.service }}/Dockerfile
          push: false
          cache-from: type=gha
          cache-to: type=gha,mode=max

  security-scan:
    needs: [build-containers]
    runs-on: ubuntu-latest
    steps:
      - uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          severity: 'CRITICAL,HIGH'
          exit-code: '1'
```

### Release Pipeline

```yaml
# .github/workflows/release.yml
name: Release
on:
  push:
    branches: [main]

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo build
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v6
        with:
          push: true
          tags: ghcr.io/${{ github.repository }}/worker:${{ github.sha }}
      - name: Update Kustomize image tag
        run: |
          cd infrastructure/k8s/overlays/production
          kustomize edit set image worker=ghcr.io/${{ github.repository }}/worker:${{ github.sha }}
      - name: Commit tag update
        run: |
          git config user.name "github-actions"
          git config user.email "actions@github.com"
          git add infrastructure/
          git commit -m "chore: update image tags to ${{ github.sha }}"
          git push
```

### Guard Function Chain (ADR-018)

All tiers run in parallel where independent. Failure at any tier blocks the PR with structured JSON output for agent self-correction (max 3 loops).

| Tier | Check | Target |
| --- | --- | --- |
| 1 | `tsc --noEmit --strict` | < 30s |
| 2 | `eslint --max-warnings 0` | < 30s |
| 3 | `vitest run` (unit) | < 60s |
| 4 | `vitest run --project integ` | < 120s |
| 5 | ADR compliance scan | < 30s |
| 6 | Trivy + Semgrep | < 60s |

### Security Gates (Blocking)

```bash
pnpm audit --audit-level=high       # Dependency audit
semgrep --config auto                # SAST scan
trivy image --severity HIGH,CRITICAL # Container scan
```

### Turborepo CI Config

```jsonc
{
  "pipeline": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**"], "cache": true },
    "test": { "dependsOn": ["^build"], "outputs": ["coverage/**"], "cache": true },
    "typecheck": { "dependsOn": ["^build"], "cache": true },
    "lint": { "cache": true }
  },
  "remoteCache": { "enabled": true }
}
```

### Deployment Strategy

- **Canary**: 5% → 25% → 100% traffic based on error rate SLO
- **Rollback**: ArgoCD auto-rollback if health checks fail within 5 min
- **Feature flags**: Decouple deploy from release (LaunchDarkly/Unleash)
- **Multi-arch**: All images built for amd64 + arm64 via `docker buildx`

### Automated Versioning

Changesets handles semantic versioning: developers add changeset files (`pnpm changeset`), bot creates "Version Packages" PR on merge, bumps versions + `CHANGELOG.md`.

## Consequences

**Positive**: PR feedback < 5 min, only changed packages tested, container layer caching, security scanning blocks critical CVEs, ArgoCD auto-syncs on tag update.

**Negative**: YAML verbosity (mitigated: reusable workflows), runner cold starts (mitigated: warm cache), ghcr.io rate limits (mitigated: auth).

**Risks**: GitHub Actions outage blocks CI (mitigated: local testing with k3d), secrets exposure (mitigated: environment protection rules, OIDC).

## Validation

- PR CI feedback: < 5 min
- Turborepo cache hit rate: > 80% for incremental PRs
- Zero critical/high CVEs in published images
- ArgoCD sync within 1 min of tag update

## Related

- [ADR-001](ADR-001-monorepo-tooling.md) — Turborepo caching, Changesets
- [ADR-004](ADR-004-gitops-deployment.md) — ArgoCD syncs on image tag commits
- [ADR-007](ADR-007-testing-strategy.md) — Test stages in CI
- [ADR-018](ADR-018-agentic-coding-conventions.md) — Guard Function chain, SDD validation
- [PR Review Council](../conventions/pr-review-council.md) — AI-based PR review

---

> **Provenance**: Created 2026-03-24; updated 2026-03-25. Condensed 2026-03-25: merged options to table, moved Guard Functions to table, trimmed prose.
