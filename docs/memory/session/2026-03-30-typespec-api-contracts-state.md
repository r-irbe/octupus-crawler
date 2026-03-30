# State Tracker: TypeSpec API Contracts

## Branch

`work/typespec-api-contracts`

## Tasks

| Task | Status | Commit |
| ---- | ------ | ------ |
| T-COMM-006: Install TypeSpec compiler + specs/ dir | done | 52a8a25 |
| T-COMM-007: Define CrawlerAPI service in TypeSpec | done | 52a8a25 |
| T-COMM-008: Add tsp compile step to CI | done | 52a8a25 |
| T-COMM-009: API versioning middleware with deprecation telemetry | done | 52a8a25 |

## Current State

G1-G7 complete. All 4 tasks implemented + committed. Guard functions 17/17 all pass.
Pending: G8 RALPH review, G9 worklog, G10-G11 report + spec update.

## Decisions

- TypeSpec specs live in `specs/` at repo root (contract-first, separate from implementation)
- OpenAPI 3.1 output generated to `specs/generated/`
- API versioning uses URL prefix (/api/v1/) per REQ-COMM-007

## Problems

(none yet)
