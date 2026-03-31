# State Tracker: Data Layer Benchmarks

## Branch

`work/data-layer-benchmarks`

## Tasks

| Task | Status | Commit |
| ---- | ------ | ------ |
| T-DATA-034: Benchmark URL hash lookup < 1ms at 10M rows | done | a7afec1 |
| T-DATA-035: Benchmark batch insert > 10K rows/sec | done | a7afec1 |
| T-DATA-036: Benchmark S3 write > 1K pages/sec per worker | done | a7afec1 |

## Current State

G1-G7 complete. Pending G8 RALPH, G9-G11 + merge.

## Decisions

- Benchmark tests in packages/database/src/ as *.benchmark.test.ts
- Use existing Testcontainer helpers (startTestDatabase, startMinioContainer)
- Scale-appropriate row counts: 10M rows for hash lookup (full requirement), 100K for batch insert
- S3 benchmark uses parallel writes to test throughput

## Problems

(none yet)
