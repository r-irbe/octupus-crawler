# ADR-012: CI/CD Pipeline — GitHub Actions

| Field | Value |
| --- | --- |
| **Status** | Accepted |
| **Created** | 2026-03-24 |
| **Last Updated** | 2026-03-25 |
| **Author(s)** | Architecture Council |
| **Reviewers** | Architect, Skeptic, DevOps Advisor, SecOps Advisor, SRE |
| **Supersedes** | N/A |
| **Superseded By** | N/A |

## Context

We need a CI/CD pipeline that builds, tests, scans, and publishes container images for the distributed crawler. The pipeline must support the monorepo structure (only build what changed), integrate with ArgoCD for deployment, and provide fast feedback on pull requests.

## Decision Drivers

- Monorepo-aware (only build/test affected packages)
- Container build and publish performance
- Security scanning integration
- ArgoCD deployment integration
- Developer feedback speed on PRs
- Cost and resource efficiency
- Ecosystem integration (GitHub PRs, status checks)

## Considered Options

### Option A: GitHub Actions

**Pros:**

- Native GitHub integration (PR checks, status badges, branch protection)
- Generous free tier for open source
- Docker layer caching via actions/cache
- Matrix builds for parallel package testing
- Turborepo remote cache integration
- Reusable workflows for DRY pipeline code
- Direct ghcr.io container registry integration

**Cons:**

- Runner cold starts can add 15-30s
- Limited self-hosted runner management (mitigated: GitHub-hosted for most tasks)
- YAML-based (no native TypeScript pipeline DSL)

### Option B: GitLab CI

**Pros:**

- Built-in container registry
- DAG pipeline visualization
- More powerful pipeline DSL

**Cons:**

- Requires GitLab hosting or migration
- Split ecosystem from GitHub PRs/Issues

### Option C: Dagger (TypeScript CI)

**Pros:**

- TypeScript pipeline definitions
- Portable: runs locally and in any CI
- Container-native execution

**Cons:**

- Additional complexity layer
- Less mature ecosystem
- Slower adoption, fewer examples

## Decision

Adopt **GitHub Actions** as the CI/CD platform.

### Pipeline Architecture

```yaml
# .github/workflows/ci.yml — Runs on every PR
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
          tags: ipf-${{ matrix.service }}:pr-${{ github.event.number }}

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

```yaml
# .github/workflows/release.yml — Runs on main branch merge
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

      # Build and push containers
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - uses: docker/build-push-action@v6
        with:
          push: true
          tags: ghcr.io/${{ github.repository }}/worker:${{ github.sha }}

      # Update image tag in Kustomize overlay
      - name: Update image tag
        run: |
          cd infrastructure/k8s/overlays/production
          kustomize edit set image worker=ghcr.io/${{ github.repository }}/worker:${{ github.sha }}

      - name: Commit and push
        run: |
          git config user.name "github-actions"
          git config user.email "actions@github.com"
          git add infrastructure/
          git commit -m "chore: update image tags to ${{ github.sha }}"
          git push
```

### PR Council Review Integration

The CI pipeline triggers the AI PR Review Council (see [PR Review Council Convention](../conventions/pr-review-council.md)) as a required status check. The council must reach consensus before the PR can be merged.

## Consequences

### Positive

- PR feedback in < 5 minutes (parallel jobs + Turborepo cache)
- Only changed packages are tested (paths-filter + matrix)
- Container images cached via GitHub Actions cache (layer reuse)
- Security scanning blocks PRs with critical vulnerabilities
- ArgoCD auto-syncs when image tags are updated in git

### Negative

- GitHub Actions YAML can become verbose (mitigated: reusable workflows)
- Runner cold starts add latency (mitigated: warm cache helps)
- ghcr.io rate limits for public packages (mitigated: authentication)

### Risks

- GitHub Actions outage blocks all CI/CD (mitigated: local testing with k3d)
- Secrets exposure in workflow runs (mitigated: environment protection rules, OIDC)

## Validation

- PR CI feedback time: < 5 minutes
- Turborepo cache hit rate: > 80% for incremental PRs
- Zero critical/high CVEs in published container images
- ArgoCD sync triggered within 1 minute of image tag update

## Turborepo CI Optimization

```jsonc
// turbo.json — only rebuild what changed
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

Remote caching (Vercel or self-hosted) means repeated CI runs on the same code skip build/test entirely.

## Docker Multi-Architecture Builds

All container images are built for both `amd64` and `arm64` using `docker buildx`, enabling deployment on both x86 CI runners and ARM-based production nodes (e.g., Graviton).

## Guard Function CI Pipeline (ADR-018)

The CI pipeline implements the deterministic verification half of the Atomic Action Pair pattern. Every PR must pass the full Guard Function chain:

```text
Guard Chain (per PR):
  Tier 1: tsc --noEmit --strict       → Type safety (< 30s)
  Tier 2: eslint --max-warnings 0      → Style + architecture rules (< 30s)
  Tier 3: vitest run --reporter=json   → Unit tests (< 60s)
  Tier 4: vitest run --project integ   → Integration tests (< 120s)
  Tier 5: ADR compliance scan          → Architecture verification (< 30s)
  Tier 6: Trivy + Semgrep              → Security scan (< 60s)

All tiers run in parallel where independent.
Failure at any tier: PR is blocked, structured error report generated.
Agent tasks: structured error output enables automatic retry (max 3 loops).
```

Guard Function output is JSON-structured so agents can parse failures and self-correct without human intervention. The CI pipeline reports:
- Exact file and line of each failure
- Expected vs actual for test failures
- ADR reference for compliance violations
- Actionable fix suggestion for each violation

## Spec-Driven Development Integration

The CI pipeline validates the Spec-Driven Development workflow (ADR-018 §3):

- PRs that add new features must include or reference a `spec.md` with acceptance criteria
- Acceptance criteria in `spec.md` must have corresponding test coverage
- `tasks.md` completion status is tracked alongside PR progress

## Automated Versioning (Changesets)

Changesets handles semantic versioning automatically:

1. Developers add changeset files describing changes (`pnpm changeset`)
2. On merge to main, Changesets bot creates a "Version Packages" PR
3. Merging the version PR bumps versions, updates `CHANGELOG.md`, and triggers the release pipeline

## Security Scanning Pipeline

```yaml
# Security gates (blocking)
- pnpm audit --audit-level=high           # Dependency audit
- semgrep --config auto                    # SAST scan
- trivy image --severity HIGH,CRITICAL     # Container scan
```

## Deployment Strategy (Zero-Downtime)

- **Canary**: Route 5% → 25% → 100% of traffic to new version based on error rate SLO
- **Rollback**: ArgoCD auto-rollback if health checks fail within 5 minutes of deploy
- **Feature Flags**: Decouple deploy from release using LaunchDarkly or Unleash

## Related

- [ADR-001: Monorepo Tooling](ADR-001-monorepo-tooling.md) — Turborepo caching in CI, Changesets versioning
- [ADR-004: GitOps Deployment](ADR-004-gitops-deployment.md) — ArgoCD syncs on image tag commits
- [ADR-007: Testing Strategy](ADR-007-testing-strategy.md) — Test stages in CI pipeline
- [PR Review Council Convention](../conventions/pr-review-council.md) — AI-based PR review process
- [ADR-016: Coding Standards](ADR-016-coding-standards-principles.md) — ESLint config enforced in CI
- [ADR-018: Agentic Coding](ADR-018-agentic-coding-conventions.md) — Guard Function CI pipeline, Spec-Driven Development validation

---

> **Provenance**: Created 2026-03-24; updated 2026-03-25 with Turborepo CI, multi-arch Docker, Changesets, security scanning, deployment strategy, Guard Function CI pipeline and SDD integration from [docs/research/ai_coding.md](../research/ai_coding.md).
