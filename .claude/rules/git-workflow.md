# Git Workflow Rules

## Branch Safety

- Never commit directly to `main`
- Feature branches: `work/<task-slug>`
- Multi-agent branches: `work/<task>/<agent>/<sub-task>`
- Never push with `--force` on shared branches

## Commit Protocol

- Conventional commits: `<type>(<scope>): <description>`
- Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `ci`
- One logical change per commit
- Run guard functions BEFORE every commit:
  ```bash
  pnpm turbo typecheck && pnpm turbo lint && pnpm turbo test
  ```

## Provenance

- Agent commits include trailers: `Agent: <name>`, `Requirement: <REQ-ID>`, `Tool: <tool-name>`
- Every commit traceable to a requirement in tasks.md

## Guard Function Chain

1. `pnpm turbo typecheck` — zero errors
2. `pnpm turbo lint` — zero errors + warnings
3. `pnpm turbo test` — 100% pass

3 total attempts (1 initial + 2 retries). If all fail → STOP, escalate to user.

## State Tracker

- Create `docs/memory/session/YYYY-MM-DD-<slug>-state.md` before starting work
- Update after every task completion (commit hash, status, notes)
- Re-read before starting each new task
