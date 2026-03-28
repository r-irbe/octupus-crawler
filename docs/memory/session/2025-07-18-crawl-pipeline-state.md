# State Tracker: crawl-pipeline T-CRAWL-009

## Branch: `work/crawl-pipeline`

## Started: 2025-07-18

## Current State

- **Phase**: G4 complete — implementing T-CRAWL-009

## Plan

1. Extract fetch stage to `fetch-stage.ts` following design.md FetchStage signature
2. Write unit test `fetch-stage.unit.test.ts`
3. Refactor `crawl-pipeline.ts` to use extracted function
4. Run G5 guard functions
5. Commit, RALPH review, merge

## Tasks

| Task | Status | Notes |
| --- | --- | --- |
| T-CRAWL-009 | in-progress | Fetch stage exists inline; extracting to match design.md pattern |
