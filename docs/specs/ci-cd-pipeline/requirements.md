# CI/CD Pipeline — Requirements

> EARS-format requirements for GitHub Actions CI/CD, Turborepo-aware builds, security scanning, container publishing, and deployment automation.
> Source: [ADR-012](../../adr/ADR-012-ci-cd-pipeline.md), [ADR-001](../../adr/ADR-001-monorepo-tooling.md)

---

## 1. PR Pipeline

**REQ-CICD-001** (Ubiquitous)
The CI system shall use GitHub Actions as the pipeline platform with Turborepo-aware caching.

**REQ-CICD-002** (Event-driven)
When a pull request is opened or updated targeting `main`, the CI pipeline shall run lint, typecheck, and test jobs.

**REQ-CICD-003** (Ubiquitous)
The PR pipeline shall complete in less than 5 minutes for incremental changes.

**REQ-CICD-004** (Ubiquitous)
The pipeline shall use `dorny/paths-filter` to detect which packages changed and only test affected packages.

**REQ-CICD-005** (Ubiquitous)
The pipeline shall use `pnpm/action-setup` and `actions/setup-node` with `--frozen-lockfile` for deterministic installs.

**REQ-CICD-006** (Ubiquitous)
Turborepo remote cache shall be enabled for CI builds. Cache hit rate shall exceed 80% for incremental PRs.

### Acceptance Criteria — PR Pipeline

```gherkin
Scenario: PR triggers CI pipeline
  Given a pull request targeting main
  When the PR is opened or updated
  Then lint, typecheck, and test jobs run
  And only affected packages are tested
  And the pipeline completes in under 5 minutes
```

---

## 2. Guard Function Integration

**REQ-CICD-007** (Ubiquitous)
The CI pipeline shall enforce the guard function chain per ADR-018: typecheck → lint → test in sequence.

**REQ-CICD-008** (State-driven)
If any guard function tier fails, the pipeline shall block the PR with structured output indicating which check failed and the error details.

**REQ-CICD-009** (Ubiquitous)
Agent PR validation (`.github/workflows/agent-pr-validation.yml`) shall filter for `work/*`, `copilot/*`, and `agent/*` branch patterns.

### Acceptance Criteria — Guard Functions

```gherkin
Scenario: Guard function failure blocks PR
  Given a PR with a type error
  When the typecheck job runs
  Then the job fails
  And the PR status check is red
  And the error message identifies the failing file and line
```

---

## 3. Security Scanning

**REQ-CICD-010** (Ubiquitous)
The pipeline shall run `pnpm audit --audit-level=high` to block PRs with high/critical dependency vulnerabilities.

**REQ-CICD-011** (Ubiquitous)
The pipeline shall run Trivy filesystem scan with CRITICAL and HIGH severity exit-code 1 (blocking).

**REQ-CICD-012** (Ubiquitous)
The pipeline shall run gitleaks to detect secrets in committed code.

**REQ-CICD-013** (Ubiquitous)
Zero critical or high CVEs shall be allowed in published container images.

### Acceptance Criteria — Security Scanning

```gherkin
Scenario: High severity CVE blocks merge
  Given a dependency with a HIGH severity CVE
  When the security scan runs
  Then the pipeline fails
  And the CVE ID and affected package are reported
```

---

## 4. Container Builds & Publishing

**REQ-CICD-014** (Event-driven)
When code is merged to `main`, the pipeline shall build the Docker image for the crawler service.

**REQ-CICD-015** (Ubiquitous)
Container builds shall use Docker BuildKit with GitHub Actions cache (`type=gha`) for layer caching.

**REQ-CICD-016** (Ubiquitous)
Published images shall be pushed to `ghcr.io` with tags: `{sha}`, `latest`, and semantic version when applicable.

**REQ-CICD-017** (Ubiquitous)
All images shall be built for both `amd64` and `arm64` architectures via `docker buildx`.

### Acceptance Criteria — Container Builds

```gherkin
Scenario: Merge to main publishes images
  Given a merge commit on main
  When the release pipeline runs
  Then Docker images are built for all services
  And images are pushed to ghcr.io with SHA tag
  And images pass Trivy scan before publishing
```

---

## 5. Release & Versioning

**REQ-CICD-018** (Ubiquitous)
The system shall use Changesets for semantic versioning. Developers add changeset files; the bot creates a "Version Packages" PR on merge.

**REQ-CICD-019** (Event-driven)
When a Version Packages PR is merged, the pipeline shall bump versions, update CHANGELOG.md, and publish updated packages.

**REQ-CICD-020** (Ubiquitous)
Kustomize overlays shall be updated with new image tags. ArgoCD shall auto-sync within 1 minute of tag update.

### Acceptance Criteria — Release & Versioning

```gherkin
Scenario: Changeset triggers version bump
  Given a merged PR with a changeset file
  When the release pipeline runs
  Then package versions are bumped per semver
  And CHANGELOG.md is updated
  And Kustomize image tags are updated
```

---

## 6. Architecture Conformance

**REQ-CICD-021** (Ubiquitous)
The pipeline shall run Spectral linting on OpenAPI specs to enforce API contract standards.

**REQ-CICD-022** (Ubiquitous)
The pipeline shall run architecture conformance checks: no barrel imports, no circular dependencies, file size limits.

**REQ-CICD-023** (Ubiquitous)
The pipeline shall run ADR compliance scanning as a non-blocking advisory check.

### Acceptance Criteria — Conformance

```gherkin
Scenario: Barrel import detected in CI
  Given a file importing from an index.ts barrel
  When the architecture conformance check runs
  Then the check fails with the offending import path
```

---

> **Provenance**: Created 2026-03-29 per ADR-020 Spec-Driven Development. Source: ADR-012, ADR-001.
