// Eviction controller — priority-based LRU eviction
// Implements: T-VMEM-018, T-VMEM-019, T-VMEM-020
// REQ-VMEM-013, REQ-VMEM-014, REQ-VMEM-015

/** Priority levels for eviction (design.md §4). */
export type EvictionPriority = 0 | 1 | 2 | 3 | 4;

/** Page entry status. */
export type PageStatus = 'pinned' | 'loaded' | 'evicted';

/** Page table entry (design.md §5). */
export type PageEntry = {
  readonly _tag: 'PageEntry';
  readonly path: string;
  readonly status: PageStatus;
  readonly priority: EvictionPriority;
  readonly backingStore: string;
  readonly lastAccessed: number;
  readonly sizeTokens: number;
};

/** Eviction event for audit logging (REQ-VMEM-021). */
export type EvictionEvent = {
  readonly _tag: 'EvictionEvent';
  readonly evictedPath: string;
  readonly reason: 'lru' | 'manual' | 'budget';
  readonly priority: EvictionPriority;
  readonly freedTokens: number;
  readonly utilizationAtEviction: number;
  readonly timestamp: number;
};

/** Page fault event (REQ-VMEM-019). */
export type PageFaultEvent = {
  readonly _tag: 'PageFaultEvent';
  readonly path: string;
  readonly reason: string;
  readonly reloadCostTokens: number;
  readonly timestamp: number;
};

/** Mutable eviction controller managing the page table. */
export type EvictionController = {
  /** Register a page entry. */
  register(entry: Omit<PageEntry, '_tag'>): void;
  /** Access a page, updating lastAccessed. */
  access(path: string, taskNumber: number): void;
  /** Run eviction to free tokens (REQ-VMEM-013). */
  evict(tokensToFree: number, currentUtilization: number): readonly EvictionEvent[];
  /** Record a page fault (REQ-VMEM-018, REQ-VMEM-019). */
  pageFault(path: string, reason: string, reloadCostTokens: number): PageFaultEvent;
  /** Get all page entries. */
  entries(): readonly PageEntry[];
  /** Get a specific entry by path. */
  get(path: string): PageEntry | undefined;
  /** Get total loaded tokens. */
  loadedTokens(): number;
};

/** Paths that must never be evicted (REQ-VMEM-015). */
const DEFAULT_EXCLUSIONS = new Set([
  'state-tracker',
  'agent-definition',
  'instruction-set',
]);

/**
 * Create an eviction controller.
 * @param exclusionPaths - Additional paths that must never be evicted.
 */
export function createEvictionController(
  exclusionPaths: readonly string[] = [],
): EvictionController {
  const pages = new Map<string, PageEntry>();
  const exclusions = new Set([
    ...DEFAULT_EXCLUSIONS,
    ...exclusionPaths,
  ]);

  function isExcluded(path: string): boolean {
    if (exclusions.has(path)) return true;
    // Check if any exclusion pattern is a prefix
    for (const excl of exclusions) {
      if (path.startsWith(excl)) return true;
    }
    return false;
  }

  return {
    register(entry: Omit<PageEntry, '_tag'>): void {
      pages.set(entry.path, { _tag: 'PageEntry', ...entry });
    },

    access(path: string, taskNumber: number): void {
      const entry = pages.get(path);
      if (entry) {
        pages.set(path, { ...entry, lastAccessed: taskNumber });
      }
    },

    evict(
      tokensToFree: number,
      currentUtilization: number,
    ): readonly EvictionEvent[] {
      // Sort candidates by eviction priority (REQ-VMEM-014):
      // P4 stale → P3 reference → P2 recent; never P0/P1
      const candidates = [...pages.values()]
        .filter(
          (p) =>
            p.status === 'loaded' &&
            p.priority >= 2 &&
            !isExcluded(p.path),
        )
        .sort((a, b) => {
          // Higher priority number = evict first
          if (b.priority !== a.priority) return b.priority - a.priority;
          // Then LRU (lower lastAccessed = evict first)
          return a.lastAccessed - b.lastAccessed;
        });

      const events: EvictionEvent[] = [];
      let freed = 0;

      for (const candidate of candidates) {
        if (freed >= tokensToFree) break;

        const evicted: PageEntry = {
          ...candidate,
          status: 'evicted',
        };
        pages.set(candidate.path, evicted);

        events.push({
          _tag: 'EvictionEvent',
          evictedPath: candidate.path,
          reason: 'budget',
          priority: candidate.priority,
          freedTokens: candidate.sizeTokens,
          utilizationAtEviction: currentUtilization,
          timestamp: Date.now(),
        });

        freed += candidate.sizeTokens;
      }

      return events;
    },

    pageFault(
      path: string,
      reason: string,
      reloadCostTokens: number,
    ): PageFaultEvent {
      // Mark as loaded again
      const entry = pages.get(path);
      if (entry) {
        pages.set(path, {
          ...entry,
          status: 'loaded',
          sizeTokens: reloadCostTokens,
        });
      }

      return {
        _tag: 'PageFaultEvent',
        path,
        reason,
        reloadCostTokens,
        timestamp: Date.now(),
      };
    },

    entries(): readonly PageEntry[] {
      return [...pages.values()];
    },

    get(path: string): PageEntry | undefined {
      return pages.get(path);
    },

    loadedTokens(): number {
      let total = 0;
      for (const entry of pages.values()) {
        if (entry.status !== 'evicted') {
          total += entry.sizeTokens;
        }
      }
      return total;
    },
  };
}

/**
 * Classify a path into an eviction priority (design.md §4).
 */
export function classifyPriority(
  path: string,
  currentTaskFiles: ReadonlySet<string>,
  recentTaskFiles: ReadonlySet<string>,
  staleTaskThreshold: number,
  lastAccessedTask: number,
): EvictionPriority {
  // P0: State tracker, agent def, instructions
  if (
    path.includes('state-tracker') ||
    path.includes('AGENTS.md') ||
    path.includes('CLAUDE.md') ||
    path.includes('.instructions.')
  ) {
    return 0;
  }

  // P1: Current task files
  if (currentTaskFiles.has(path)) return 1;

  // P2: Recent task files (not yet distilled)
  if (recentTaskFiles.has(path)) return 2;

  // P4: Stale (accessed >N tasks ago)
  if (lastAccessedTask < staleTaskThreshold) return 4;

  // P3: Reference material (ADRs, guidelines, specs)
  return 3;
}
