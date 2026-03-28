// Scenario test: Full session lifecycle
// Validates: T-VMEM-035 → REQ-VMEM-013 to REQ-VMEM-019
// Load → exceed budget → evict → page-fault → reload

import { describe, it, expect } from 'vitest';
import { createContextBudget } from './context-budget.js';
import { createEvictionController } from './eviction-controller.js';
import { createPageTable } from './page-table.js';
import { distillTaskContext } from './context-distiller.js';
import type { ThresholdEvent } from './context-budget.js';
import type { TaskContext } from './context-distiller.js';

describe('full session lifecycle', () => {
  // T-VMEM-035: Load → exceed budget → evict → page-fault → reload
  it('handles complete session: load, exceed, evict, fault, reload', () => {
    // Setup
    const budget = createContextBudget('claude');
    const eviction = createEvictionController();
    const pageTable = createPageTable();
    const thresholdEvents: ThresholdEvent[] = [];
    budget.onThreshold((e) => thresholdEvents.push(e));

    // Phase 1: Load initial context (state tracker + task files)
    const stateTrackerTokens = 500;
    eviction.register({
      path: 'state-tracker.md',
      status: 'pinned',
      priority: 0,
      backingStore: 'docs/memory/session/tracker.md',
      lastAccessed: 1,
      sizeTokens: stateTrackerTokens,
    });
    budget.add(stateTrackerTokens, 1);
    pageTable.logPin('state-tracker.md', stateTrackerTokens);

    // Load task 1 files
    const task1Files = ['budget.ts', 'estimator.ts', 'chunk.ts'];
    for (const file of task1Files) {
      const tokens = 5_000;
      eviction.register({
        path: file,
        status: 'loaded',
        priority: 1,
        backingStore: `src/${file}`,
        lastAccessed: 1,
        sizeTokens: tokens,
      });
      budget.add(tokens, 1);
      pageTable.logLoad(file, tokens);
    }

    // Verify: loaded state
    expect(budget.snapshot().currentUsage).toBe(stateTrackerTokens + 15_000);
    expect(eviction.loadedTokens()).toBe(stateTrackerTokens + 15_000);

    // Phase 2: Complete task 1, distill context
    const task1Context: TaskContext = {
      taskId: 'TASK-001',
      status: 'completed',
      fullContext: 'x'.repeat(15_000),
      filesModified: task1Files,
      commitHash: 'abc123',
      keyDecisions: ['Used token estimation for budget tracking'],
    };
    const distilled = distillTaskContext(task1Context, 'claude');
    expect(distilled.distilledSize).toBeLessThan(distilled.originalSize);

    // Demote task 1 files to P2 (recent, completed)
    for (const file of task1Files) {
      const entry = eviction.get(file);
      if (entry) {
        eviction.register({ ...entry, priority: 2, _tag: undefined } as never);
        // Re-register with updated priority
        eviction.register({
          path: entry.path,
          status: 'loaded',
          priority: 2,
          backingStore: entry.backingStore,
          lastAccessed: entry.lastAccessed,
          sizeTokens: entry.sizeTokens,
        });
      }
    }

    // Phase 3: Load task 2 — exceed budget
    // Load large reference files to push past eviction threshold (50K)
    for (let i = 0; i < 8; i++) {
      const tokens = 6_000;
      const path = `ref${String(i)}.ts`;
      eviction.register({
        path,
        status: 'loaded',
        priority: 3,
        backingStore: `docs/${path}`,
        lastAccessed: 2,
        sizeTokens: tokens,
      });
      budget.add(tokens, 1);
      pageTable.logLoad(path, tokens);
    }

    // Should have triggered eviction threshold
    expect(budget.shouldEvict()).toBe(true);
    expect(thresholdEvents.length).toBeGreaterThan(0);

    // Phase 4: Run eviction to free space
    const snap = budget.snapshot();
    const toFree = snap.currentUsage - snap.evictionThreshold;
    const evictionEvents = eviction.evict(toFree, snap.utilizationPct);

    expect(evictionEvents.length).toBeGreaterThan(0);

    // Update budget for evictions
    for (const evt of evictionEvents) {
      budget.remove(evt.freedTokens, 1);
      pageTable.logEviction(evt.evictedPath, evt.freedTokens, evt.reason);
    }

    // Phase 5: Page fault — access evicted file
    const evictedPath = evictionEvents[0]!.evictedPath;
    const evictedEntry = eviction.get(evictedPath);
    expect(evictedEntry).toBeDefined();
    expect(evictedEntry!.status).toBe('evicted');

    // Reload
    const reloadCost = 5_000;
    const fault = eviction.pageFault(evictedPath, 'Cross-task dependency', reloadCost);
    budget.add(reloadCost, 1);
    pageTable.logPageFault(fault);

    // Verify reload state
    const reloaded = eviction.get(evictedPath);
    expect(reloaded).toBeDefined();
    expect(reloaded!.status).toBe('loaded');
    expect(reloaded!.sizeTokens).toBe(reloadCost);

    // Phase 6: Verify audit trail
    const log = pageTable.auditLog();
    const actions = log.map((e) => e.action);
    expect(actions).toContain('pin');
    expect(actions).toContain('load');
    expect(actions).toContain('evict');
    expect(actions).toContain('fault');

    // Verify state tracker was never evicted
    const stateEntry = eviction.get('state-tracker.md');
    expect(stateEntry!.status).toBe('pinned');
  });
});
