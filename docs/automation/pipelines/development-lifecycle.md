# Pipeline: Development Lifecycle

**ADR**: [ADR-014](../../adr/ADR-014-automation-strategy.md) | **Triggers**: `task.assigned`, `task.completed`, `task.blocked`, `task.failed`

Full SDLC automation from requirement to merged code. Every task follows this pipeline automatically.

## Stages

1. **Context Pre-Fetch** (automated, on `task.assigned`): Load relevant ADRs, memory, worklogs. Analyze codebase, map dependencies. Bundle as context package for agent
2. **Design** (Architect Agent, conditional): Skip for bugfixes/refactors/tests/docs. Required for features, architecture changes, new packages. Must produce all three spec documents (`requirements.md`, `design.md`, `tasks.md`) using EARS format. Stage does not complete until all three docs are validated. Belief ≥80% gate
3. **Branch Setup** (automated): Create `work/<task>/<agent>/<sub-task>` per git-safety skill
4. **Implement** (Implementation Agent): code-generation + adr-compliance + git-safety skills. Continuous lint on save, ADR compliance + secrets scan on commit
5. **Test** (Test Agent, parallel with #4): Test level per change type — pure function → unit; service → unit+integration; API → +contract; full feature → +e2e
6. **Quality Gate** (automated, blocking): tsc strict, ESLint, 100% test pass, coverage ≥80% business / ≥60% overall, ADR compliance, secrets scan, dependency audit, conventional commits
7. **Review** (Review Agent + Council): PR creation → council activation → 3-round process → consensus vote
8. **Merge & Cleanup** (automated, on `pr.approved`): Squash merge → delete work branch → fire `branch.merged`
9. **Post-Task** (Documentation Agent): Session memory, worklog, index updates, memory promotion, metrics

## Failure Handling

| Failure | Response |
| --- | --- |
| Context pre-fetch | Log warning, proceed with partial context |
| Design belief <80% | Escalate to user |
| Quality gate fails | Report to agent, loop to Stage 4 (max 3 total attempts per ADR-018, then escalate) |
| Review rejects | Report findings, loop to Stage 4 (counts toward 3-attempt limit) |
| Merge conflict | Escalate to Gateway for resolution |
| Post-task fails | Log error, retry once |

## Metrics

| Metric | Description |
| --- | --- |
| `task.duration` | Assigned to completed |
| `task.rework_count` | Quality gate loop iterations |
| `task.stage_durations` | Time per stage |
| `task.belief_escalations` | Belief threshold triggers |

## Related

- [Quality Gates](quality-gates.md), [Release Pipeline](release-pipeline.md), [Self-Improvement Loop](self-improvement-loop.md)
- [ADR-018](../../adr/ADR-018-agentic-coding-conventions.md), [ADR-020](../../adr/ADR-020-spec-driven-development.md)
