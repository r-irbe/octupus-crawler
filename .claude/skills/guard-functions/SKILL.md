---
name: guard-functions
description: Run typecheck+lint+test chain with retry logic
---

# Guard Functions Skill

> **Canonical**: [docs/skills/quality-gate-enforcement.md](../../../docs/skills/quality-gate-enforcement.md) | Claude Code implementation

Run the full guard function chain before every commit. This is the enforcement mechanism for code quality gates.

## Execution Steps

**PREFERRED**: Use the verification script for automatic retry and structured output:

```bash
pnpm verify:guards
```

This runs typecheck → lint → test with retry logic (3 attempts) and produces a structured pass/fail report.

**MANUAL** (only when script unavailable):

1. Run TypeScript type checking:
   ```bash
   pnpm turbo typecheck
   ```
   **Must**: zero errors

2. Run ESLint:
   ```bash
   pnpm turbo lint
   ```
   **Must**: zero errors AND zero warnings

3. Run tests:
   ```bash
   pnpm turbo test
   ```
   **Must**: 100% pass rate

## Retry Logic

- **Attempt 1**: Run full chain. If any step fails, classify the failure.
- **Attempt 2**: Fix the issue, re-run full chain.
- **Attempt 3**: Fix the issue, re-run full chain.
- **After 3 failures**: STOP. Escalate to user with:
  - Failure classification (specification / format / logic / tool-infra)
  - What was attempted
  - Which specific guard failed
  - Error output

## Failure Classification

| Type | Symptoms | Recovery |
| --- | --- | --- |
| Specification | Types don't match spec | Update spec or code to align |
| Format | Lint errors, naming | Fix formatting, add annotations |
| Logic | Tests fail, wrong behavior | Reduce scope 50%, retry |
| Tool/Infra | Build fails, env issue | Check tool availability, env setup |

## After Success

```bash
git add -A && git commit -m "<type>(<scope>): <description>"
```

Update the state tracker with commit hash and mark task done.
