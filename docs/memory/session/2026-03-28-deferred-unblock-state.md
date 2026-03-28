# State Tracker: deferred-unblock

## Branch: `work/deferred-unblock`

## Started: 2026-03-28

## Current State

- **Phase**: G4 complete — about to implement

## Plan

1. T-AGENT-089: Custom ESLint rule for OTel first-import
2. T-AGENT-106: Verification test for the rule
3. T-COORD-025: Integration test for state-store connection with auth
4. T-COORD-026: Distributed test for leader election (two coordinators)
5. T-COORD-027: Distributed test for failover (leader crash, standby takeover)
6. G5-G11 gates

## Tasks

| Task | Spec | Status | Notes |
| --- | --- | --- | --- |
| T-AGENT-089 | agentic-setup | not-started | ESLint rule for OTel first-import |
| T-AGENT-106 | agentic-setup | not-started | Verification test using RuleTester |
| T-COORD-025 | completion-detection | not-started | Redis Testcontainer + auth |
| T-COORD-026 | completion-detection | not-started | Two coordinators competing for lease |
| T-COORD-027 | completion-detection | not-started | Leader crash, standby takeover |
