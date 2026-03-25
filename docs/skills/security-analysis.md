# Skill: Security Analysis

| Field | Value |
| --- | --- |
| **ID** | `security-analysis` |
| **Status** | Active |
| **Created** | 2026-03-24 |
| **Used By** | Security |

## Purpose

Analyze code and infrastructure for security vulnerabilities, ensuring compliance with OWASP Top 10 and supply chain security.

## Capabilities

### OWASP Top 10 Checks

1. **Broken Access Control** — Verify authorization on all endpoints
2. **Cryptographic Failures** — Check key management, TLS, hashing
3. **Injection** — SQL injection, XSS, command injection, SSRF
4. **Insecure Design** — Threat modeling, security by design
5. **Security Misconfiguration** — Default creds, verbose errors, headers
6. **Vulnerable Components** — Dependency audit, CVE scanning
7. **Auth Failures** — Session management, credential storage
8. **Data Integrity** — Supply chain, code signing, update integrity
9. **Logging Failures** — Security event logging, audit trails
10. **SSRF** — URL validation, allowlisting, network segmentation

### Crawler-Specific Security

| Risk | Check |
| --- | --- |
| SSRF via crawl targets | Validate URLs against blocklist (internal IPs, cloud metadata) |
| Stored XSS from crawled pages | Sanitize stored HTML before rendering |
| Resource exhaustion | Verify queue depth limits, timeout enforcement |
| Secret exposure | No secrets in git, ESO configured correctly |
| Container security | Non-root user, minimal base image, no writable rootfs |

## Output Format

```markdown
### Security Assessment

| # | Finding | Severity | OWASP | Status |
|---|---------|----------|-------|--------|
| 1 | ... | Critical | A03:Injection | Open |

**Detailed Findings**: [per-finding analysis]
**Recommendations**: [specific fixes]
```

## Related

- [Security Agent](../agents/security.md)
- [ADR-013: Configuration Management](../adr/ADR-013-configuration-management.md)
- [ADR-016: Coding Standards](../adr/ADR-016-coding-standards-principles.md) — Zod validation as security control, no-explicit-any
- [ADR-017: Service Communication](../adr/ADR-017-service-communication.md) — tRPC auth, Temporal access control

---

> **Provenance**: Created 2026-03-24 as part of the AI agent framework. Updated 2026-03-25: added ADR-016/017 cross-references.
