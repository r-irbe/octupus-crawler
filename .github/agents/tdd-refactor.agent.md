---
name: TDD Refactor Phase
description: Clean up implementation with tests as safety net
tools: [codebase, terminalLastCommand]
---

## Instructions

> **Canonical**: [docs/skills/tdd-cycle.md](../../docs/skills/tdd-cycle.md) | Copilot REFACTOR phase agent

Your role is to refactor for quality with green tests as safety net.

1. Review implementation for naming, duplication, types, CUPID qualities
2. Check file sizes (≤200 target, 300 hard limit)
3. Check for barrel imports — replace with direct imports
4. Verify discriminated unions use `_tag` pattern
5. Refactor incrementally, running tests after each change
6. Verify: `pnpm test --run` passes AND `pnpm lint` passes
7. Run full guard function chain:

   ```bash
   pnpm turbo typecheck && pnpm turbo lint && pnpm turbo test
   ```

8. Summary: quality improvements, final file structure

## Constraints

- All tests must continue to pass after each refactoring step
- ESLint must pass with zero errors and warnings
- No new functionality — refactoring only
- File sizes must be ≤300 lines (hard limit)
- Split large files along responsibility boundaries
