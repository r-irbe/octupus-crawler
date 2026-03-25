# URL Frontier — Requirements

> EARS-format requirements for the distributed job queue, URL deduplication, BFS ordering, and bulk operations.
> Source: [REQUIREMENTS-AGNOSTIC.md](../../research/REQUIREMENTS-AGNOSTIC.md) §6.1

---

## 1. Job Queue

**REQ-DIST-001** (Ubiquitous)
The frontier shall derive job identifiers deterministically from the normalized URL (e.g., via cryptographic hash). The queue shall silently discard duplicate entries, guaranteeing idempotent enqueue.

**REQ-DIST-002** (Ubiquitous)
Each job's priority shall reflect its depth so that breadth-first traversal order is maintained.

**REQ-DIST-003** (Unwanted behaviour)
If a job fails, then the system shall retry it with exponential backoff. Default: 3 attempts, 1-second base delay.

**REQ-DIST-004** (Ubiquitous)
Entries from a single page shall be enqueued in a single batch operation (one round-trip to the state store).

**REQ-DIST-005** (Ubiquitous)
Completed and failed job metadata shall be retained up to configurable limits (e.g., 10,000 completed, 5,000 failed) enforced as sliding windows.

**REQ-DIST-006** (Ubiquitous)
All components shall reference a single, constant queue name.

### Acceptance Criteria

```gherkin
Given two FrontierEntries with the same normalized URL
When both are enqueued
Then only one job exists in the queue
And the second enqueue is silently discarded

Given a page at depth 2 discovering 50 URLs
When the URLs are enqueued
Then all 50 are submitted in a single batch operation

Given a job that fails
When it is retried
Then the retry uses exponential backoff (1s, 2s, 4s)
And after 3 failures the job is moved to failed
```

---

## Traceability Matrix

| Requirement | Source | Priority | Test Type |
| --- | --- | --- | --- |
| REQ-DIST-001 | §6.1 | MUST | Distributed |
| REQ-DIST-002 | §6.1 | MUST | Unit |
| REQ-DIST-003 | §6.1 | MUST | Unit + Distributed |
| REQ-DIST-004 | §6.1 | MUST | Integration |
| REQ-DIST-005 | §6.1 | MUST | Distributed |
| REQ-DIST-006 | §6.1 | MUST | Static analysis |

---

> **Provenance**: Created 2026-03-25 from REQUIREMENTS-AGNOSTIC.md §6.1. EARS conversion per ADR-020.
