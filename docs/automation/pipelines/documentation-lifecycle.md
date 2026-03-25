# Pipeline: Documentation Lifecycle

**ADR**: [ADR-014](../../adr/ADR-014-automation-strategy.md) | **Triggers**: `file.changed`, `task.completed`, `branch.merged`, `memory.written`, `schedule.daily`

Automates all documentation maintenance. No doc task is manual.

## Automated Processes

1. **Index auto-rebuild** (on .md create/delete, merge): Scan directory → extract titles → regenerate index table → cascade parent indexes
2. **Cross-reference validation** (on .md change, daily): Extract all links → resolve paths → check targets exist → report dead/stale/orphaned
3. **Provenance auto-update** (on .md change): Check for provenance block → add if missing → update date if present
4. **Gap analysis** (weekly, on new features): Check packages for READMEs, ADR implementation refs, agent-skill links, guidelines with examples
5. **Memory tier management** (on memory write/promote, weekly): Session >7d not promoted → flag; short-term validated 3+ → suggest long-term; entries >30d unreferenced → archive
6. **Worklog auto-generation** (on task.completed): Collect task details → generate standard format → save to `docs/worklogs/`
7. **Dead link healing** (on dead link found): Fuzzy match for moved files → auto-fix if >80% confidence → else create ticket
8. **ADR lifecycle tracking** (on ADR change, weekly): Validate status, implementation refs, contradictions with newer ADRs, unmet validation targets

## Trigger Map

| Event | Processes |
| --- | --- |
| `file.changed` (.md) | Index rebuild, cross-ref validation, provenance update, ADR lifecycle (if ADR) |
| `task.completed` | Worklog generation, index rebuild, gap analysis (if feature) |
| `memory.written/promoted` | Memory tier management |
| `schedule.daily` | Cross-ref validation, dead link healing |
| `schedule.weekly` | Gap analysis, memory management, ADR lifecycle |

## Metrics

| Metric | Target |
| --- | --- |
| `docs.index_freshness` | <1 hour stale |
| `docs.dead_links` | 0 |
| `docs.orphaned_files` | 0 |
| `docs.provenance_coverage` | 100% |
| `docs.gap_score` | <5% undocumented |
| `docs.auto_fix_rate` | >80% dead links auto-healed |

## Related

- [Documentation Standards](../../guidelines/documentation-standards.md), [Memory Promotion Workflow](../../guidelines/memory-promotion-workflow.md)
- [Documentation Agent](../../agents/documentation.md), [Self-Improvement Loop](self-improvement-loop.md)
- [ADR-022](../../adr/ADR-022-memory-governance.md)
