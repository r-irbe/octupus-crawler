# Skill: Security Analysis

**Agent**: Security

Analyze code and infrastructure for vulnerabilities. OWASP Top 10 + crawler-specific threats.

## OWASP Top 10

1. Broken Access Control — authorization on all endpoints
2. Cryptographic Failures — key management, TLS, hashing
3. Injection — SQL, XSS, command injection, SSRF
4. Insecure Design — threat modeling, security by design
5. Security Misconfiguration — default creds, verbose errors, headers
6. Vulnerable Components — dependency audit, CVE scanning
7. Auth Failures — session management, credential storage
8. Data Integrity — supply chain, code signing
9. Logging Failures — security event logging, audit trails
10. SSRF — URL validation, allowlisting, network segmentation

## Crawler-Specific

| Risk | Check |
| --- | --- |
| SSRF via crawl targets | Blocklist internal IPs, cloud metadata |
| Stored XSS from pages | Sanitize stored HTML before rendering |
| Resource exhaustion | Queue depth limits, timeout enforcement |
| Secret exposure | No secrets in git, ESO configured |
| Container security | Non-root, minimal base, no writable rootfs |

## Related

- [Security Agent](../agents/security.md)
- [ADR-013](../adr/ADR-013-configuration-management.md), [ADR-016](../adr/ADR-016-coding-standards-principles.md), [ADR-021](../adr/ADR-021-context-collapse-prevention.md) (OWASP ASI)
