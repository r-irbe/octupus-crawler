# Getting Started

## Docker Compose

One command starts the full stack:

```bash
docker compose -f infra/docker/docker-compose.dev.yml --profile demo up
```

Starts the crawler targeting a 7-page web simulator. Within 30 seconds, Grafana dashboards populate with metrics, traces appear in Jaeger, logs flow into Loki.

| UI | URL | Content |
| -- | --- | ------- |
| Grafana | http://localhost:3000 | 7 dashboards — start with "IPF Crawler Overview" |
| Jaeger | http://localhost:16686 | Trace waterfall: DNS → fetch → SSRF check → parse → links |
| Prometheus | http://localhost:9091 | 12 alert rules, target health |
| MinIO | http://localhost:9001 | Stored pages (login: `minioadmin` / `minioadmin`) |

Services: PostgreSQL (:5432), Dragonfly/Redis (:6379), Loki (:3100), Promtail, Crawler (:9090 metrics, :8081 health), Web Simulator (:8080).

### What to observe

1. **Grafana → Crawler Overview**: Fetch rate climbs, frontier drains to zero. Error rate stays green (< 5%).
2. **Jaeger**: Service `ipf-crawler` → each trace shows the full pipeline for one URL.
3. **Grafana → Explore → Loki**: `{job="docker"} | json` shows structured logs with `traceId`. Click traceId → Jaeger.

## Kubernetes (k3d)

Production-like deployment with HPA autoscaling, ArgoCD GitOps, Chaos Mesh, and the same monitoring stack as Docker Compose.

```bash
scripts/setup-local.sh        # k3d cluster + ArgoCD + Chaos Mesh + monitoring
scripts/run-k8s-e2e-test.sh   # Full E2E: simulator, monitoring, scaling, chaos
scripts/teardown-local.sh     # Tear down everything
```

### E2E test phases

25+ assertions across 5 phases:

1. **Mega Simulator** — health, pages, robots.txt, metrics, 5 chaos types
2. **Monitoring** — Prometheus scraping, Grafana datasources, Loki, Jaeger
3. **Scale Up** — 5 replicas, verify all ready, generate load
4. **Scale Down** — 1 replica, verify termination
5. **Chaos** — Pod kill, network delay, CPU stress, DNS failure, network partition

### Port forwards

```bash
kubectl port-forward -n ipf svc/grafana 3000:3000
kubectl port-forward -n ipf svc/jaeger 16686:16686
kubectl port-forward -n ipf svc/prometheus 9091:9090
kubectl port-forward -n ipf svc/loki 3100:3100
kubectl port-forward -n ipf svc/mega-simulator 8080:8080
kubectl port-forward svc/argocd-server -n argocd 8443:443
kubectl port-forward svc/chaos-dashboard -n chaos-mesh 2333:2333
```

ArgoCD admin password:

```bash
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 -d
```

## Mega Simulator

Generates 1,000 domains × 50 pages with cross-domain links, per-domain `robots.txt`, SHA-256 fingerprints, and 5 chaos types injected into 20% of domains:

| Chaos Type | Effect |
| ---------- | ------ |
| Slow (200ms–5s) | Timeout handling, circuit breaker activation |
| Error (500/502/503) | Error classification, retry policy |
| Redirect chain (5 hops) | SSRF validation per hop, loop detection |
| Intermittent (30% fail) | Circuit breaker transitions (closed→open→half-open) |
| Rate limited (429) | Per-domain rate limiting, Retry-After compliance |

```bash
# Local (2,000 pages)
DOMAIN_COUNT=100 PAGES_PER_DOMAIN=20 \
  npx tsx packages/testing/src/simulators/mega-simulator-entrypoint.ts

# Docker (50,000 pages)
docker build -f infra/docker/Dockerfile.mega-simulator -t mega-simulator .
docker run -p 8080:8080 mega-simulator
```

## Load Testing

See [docs/LOAD-TESTING.md](LOAD-TESTING.md) for the full guide.

```bash
# 100 URL/s sustained — steady-state SLOs
k6 run packages/testing/src/load/throughput.k6.js

# 10,000 URL burst — backpressure without OOM
k6 run packages/testing/src/load/backpressure.k6.js

# 500 URL/s for 30 min with Grafana metrics
k6 run --out experimental-prometheus-rw \
  -e K6_PROMETHEUS_RW_SERVER_URL=http://localhost:9091/api/v1/write \
  packages/testing/src/load/mega-crawl.k6.js
```

## Chaos Testing

```bash
scripts/run-chaos-test.sh       # 25-min sequence: baseline → pod kills → network delay → CPU stress → recovery
scripts/run-autoscale-test.sh   # HPA ramp: 50 → 250 → 500 URL/s, verify pod scaling
```
