# State Tracker: OTel + Changesets + CI Unification

## Branch
`work/otel-changesets-ci-unify`

## Tasks
| Task | Status | Commit |
|------|--------|--------|
| T-COMM-004: OTel tRPC middleware | not-started | |
| T-CICD-017: Configure Changesets | not-started | |
| T-CICD-018: Changesets GitHub Action | not-started | |
| T-CICD-022: ADR compliance scan | not-started | |
| T-CICD-023: Integrate CI workflows | not-started | |

## Current State
G1-G4 complete. Starting implementation.

## Decisions
- OTel tRPC middleware uses W3C traceparent header propagation
- Changesets configured for linked versioning across monorepo
- CI unification: merge unique jobs from agent-pr-validation into ci.yml, remove duplicates
- ADR compliance scan is advisory (non-blocking) per REQ-CICD-023

## Problems
(none yet)
