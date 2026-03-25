# Skill: Doc Maintenance

**Agent**: Documentation

Keep project documentation current: indexes, provenance, cross-references, lifecycle states. Triggered after every task set (Gate G9) and after memory promotion.

## Capabilities

- Update index.md files on document add/remove/change
- Verify and fix cross-references
- Update provenance (dates, reviewer)
- Maintain lifecycle states (Draft → Active → Deprecated)
- Verify documentation standards compliance
- Detect stale documentation via temporal decay (ADR-022)
- Feed validated learnings back into rules, skills, and instructions

## Post-Change Checklist

- [ ] index.md in same directory updated
- [ ] Parent index.md updated if new entry
- [ ] Provenance block updated with date
- [ ] Cross-references valid (no broken links)
- [ ] Table formatting correct
- [ ] Worklog entry exists for the task set (`docs/worklogs/YYYY-MM-DD-topic.md`)
- [ ] Worklog index updated
- [ ] Learnings from worklog assessed for memory promotion

## Learning Integration

After doc maintenance, check for improvements to feed back:

- **Rules** (`.claude/rules/`): Did a new anti-pattern emerge? Add it.
- **Skills** (`.claude/skills/`): Did a workflow improve? Update the skill.
- **Instructions** (`.github/instructions/`): Did a convention solidify? Codify it.
- **ADRs**: Did a decision prove wrong or right? Update the ADR consequences.

## Related

- [Documentation Standards](../guidelines/documentation-standards.md), [Documentation Agent](../agents/documentation.md)
- [Memory Promotion Workflow](../guidelines/memory-promotion-workflow.md) — learnings flow from session to project docs
- [ADR-018](../adr/ADR-018-agentic-coding-conventions.md) — context file size limits
- [ADR-022](../adr/ADR-022-memory-governance.md) — temporal decay drives staleness checks
