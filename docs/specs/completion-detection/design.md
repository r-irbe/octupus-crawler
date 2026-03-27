# Completion Detection & Control Plane — Design

> Architecture for crawl completion detection, coordinator lifecycle, and control plane.
> Implements: [requirements.md](requirements.md) | ADRs: [ADR-002](../../adr/ADR-002-job-queue-system.md), [ADR-009](../../adr/ADR-009-resilience-patterns.md)

---

## 1. Coordinator Architecture

```mermaid
graph TD
    subgraph Coordinator
        POLL[Poll Loop]
        CD[Completion Detector]
        BO[Backoff Controller]
        OG[Once Guard]
    end

    subgraph ControlPlane
        STATE[State Query]
        PAUSE[Pause/Resume]
        CANCEL[Cancel]
    end

    POLL -->|queue counts| CD
    CD -->|pending=0, done>0| COMPLETE[Complete]
    CD -->|pending=0, done=0| EMPTY[Empty Queue Warning]
    CD -->|store error| BO
    BO -->|skip ticks| POLL
    BO -->|25 failures| ABORT[Abort]
    OG -->|once| POLL

    STATE -->|live query| QUEUE[(Job Queue)]
    PAUSE --> QUEUE
    CANCEL --> QUEUE
```

## 2. Completion State Machine

```mermaid
stateDiagram-v2
    [*] --> Polling
    Polling --> Complete : pending=0 AND done>0
    Polling --> EmptyWarning : pending=0 AND done=0 (1st)
    EmptyWarning --> EmptyComplete : pending=0 AND done=0 (2nd)
    Polling --> Backoff : store error
    Backoff --> Polling : backoff elapsed
    Backoff --> Aborted : 25 consecutive failures
    Polling --> RestartWarning : done>0 AND no live events (1st poll)
    RestartWarning --> Polling : continue polling

    Complete --> [*]
    EmptyComplete --> [*]
    Aborted --> [*]
```

## 3. Backoff Strategy

```typescript
interface BackoffController {
  readonly consecutiveFailures: number
  onStoreError(): void           // increment, compute next skip
  onStoreSuccess(): void         // reset to 0
  shouldSkipTick(): boolean      // true if in backoff period
  isAborted(): boolean           // true if failures >= threshold
}
```

- Exponential backoff: skip `2^n` poll ticks (capped at max interval)
- Abort threshold: 25 consecutive failures (~12 minutes at 30s polls)
- Covers: REQ-DIST-015

## 4. Control Plane State Derivation

State is derived from live queue queries, not cached:

```typescript
function deriveState(queueCounts: QueueCounts, isCancelled: boolean): CrawlState {
  if (isCancelled) return 'cancelled'
  if (queueCounts.paused) return 'paused'
  // pending MUST include delayed jobs (RALPH F-001)
  const pending = queueCounts.waiting + queueCounts.active + queueCounts.delayed
  if (pending === 0 && queueCounts.done > 0) return 'completed'
  if (pending === 0 && queueCounts.done === 0) return 'idle'
  return 'running'
}
```

Covers: REQ-DIST-017

## 5. Idempotent Cancel

```typescript
class ControlPlaneAdapter implements ControlPlane {
  private cancelPromise: Promise<void> | null = null
  private cancelResult: Result<void, QueueError> | undefined

  async cancel(): AsyncResult<void, QueueError> {
    // Deduplicate concurrent cancel calls
    if (!this.cancelPromise) {
      this.cancelPromise = this.doCancel()
    }
    await this.cancelPromise
    // RALPH F-002: propagate obliterate error, don't swallow
    return this.cancelResult ?? ok(undefined)
  }
}
```

Covers: REQ-DIST-019

## 6. Design Decisions

| Decision | Choice | Rationale |
| --- | --- | --- |
| Polling interval | Configurable (default: 1s) | Balance responsiveness vs. store load |
| State derivation | Live query, not cached | Fresh state for reliable decisions (REQ-DIST-017) |
| Completion semantics | pending=0 AND done>0 | Accounts for all job states |
| Abort threshold | 25 failures | ~12 min tolerance for transient outages |
| Cancel idempotency | Promise deduplication | Thread-safe convergence (REQ-DIST-019) |
| Cancel error propagation | Propagate Result from obliterate | RALPH F-002: interface contract requires callers can detect failure |
| Once guard | Boolean flag | Prevents overlapping polls (REQ-DIST-016) |
| Poll scheduling | Recursive setTimeout (not setInterval) | RALPH F-003: prevents overlapping ticks under slow network |
| Leader election | Redis SETNX with TTL | Simple, state-store-native HA (REQ-DIST-023) |
| Lease renewal | lease_ttl / 3 interval | Prevents unnecessary failover (REQ-DIST-026) |
| Leader release | get + conditional del (TOCTOU) | RALPH F-004: not atomic — requires future compareAndDelete for full safety |

## 7. Coordinator High Availability

### Leader Election Model

```mermaid
sequenceDiagram
    participant C1 as Coordinator 1
    participant C2 as Coordinator 2 (standby)
    participant Redis as State Store

    C1->>Redis: SETNX coordinator:leader {id: C1} EX 30
    Redis-->>C1: OK (acquired)
    C2->>Redis: SETNX coordinator:leader {id: C2} EX 30
    Redis-->>C2: FAIL (already held)

    loop Every 10s (TTL/3)
        C1->>Redis: SET coordinator:leader {id: C1} EX 30 XX
        Redis-->>C1: OK (renewed)
    end

    Note over C1: C1 crashes / network partition
    Note over Redis: Lease expires after 30s

    C2->>Redis: SETNX coordinator:leader {id: C2} EX 30
    Redis-->>C2: OK (acquired)
    C2->>Redis: Live query: derive state
    C2->>C2: Resume polling from live state
```

### Election Protocol

```typescript
interface LeaderElection {
  readonly coordinatorId: string
  readonly leaseTtlMs: number        // Default: 30_000ms
  readonly renewIntervalMs: number   // leaseTtlMs / 3

  tryAcquire(): AsyncResult<boolean, QueueError>
  renew(): AsyncResult<boolean, QueueError>
  release(): AsyncResult<void, QueueError>
  isLeader(): boolean
}
```

**Key invariants:**

- **Lease key**: `coordinator:leader` in the state store
- **SETNX semantics**: Only one coordinator acquires; others fail safely
- **Lease auto-expiry**: TTL ensures crashed leaders are eventually replaced
- **Renewal at TTL/3**: Renew at 10s for 30s TTL — allows 2 missed renewals before expiry
- **State re-derivation**: New leader queries live queue state (REQ-DIST-025), never trusts in-memory state from predecessor
- **Fencing**: Coordinator checks `isLeader()` before every poll tick and every control plane command (REQ-DIST-027)

### Failover State Machine

```mermaid
stateDiagram-v2
    [*] --> Standby
    Standby --> AcquiringLease : tryAcquire()
    AcquiringLease --> Leader : lease acquired
    AcquiringLease --> Standby : lease held by other

    Leader --> Renewing : renewal interval
    Renewing --> Leader : renewed OK
    Renewing --> LeaseLost : renewal failed

    LeaseLost --> Standby : stop polling, yield
    Leader --> Standby : explicit release

    Leader --> Polling : isLeader() check
    Polling --> Leader : poll complete
```

Covers: REQ-DIST-023 to 027

---

> **Provenance**: Created 2026-03-25. Architect Agent design for completion detection per ADR-002/009/020.
