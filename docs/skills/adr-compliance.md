# Skill: ADR Compliance

**Agents**: All | **Primary**: Implementation, Review, Architect

Verify code and infrastructure changes comply with ADRs. Pre-commit quality gate.

## Compliance Matrix

| Change Type | Check Against |
| --- | --- |
| New dependency | ADR-001, ADR-008 |
| Queue/job code | ADR-002 |
| Infrastructure | ADR-003, ADR-004, ADR-005 |
| Observability | ADR-006 |
| Tests | ADR-007 (no infra mocks) |
| HTTP/parsing | ADR-008 |
| Error handling | ADR-009 |
| Data storage | ADR-010 |
| API routes | ADR-011 |
| CI/CD | ADR-012 |
| Configuration | ADR-013 |
| Automation | ADR-014 |
| Architecture | ADR-015 |
| Coding standards | ADR-016 |
| Service comms | ADR-017 |
| Agent code | ADR-018 (Guard Functions, file ≤200/300, SDD) |
| Decisions | ADR-019 (anti-sycophancy, incubation) |
| Specs | ADR-020 (EARS, contract-first, properties) |

## Output

| ADR | Status | Notes |
| --- | --- | --- |
| ADR-002 | ✅ Compliant | Uses BullMQ with rate limiting |
| ADR-009 | ⚠️ Partial | Missing graceful shutdown handler |
| ADR-013 | ❌ Violation | Hardcoded Redis URL |

Severities: ❌ blocking, ⚠️ warning (fix before merge), ✅ compliant. No ADR covers change → flag for Architect.

## Related

- [ADR Index](../adr/index.md), [Architect Agent](../agents/architect.md), [Review Agent](../agents/review.md)
