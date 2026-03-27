# Infrastructure — Tasks

> Implementation tasks traceable to [requirements.md](requirements.md). Dependency-ordered.
> Design: [design.md](design.md)

---

## Phase 1: Container Image

- [x] **T-INFRA-001**: Create multi-stage Dockerfile → REQ-INFRA-001
- [x] **T-INFRA-002**: Configure non-root user in production stage → REQ-INFRA-002
- [x] **T-INFRA-003**: Create .dockerignore excluding artifacts and docs → REQ-INFRA-003

## Phase 2: Local Development

- [x] **T-INFRA-004**: Create docker-compose.dev.yml with all 4 services → REQ-INFRA-017, REQ-INFRA-019
- [x] **T-INFRA-005**: Configure Dragonfly with appendonly + health check → REQ-INFRA-009, REQ-INFRA-010
- [x] **T-INFRA-006**: Configure environment variables for crawler container → REQ-INFRA-011, REQ-INFRA-018
- [x] **T-INFRA-007**: Verify single-command startup (`docker compose up`) → REQ-INFRA-017

## Phase 3: Monitoring Config

- [x] **T-INFRA-008**: Create Prometheus scrape config → REQ-INFRA-012
- [x] **T-INFRA-009**: Create alert rules YAML file → REQ-INFRA-014
- [x] **T-INFRA-010**: Create Grafana dashboard JSON (8 metrics) → REQ-INFRA-013
- [x] **T-INFRA-011**: Create Grafana provisioning config → REQ-INFRA-013

## Phase 4: Kubernetes Manifests

- [x] **T-INFRA-012**: Create crawler Deployment with resource limits → REQ-INFRA-004, REQ-INFRA-008
- [x] **T-INFRA-013**: Configure liveness probe (/health) → REQ-INFRA-005
- [x] **T-INFRA-014**: Configure readiness probe (/readyz) → REQ-INFRA-006
- [x] **T-INFRA-015**: Set restart policy (Always) → REQ-INFRA-007
- [x] **T-INFRA-016**: Create Secret manifest for REDIS_URL → REQ-INFRA-016
- [x] **T-INFRA-017**: Create Dragonfly StatefulSet with PVC → REQ-INFRA-009

## Phase 5: Documentation

- [x] **T-INFRA-018**: Create environment variable reference table → REQ-INFRA-015
- [x] **T-INFRA-019**: Add Kustomize overlays (dev, staging, prod) → ADR-004

## Phase 6: Persistence & Documentation

- [x] **T-INFRA-023**: Configure Prometheus named volume for data persistence across container restarts → REQ-INFRA-020
- [x] **T-INFRA-024**: Create runbook documents in `docs/runbooks/` for all alert annotations → REQ-INFRA-021

## Phase 7: Verification

- [x] **T-INFRA-020**: Build image, verify non-root user, check size → REQ-INFRA-001, 002
- [ ] **T-INFRA-021**: Test docker compose up end-to-end → REQ-INFRA-017
- [ ] **T-INFRA-022**: Verify Prometheus scrapes crawler metrics → REQ-INFRA-012
- [ ] **T-INFRA-025**: Verify Prometheus data persists after container restart → REQ-INFRA-020
- [x] **T-INFRA-026**: Verify all runbook URLs resolve to existing documents → REQ-INFRA-021

---

## Dependencies

| Task | Depends On | Blocks |
| --- | --- | --- |
| Phase 1 (image) | application-lifecycle (main.ts), observability | Phase 2 |
| Phase 2 (local dev) | Phase 1 | Phase 6 |
| Phase 3 (monitoring) | observability (metric names), alerting (rules) | Phase 4 |
| Phase 4 (K8s) | Phase 1, Phase 3 | Phase 6 |
| Phase 5 (docs) | Phase 2, Phase 4 | — |
| Phase 6 (persistence/docs) | Phase 3, alerting (annotations) | Phase 7 |
| Phase 7 (verify) | Phases 1-6 | — |

---

> **Provenance**: Created 2026-03-25. Implementation Agent task decomposition per ADR-020. Updated 2026-03-25: added Phase 6 (REQ-INFRA-020–021 Prometheus persistence, runbooks).
