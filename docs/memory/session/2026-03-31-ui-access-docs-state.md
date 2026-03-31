# State Tracker: UI Access Documentation

**Branch**: `work/ui-access-docs`
**Started**: 2026-03-31
**Status**: Complete

## Task

Add UI access documentation to README and wire Jaeger tracing backend into docker-compose.

## Changes

1. **`infra/docker/docker-compose.dev.yml`**: Added Jaeger all-in-one service (ports 16686/4317/4318), added `OTEL_EXPORTER_OTLP_ENDPOINT` to crawler env, added `jaeger` to crawler depends_on
2. **`infra/monitoring/provisioning/datasources/datasources.yml`**: Added Jaeger datasource for Grafana
3. **`README.md`**: Added "Accessing the UIs" section with Docker Compose UI table, Grafana dashboard panel guide, Jaeger trace instructions, k8s port-forward commands. Condensed existing sections to stay under 300-line limit.

## Commit History

| Hash | Description |
| ---- | ----------- |
| TBD  | feat(infra): add Jaeger tracing + UI access docs |
