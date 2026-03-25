# Virtual Memory Specs

Specifications for virtual memory capabilities for AI agents working on the IPF codebase.

## Documents

| Document | Description | Status |
| --- | --- | --- |
| [Requirements](requirements.md) | EARS requirements for virtual memory capabilities | Accepted |
| [Design](design.md) | Architecture and interfaces for virtual memory | Accepted |

## Overview

Virtual memory for AI agents applies operating system concepts (paging, compression, eviction) to manage agent context windows that cannot fit all needed information simultaneously. This enables agents to work on long-horizon, multi-file tasks that would otherwise exceed their effective context window.

## ADR References

- [ADR-022: Memory Governance §6](../../adr/ADR-022-memory-governance.md) — Virtual memory architecture specification
- [ADR-021: Context Collapse Prevention](../../adr/ADR-021-context-collapse-prevention.md) — Failure modes that virtual memory mitigates
- [ADR-018: Agentic Coding](../../adr/ADR-018-agentic-coding-conventions.md) — File size limits, selective loading, state tracker

---

> **Provenance**: Created 2026-03-25. Specifications for virtual memory capabilities referenced by ADR-022 §6.
