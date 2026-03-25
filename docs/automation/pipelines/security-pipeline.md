# Pipeline: Security

**ADR**: [ADR-014](../../adr/ADR-014-automation-strategy.md) | **Triggers**: `dependency.changed`, `code.committed`, `pr.opened`, `deploy.completed`, `schedule.daily`

5-layer continuous security scanning across the development lifecycle.

## Layer 1: Code Security (on every commit)

- **Secrets detection** (gitleaks): API keys, AWS creds, private keys, DB strings, JWTs. Always blocking, no override. If in history → initiate rotation
- **SAST**: SQL injection, XSS, command injection, path traversal, SSRF, prototype pollution, ReDoS. Crawler-specific: robots.txt compliance, rate limiting, redirect depth, content sanitization

## Layer 2: Dependencies (on change + daily)

- **CVE scanning** (`pnpm audit` + Trivy + OSV-Scanner): CRITICAL → block + emergency fix | HIGH → block (72h SLA) | MEDIUM → warning (30d) | LOW → quarterly
- **Supply chain audit**: publisher check, package age (<30d = flag), typosquatting detection, license compatibility (MIT/Apache-2.0/ISC), maintenance status
- **Lock file integrity**: consistency with package.json, pinned versions in prod, integrity hashes, no registry overrides

## Layer 3: Container Security (on build)

- **Image scanning** (Trivy): OS + app vulnerabilities. CRITICAL/HIGH → block release
- **Dockerfile enforcement**: multi-stage, non-root USER, specific tags (not :latest), .dockerignore, HEALTHCHECK, no secrets in ENV/ARG, alpine base

## Layer 4: Configuration (on deploy + daily)

- **K8s audit**: no privileged containers, read-only rootfs, resource limits, network policies, minimal RBAC, ESO for secrets, pod security standards, SecurityContext
- **Secret management**: all via ESO (ADR-013), no plaintext in ConfigMaps, rotation schedule, access logging

## Layer 5: Runtime (continuous)

Pod security violations, network policy violations, resource limit violations, failed auth attempts, unusual outbound traffic.

## Incident Response

CRITICAL finding → immediately block pipeline → alert Security + Gateway → assess production impact → if credentials exposed: rotate immediately → incident record → post-resolution feed to Self-Improvement.

## Metrics

| Metric | Target |
| --- | --- |
| `security.cve_critical` | 0 in production |
| `security.secrets_detected` | 0 leaked |
| `security.image_scan_pass` | 100% |
| `security.k8s_violations` | 0 |
| `security.mttr_critical` | <24 hours |

## Related

- [Security Agent](../../agents/security.md), [Security Analysis Skill](../../skills/security-analysis.md)
- [Quality Gates](quality-gates.md), [Release Pipeline](release-pipeline.md)
