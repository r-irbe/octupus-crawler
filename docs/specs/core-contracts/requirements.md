# Core Contracts & Architecture — Requirements

> EARS-format requirements for clean architecture, dependency boundaries, contract interfaces, error handling, and configuration interfaces.
> Source: [REQUIREMENTS-AGNOSTIC.md](../../research/REQUIREMENTS-AGNOSTIC.md) §2

---

## 1. Layered Architecture

**REQ-ARCH-001** (Ubiquitous)
The system shall follow a clean architecture with four layers: Contracts (pure type boundary), Core/Domain (domain logic), Infrastructure (concrete adapters), and Application (orchestration + composition root). The dependency graph shall be strictly inward.

**REQ-ARCH-002** (Ubiquitous)
The Contracts layer shall contain zero runtime code — only interface or type-level constructs. It shall define: `Frontier`, `Fetcher`, `Logger`, `CrawlMetrics`, `JobEventSource`, `JobConsumer`, `LinkExtractor`, `ControlPlane`.

**REQ-ARCH-003** (Ubiquitous)
The Core domain shall depend only on contract type imports and its own modules. It shall not import from Infrastructure or Application layers.

**REQ-ARCH-004** (Ubiquitous)
Infrastructure adapters shall implement contract interfaces and shall not import from the Application layer. They may depend on Core types and Contract types.

**REQ-ARCH-005** (Ubiquitous)
Application orchestration modules shall not import infrastructure adapters directly. They shall depend exclusively on contract types and core exports. Only the composition root is exempt.

**REQ-ARCH-006** (Ubiquitous)
There shall be exactly one composition root. The composition root shall: (1) load and validate configuration, (2) instantiate all infrastructure adapters, (3) wire adapters into application modules, (4) register process signal handlers, (5) execute a phased shutdown sequence.

### Acceptance Criteria — Layered Architecture

```gherkin
Given the codebase dependency graph
When static analysis is run
Then no module in Core imports from Infrastructure or Application
And no module in Infrastructure imports from Application
And no module in Application (except composition root) imports Infrastructure
And the Contracts layer contains zero runtime expressions
```

## 2. Dependency Rules

**REQ-ARCH-007** (Ubiquitous)
The system shall have zero circular dependencies across all source and test modules. This shall be enforced by static analysis at build time.

**REQ-ARCH-008** (Ubiquitous)
Test helpers shall not import test suites. Production code shall not import any test code.

### Acceptance Criteria — Dependency Rules

```gherkin
Given the full module graph (source + test)
When the circular dependency checker runs
Then zero cycles are reported
And no production module imports from test directories
```

## 3. Resource Management

**REQ-ARCH-009** (Ubiquitous)
All stateful contracts that hold infrastructure resources (connections, event listeners, background loops) shall provide a deterministic cleanup mechanism. Contracts requiring cleanup: `Frontier`, `ControlPlane`, `JobConsumer`, `JobEventSource`.

**REQ-ARCH-010** (Ubiquitous)
Synchronous, CPU-bound contracts (`LinkExtractor`, `Logger`, `CrawlMetrics`) shall use synchronous interfaces. I/O-bound contracts (`Fetcher`, `Frontier`) shall use asynchronous wrappers with typed error channels.

### Acceptance Criteria — Resource Management

```gherkin
Given a Frontier, ControlPlane, JobConsumer, or JobEventSource instance
When close() or dispose() is called
Then all held connections and background loops are terminated
And no resource leaks are detected
```

## 4. Error Handling

**REQ-ARCH-011** (Ubiquitous)
The system shall use a typed error channel for domain errors. Domain errors shall be returned as typed values within a `Result<T, E>` wrapper — never thrown as exceptions. Exceptions are permitted only in: (a) composition root for fatal startup errors, (b) worker re-throw for queue retry.

**REQ-ARCH-012** (Ubiquitous)
All errors shall use discriminated unions keyed by a `kind` field. The system shall define three error families: `FetchError` (9 variants), `UrlError` (3 variants), and `CrawlError` (superset + 3 crawl-specific variants).

**REQ-ARCH-013** (Ubiquitous)
The system shall provide typed error constructor functions that enforce correct fields at compile time.

### Acceptance Criteria — Error Handling

```gherkin
Given a domain function that can fail
When it encounters an error condition
Then it returns a Result with a discriminated-union error (not throws)
And the error has a kind field matching one of the defined variants
And the error includes all required fields for its variant
```

## 5. Configuration

**REQ-ARCH-014** (Ubiquitous)
All configuration shall be loaded from environment variables and validated at startup via a schema validator. Configuration loading shall return a typed `Result` — never throw. On validation failure, it shall produce a structured error with a human-readable message.

**REQ-ARCH-015** (Ubiquitous)
Configuration consumers shall define narrow types containing only the fields they require, relying on structural subtyping.

### Acceptance Criteria — Configuration

```gherkin
Given environment variables with an invalid value
When configuration is loaded and validated
Then a Result.err is returned with a human-readable validation message
And the application does not throw during config loading
```

---

## Traceability Matrix

| Requirement | Source | Priority | Test Type |
| --- | --- | --- | --- |
| REQ-ARCH-001 | §2.1 | MUST | Static analysis |
| REQ-ARCH-002 | §2.1 | MUST | Static analysis |
| REQ-ARCH-003 | §2.1 | MUST | Static analysis |
| REQ-ARCH-004 | §2.1 | MUST | Static analysis |
| REQ-ARCH-005 | §2.1 | MUST | Static analysis |
| REQ-ARCH-006 | §2.1 | MUST | Integration |
| REQ-ARCH-007 | §2.2 | MUST | Static analysis |
| REQ-ARCH-008 | §2.2 | MUST | Static analysis |
| REQ-ARCH-009 | §2.3 | MUST | Unit + Integration |
| REQ-ARCH-010 | §2.3 | MUST | Unit |
| REQ-ARCH-011 | §2.4 | MUST | Unit |
| REQ-ARCH-012 | §2.4 | MUST | Unit |
| REQ-ARCH-013 | §2.4 | MUST | Unit |
| REQ-ARCH-014 | §2.5 | MUST | Unit |
| REQ-ARCH-015 | §2.5 | SHOULD | Unit |

---

> **Provenance**: Created 2026-03-25 from REQUIREMENTS-AGNOSTIC.md §2. EARS conversion per ADR-020.
