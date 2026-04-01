# Worklog — Fix CI Failures

**Date**: 2026-04-01
**Branch**: `work/fix-ci-failures`
**Scope**: GitHub Actions workflow fixes after initial push to r-irbe/octupus-crawler

## What Changed

### Root Causes

1. **release.yml** — `Full commit:` line at column 0 broke `run: |` YAML block (GitHub error: `Unexpected value 'Full commit'` at L135)
2. **package.json** — `onlyBuiltDependencies` corrupted by malformed `pnpm approve-builds` (individual characters instead of package names)
3. **version-packages.yml** — `.changeset/config.json` referenced non-existent repo `ipf-org/ipf`
4. **10 vitest configs** — Integration tests (requiring Docker/Testcontainers) included in default `test` command; fail when Docker is not running

### Files Modified

- `.github/workflows/release.yml` — Use separate `-m` flags for commit subject/body
- `package.json` — Fix `onlyBuiltDependencies` to 9 actual package names
- `.changeset/config.json` — Fix repo to `r-irbe/octupus-crawler`
- 10× `packages/*/vitest.config.ts` — Add `exclude: ['src/**/*.integration.test.ts']` to test section

## RALPH Review

**Verdict**: APPROVED

- 3 Minor sustained (C-002, T-001, T-002) — all resolved in follow-up commit
- No Critical or Major findings
- `onlyBuiltDependencies` fix noted as security improvement (narrows build scripts from wildcard to 9 specific packages)

## Learnings

- YAML `|` literal scalar blocks end when indentation drops below the block level — always check indentation of multi-line strings
- `pnpm approve-builds` can corrupt `package.json` if invoked with incorrect arguments
- Vitest `include` without matching `exclude` for integration tests causes silent failures when Docker is unavailable
