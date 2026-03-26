# Worklog: Core Contracts Implementation

| Field | Value |
| --- | --- |
| **Date** | 2026-03-26 |
| **Status** | Complete |
| **Topic** | Full implementation of the core-contracts spec (Phases 0–6) |
| **Spec** | `docs/specs/core-contracts/` (18 requirements, 33 tasks, 7 phases) |
| **Branch** | `work/core-contracts` |
| **Commits** | 18 (`b0a34c0`..`5dd287f`) |

## Summary

Implemented the core-contracts specification — the foundation of the IPF Crawler's clean architecture. This covers all contract interfaces, discriminated union error types, branded domain types, Zod-validated configuration, composition root with DI, signal handlers, static analysis enforcement, and architecture compliance tests.

## Stats

- **63 files changed**, 4,645 insertions, 37 deletions
- **88 tests** across 15 test files (65 core + 23 config)
- **22 source files** (18 core + 4 config)
- **4 packages** touched: `@ipf/core`, `@ipf/config`, `@ipf/eslint-config`, `@ipf/testing`

## Completed Phases

### Phase 0: Monorepo Scaffold (`b0a34c0`)

- Root `package.json` with pnpm workspaces, Turborepo, Node 22
- `tsconfig.base.json` with strict mode, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`
- 4 packages: core, config, eslint-config, testing
- All with ESLint, Vitest, TypeScript configs

### Phase 1: Contract Types (`13c5a5d`, `3795aed`, `bc07226`)

| Artifact | File | Tests |
| --- | --- | --- |
| FetchError (9 variants) | `core/src/errors/fetch-error.ts` | 11 tests |
| UrlError (3 variants) | `core/src/errors/url-error.ts` | 5 tests |
| CrawlError (superset + 3) | `core/src/errors/crawl-error.ts` | 6 tests |
| QueueError | `core/src/errors/queue-error.ts` | — |
| CrawlUrl branded type | `core/src/domain/crawl-url.ts` | 3 tests |
| 8 contract interfaces | `core/src/contracts/*.ts` | 8 tests |
| Disposable interface | `core/src/contracts/disposable.ts` | 2 tests |
| Result type alias | `core/src/types/result.ts` | 3 tests |

### Phase 2: Configuration (`5d4b0ad`)

| Artifact | File | Tests |
| --- | --- | --- |
| Zod config schema | `config/src/config-schema.ts` | 9 tests |
| loadConfig() → Result | `config/src/load-config.ts` | 4 tests |
| Narrow config slices | `config/src/config-slices.ts` | 4 tests |

### Phase 3: Static Analysis Rules (`ee07cfa`)

| Rule | ESLint Plugin | Requirement |
| --- | --- | --- |
| Layer boundaries | `import-x/no-restricted-paths` | REQ-ARCH-001..005 |
| Circular dependency detection | `import-x/no-cycle` | REQ-ARCH-007 |
| Test boundaries | `import-x/no-restricted-paths` | REQ-ARCH-008 |
| Contracts purity | `no-restricted-syntax` | REQ-ARCH-002 |

### Phase 4: Composition Root (`78f0c4a`)

- Factory-based DI with `CompositionRootConfig`
- Phased wiring sequence per REQ-ARCH-006
- 10 unit tests

### Phase 5: Composition Root Safety (`78f0c4a`)

- Singleton guard (throws on second init)
- Reverse-order cleanup on partial failure
- Signal handlers (SIGTERM/SIGINT) with once-only shutdown
- 5 signal handler tests

### Phase 6: Architecture Compliance Tests (`4f28533`)

- 2 integration tests: zero circular deps (core, config)
- 2 integration tests: zero layer boundary violations (core, config)
- 1 integration test: contracts purity (zero runtime code)
- ESLint JSON output with per-package caching

### G8 Review Findings Fixed (`f120892`)

| Finding | Fix |
| --- | --- |
| AR-6: package exports | Deduplicated, added missing entries |
| S-1/P4: resetCompositionRoot | `@internal` JSDoc annotation |
| AC-1/P4: DisposableEntry | Extends Disposable interface |
| AR-2/P4: fire-and-forget | `createCompositionRoot` now async, awaits cleanup |
| T-ARCH-032: secret redaction | `toSafeLog()` + `SENSITIVE_FIELDS` in config |
| T-ARCH-033: URL credential stripping | `stripUrlCredentials()` integrated in all error constructors |
| P-1/P6: ESLint cache | Results cached per-package in integration tests |

### Dependency Upgrade (`5fdd140`)

- TypeScript 5.x → 6.0.2
- ESLint 9 → 10
- Zod 3 → 4.3.6 (migrated to `zod/v4` import)
- Vitest 3 → 4.1.1 (updated `vi.fn` generic syntax)
- pnpm 9 → 10.33.0

## Decisions Made

| # | Decision | Rationale |
| --- | --- | --- |
| 1 | Use `kind` field for error unions (not `_tag`) | Design.md specifies `kind`; `_tag` reserved for domain entities |
| 2 | Config `loadConfig` returns Result, not throws | REQ-ARCH-014 mandates Result return |
| 3 | `createCompositionRoot` is async | Needed to await cleanup on partial failure |
| 4 | Disable `unbound-method` for test files | `vi.fn()` mocks trigger false positives |

## Deferred Items

None — all tasks complete including deferred G8 findings (T-ARCH-032, T-ARCH-033).

## Learnings

1. **Vitest 4 `vi.fn` generic syntax changed**: `vi.fn<[], Promise<void>>()` → `vi.fn<() => Promise<void>>()`
2. **Zod 4 requires explicit import**: Default `'zod'` gives v3 compat layer; must use `'zod/v4'` for native API (`z.url()` vs `z.string().url()`)
3. **Architecture integration tests**: Running ESLint programmatically via `execSync` with JSON output works well for verifying rules hold; caching per-package cuts time by ~60%
4. **`@types/node` + `types: ["node"]`**: Both needed in devDependencies and tsconfig for Node.js APIs in a library package
