# State Tracker: job-queue-infrastructure

## Branch: `work/job-queue-infrastructure`

## Started: 2026-03-28

## Current State

- **Phase**: G4 complete — scaffolding package

## Plan

Build `packages/job-queue` — BullMQ adapters for the 3 hexagonal port interfaces:
1. `BullMQQueueBackend` → implements `QueueBackend` (url-frontier)
2. `BullMQJobConsumer` → implements `JobConsumer` (core contract)
3. `BullMQQueueAdapter` → implements `QueueAdapter` (completion-detection ControlPlane)
4. Unit tests with mocked BullMQ
5. Integration tests with Redis Testcontainer

## ADRs

- ADR-002: BullMQ + Dragonfly job queue
- ADR-007: Testcontainers for infra tests
- ADR-015: Hexagonal architecture

## Tasks

| File | Status | Description |
| --- | --- | --- |
| package.json | not-started | Package scaffold with bullmq dep |
| bullmq-queue-backend.ts | not-started | QueueBackend adapter |
| bullmq-job-consumer.ts | not-started | JobConsumer adapter |
| bullmq-queue-adapter.ts | not-started | QueueAdapter for control plane |
| connection-config.ts | not-started | Zod-validated BullMQ connection config |
| *.unit.test.ts | not-started | Unit tests |
| *.integration.test.ts | not-started | Redis Testcontainer integration tests |
