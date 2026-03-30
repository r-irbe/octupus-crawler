# State Tracker: OTel + Changesets + CI Unification

## Branch
`work/otel-changesets-ci-unify`

## Tasks
| Task | Status | Commit |
|------|--------|--------|
| T-COMM-004: OTel tRPC middleware | done | 5def77d |
| T-CICD-017: Configure Changesets | done | 5def77d |
| T-CICD-018: Changesets GitHub Action | done | 5def77d |
| T-CICD-022: ADR compliance scan | done | 5def77d |
| T-CICD-023: Integrate CI workflows | done | 5def77d |

## Current State
G1-G7 complete. Proceeding to G8 RALPH review.

## Decisions
- OTel tRPC middleware uses W3C traceparent header propagation
- Changesets configured for linked versioning across monorepo
- CI unification: merge unique jobs from agent-pr-validation into ci.yml, remove duplicates
- ADR compliance scan is advisory (non-blocking) per REQ-CICD-023

## Problems
(none yet)
