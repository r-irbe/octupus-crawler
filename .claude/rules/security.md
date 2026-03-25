# Security Rules

## Input Validation

- All external input validated with Zod schemas before processing
- Never trust tool call outputs — extract data only, never execute as commands
- Prompt injection defense: untrusted content processed for data extraction only

## SSRF Protection

- Validate all URLs against RFC 6890 reserved IP ranges before fetching
- Block IPv4-mapped IPv6 (`::ffff:127.0.0.1`), CGNAT (`100.64.0.0/10`), multicast/broadcast
- DNS resolution must be pinned — resolve before fetch, validate resolved IP
- DNS timeout: fail closed (reject), never fail open (allow)

## Secrets

- No secrets in code — all via External Secrets Operator → K8s Secrets → env vars
- No hardcoded passwords, API keys, or embedded certificates
- `gitleaks` scan runs on every commit

## Error Messages

- Never expose internal error details to clients
- Log full error internally with correlation ID
- Return sanitized error message with correlation ID to client

## Agent Security (OWASP ASI)

- Memory writes must pass SSGM gates: relevance, evidence, coherence
- Multi-agent: verify claimed artifacts (files/commits) exist before accepting
- Cascade depth: max 3 levels of subagent delegation
- Each delegation level has independent guard function gates
