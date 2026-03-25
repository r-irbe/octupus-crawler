# Patterns

Implementation patterns for the IPF distributed crawler. Each pattern documents a reusable solution to a common problem in the codebase.

## Documents

| Document | Description | ADR References |
| --- | --- | --- |
| [AsyncLocalStorage](async-local-storage.md) | Request-scoped context propagation (correlation IDs, tenancy, traces) | ADR-006, ADR-011, ADR-015 |

## Index

- [AsyncLocalStorage](async-local-storage.md) — Node.js `AsyncLocalStorage` for request-scoped context in Fastify and BullMQ workers

---

> **Provenance**: Created 2026-03-25. Pattern documentation directory for the IPF distributed crawler.
