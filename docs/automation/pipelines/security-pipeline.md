# Pipeline: Security

| Field | Value |
| --- | --- |
| **Status** | Active |
| **Created** | 2026-03-24 |
| **ADR** | [ADR-014](../../adr/ADR-014-automation-strategy.md) |
| **Triggers** | `dependency.changed`, `code.committed`, `pr.opened`, `deploy.completed`, `schedule.daily` |

## Overview

Continuous security scanning across the entire development lifecycle. Covers supply chain, secrets, vulnerabilities, code patterns, container images, and runtime configuration.

## Security Scanning Layers

```text
┌────────────────────────────────────────────────────┐
│ Layer 1: CODE (on every commit)                    │
│   Secrets detection, SAST patterns, OWASP checks  │
├────────────────────────────────────────────────────┤
│ Layer 2: DEPENDENCIES (on change + daily)          │
│   CVE scanning, license audit, supply chain        │
├────────────────────────────────────────────────────┤
│ Layer 3: CONTAINER (on build)                      │
│   Image scanning, base image audit, SBOM           │
├────────────────────────────────────────────────────┤
│ Layer 4: CONFIGURATION (on deploy + daily)         │
│   K8s security, RBAC audit, secret management      │
├────────────────────────────────────────────────────┤
│ Layer 5: RUNTIME (continuous)                       │
│   Network policy, pod security, resource limits     │
└────────────────────────────────────────────────────┘
```

## Layer 1: Code Security

### Secrets Detection

**Tool:** gitleaks
**Trigger:** `code.committed` (pre-commit hook + CI)

```text
Scan targets:
  - All committed files
  - Environment files (.env*)
  - Configuration files
  - Docker files
  - CI/CD files

Rules:
  - API keys (pattern: [A-Za-z0-9]{32,})
  - AWS credentials (AKIA...)
  - Private keys (-----BEGIN)
  - Database connection strings
  - JWT tokens
  - Custom patterns per project

Finding → ALWAYS BLOCKING (no override)
  1. Block commit/push
  2. Alert Security Agent
  3. If found in history: initiate secret rotation
```

### Static Analysis Security Testing (SAST)

**Trigger:** `pr.opened`, `code.committed`

```text
Checks:
  - SQL injection patterns (parameterized queries required)
  - XSS vectors (output encoding required)
  - Command injection (no child_process.exec with user input)
  - Path traversal (no user input in file paths)
  - SSRF (no user-controlled URLs in fetch/undici)
  - Prototype pollution (no Object.assign from user input)
  - ReDoS (no user-controlled regex)

Crawler-Specific:
  - Robots.txt compliance (respect disallow)
  - Rate limiting enforcement (per-domain)
  - Cookie/session handling (no credential leakage)
  - Redirect following (limit depth, no open redirect)
  - Content validation (sanitize parsed HTML)
```

## Layer 2: Dependency Security

### CVE Scanning

**Tool:** `pnpm audit` + Trivy + OSV-Scanner
**Trigger:** `dependency.changed`, `schedule.daily`

```text
Severity handling:
  CRITICAL → Block immediately, create emergency fix task
  HIGH     → Block PR, create fix task (72-hour SLA)
  MEDIUM   → Warning, create fix task (30-day SLA)
  LOW      → Log, quarterly review
```

### Supply Chain Audit

**Trigger:** `dependency.changed`

```text
For each new/updated dependency:
  1. Check: Is package from known publisher?
  2. Check: Package age (< 30 days = flag for review)
  3. Check: Typosquatting detection (Levenshtein distance to popular packages)
  4. Check: License compatibility (MIT, Apache-2.0, ISC allowed)
  5. Check: Maintenance status (last publish, open issues, contributors)
  6. If any flags: require Security Agent review before merge
```

### Lock File Integrity

**Trigger:** `code.committed` (if lock file changed)

```text
Verify:
  1. Lock file consistent with package.json
  2. No unpinned version ranges in production deps
  3. Integrity hashes present for all packages
  4. No registry overrides (all from npm registry)
```

## Layer 3: Container Security

### Image Scanning

**Tool:** Trivy
**Trigger:** Release Pipeline Stage 2

```text
Scan:
  1. Base image vulnerabilities (node:22-alpine)
  2. OS package vulnerabilities
  3. Application dependency vulnerabilities
  4. Misconfigurations (Dockerfile best practices)

Thresholds:
  CRITICAL → Block release
  HIGH     → Block release
  MEDIUM   → Warning in report
  LOW      → Info only
```

### Dockerfile Best Practices

**Trigger:** `file.changed` (Dockerfile)

```text
Enforce:
  ✓ Multi-stage builds (no dev deps in prod image)
  ✓ Non-root user (USER node)
  ✓ Specific base image tag (not :latest)
  ✓ No COPY . (use .dockerignore)
  ✓ HEALTHCHECK defined
  ✓ No secrets in ENV or ARG
  ✓ Minimal attack surface (alpine base)
```

## Layer 4: Configuration Security

### K8s Security Audit

**Trigger:** `file.changed` (k8s/), `schedule.daily`

```text
Enforce:
  ✓ No privileged containers
  ✓ Read-only root filesystem where possible
  ✓ Resource limits set (CPU, memory)
  ✓ Network policies defined
  ✓ Service accounts with minimal RBAC
  ✓ Secrets via ExternalSecrets Operator (not in manifests)
  ✓ Pod security standards enforced
  ✓ No hostPath mounts
  ✓ SecurityContext defined
```

### Secret Management Audit

**Trigger:** `schedule.daily`

```text
Verify:
  1. All secrets managed via ExternalSecrets Operator (ADR-013)
  2. No plaintext secrets in ConfigMaps
  3. No secrets in environment variable definitions in manifests
  4. Secret rotation schedule maintained
  5. Access logging enabled for secret stores
```

## Layer 5: Runtime Security

### Continuous Monitoring

**Trigger:** `deploy.completed`, `schedule.daily`

```text
Monitor:
  1. Pod security policy violations
  2. Network policy violations (unexpected traffic)
  3. Resource limit violations (OOM kills)
  4. Failed authentication attempts
  5. Unusual outbound traffic patterns (crawler specific)
```

## Security Incident Response

```text
On CRITICAL finding:
  1. IMMEDIATELY block affected pipeline stage
  2. Alert Security Agent + Gateway Agent
  3. Assess: Is this in production? Is data affected?
  4. If in production:
     a. Initiate hotfix pipeline (expedited dev lifecycle)
     b. If credentials exposed: rotate immediately
     c. Notify user with severity and impact assessment
  5. Create incident record in docs/memory/session/
  6. Post-resolution: feed into Self-Improvement Loop
```

## Metrics Collected

| Metric | Target | Description |
| --- | --- | --- |
| `security.cve_critical` | 0 | Critical CVEs in production |
| `security.cve_high` | 0 | High CVEs in production |
| `security.secrets_detected` | 0 | Secrets leaked to commits |
| `security.sast_findings` | Trending down | SAST findings per scan |
| `security.supply_chain_flags` | < 5% of deps | Dependencies flagged for review |
| `security.image_scan_pass` | 100% | Container images passing scan |
| `security.k8s_violations` | 0 | K8s security policy violations |
| `security.scan_coverage` | 100% | All deps and images scanned |
| `security.mttr_critical` | < 24 hours | Time to remediate critical findings |

## Related

- [Security Agent](../../agents/security.md) — Security analysis agent
- [Security Analysis Skill](../../skills/security-analysis.md) — OWASP methodology
- [Quality Gates](quality-gates.md) — Security gates in PR
- [Release Pipeline](release-pipeline.md) — Container scanning

---

> **Provenance**: Created 2026-03-24 as part of ADR-014 automation strategy. Defines 5-layer continuous security scanning across the development lifecycle.
