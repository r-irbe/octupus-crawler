#!/usr/bin/env bash
# scripts/run-k8s-e2e-test.sh — Full k8s E2E test suite
# Tests: mega simulator endpoints, monitoring stack, then delegates chaos + scaling
# Prerequisites: k3d cluster running (scripts/setup-local.sh)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/e2e-helpers.sh
source "$SCRIPT_DIR/lib/e2e-helpers.sh"

export NAMESPACE="${NAMESPACE:-ipf}"
export RESULTS_DIR="${RESULTS_DIR:-/tmp/k8s-e2e-results}"
REGISTRY="${REGISTRY:-k3d-ipf-registry.localhost:5111}"
SKIP_BUILD="${SKIP_BUILD:-false}"
SKIP_DEPLOY="${SKIP_DEPLOY:-false}"
mkdir -p "$RESULTS_DIR"

PF_PIDS=()
cleanup_portforwards() {
  for pid in "${PF_PIDS[@]}"; do kill "$pid" 2>/dev/null || true; done
}
trap cleanup_portforwards EXIT

# ═══════════════════════════════════════════════════════
# Phase 0: Build & Deploy
# ═══════════════════════════════════════════════════════
log "=== K8s E2E Test Suite ==="

if [ "$SKIP_BUILD" != "true" ]; then
  log ""
  log "=== Building Mega Simulator Image ==="
  docker build -t "${REGISTRY}/ipf-mega-simulator:latest" \
    -f infra/docker/Dockerfile.mega-simulator .
  docker push "${REGISTRY}/ipf-mega-simulator:latest"
  log "Image pushed"
fi

if [ "$SKIP_DEPLOY" != "true" ]; then
  log ""
  log "=== Deploying to k3d ==="
  kubectl create namespace ipf --dry-run=client -o yaml | kubectl apply -f -
  bash "$SCRIPT_DIR/create-dashboard-configmap.sh"
  kubectl apply -k infra/k8s/overlays/e2e/
  for deploy in mega-simulator prometheus grafana loki jaeger; do
    wait_for_ready "$deploy" 60
  done
  log "All pods ready"
fi
record_state "00-initial"

# ── Port forwards ────────────────────────────────────
log ""
log "=== Port Forwards ==="
for svc_port in "mega-simulator:8080:8080" "prometheus:9091:9090" \
  "grafana:3000:3000" "jaeger:16686:16686" "loki:3100:3100"; do
  IFS=: read -r svc local remote <<< "$svc_port"
  kubectl port-forward "svc/$svc" -n "$NAMESPACE" "${local}:${remote}" &>/dev/null &
  PF_PIDS+=($!)
done
sleep 3

# ═══════════════════════════════════════════════════════
# Phase 1: Mega Simulator Verification
# ═══════════════════════════════════════════════════════
log ""
log "=== Phase 1: Mega Simulator ==="

HEALTH=$(curl -s --max-time 5 http://localhost:8080/health 2>/dev/null || echo "")
assert_contains "Health endpoint" "$HEALTH" "ok"

PAGE=$(curl -s --max-time 5 http://localhost:8080/domain-0025/page-3 2>/dev/null || echo "")
assert_contains "Page returns HTML" "$PAGE" "<html"
assert_contains "Page has links" "$PAGE" "href="
assert_contains "Page has fingerprint" "$PAGE" "fingerprint"

ROBOTS=$(curl -s --max-time 5 http://localhost:8080/domain-0010/robots.txt 2>/dev/null || echo "")
assert_contains "Robots.txt" "$ROBOTS" "User-agent"

METRICS=$(curl -s --max-time 5 http://localhost:8080/metrics 2>/dev/null || echo "")
assert_contains "Metrics endpoint" "$METRICS" "simulator_requests_total"

# Simulator chaos scenarios
log ""
log "--- Simulator Chaos Scenarios ---"
assert_latency_gt "Slow domain (0000)" "http://localhost:8080/domain-0000/page-1" 200
assert_status "Error domain (0001) → 500" "http://localhost:8080/domain-0001/page-1" "500"

REDIR=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 -L --max-redirs 10 \
  http://localhost:8080/domain-0002/page-1 2>/dev/null || echo "000")
TOTAL=$((TOTAL + 1))
if [ "$REDIR" = "200" ]; then PASS=$((PASS + 1)); log "  ✓ Redirect chain → 200"
else FAIL=$((FAIL + 1)); log "  ✗ FAIL: Redirect → $REDIR"; fi

RATE_OK=0; RATE_429=0
for _ in $(seq 1 15); do
  S=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 \
    http://localhost:8080/domain-0014/page-1 2>/dev/null || echo "000")
  [ "$S" = "200" ] && RATE_OK=$((RATE_OK + 1))
  [ "$S" = "429" ] && RATE_429=$((RATE_429 + 1))
done
TOTAL=$((TOTAL + 1))
if [ "$RATE_OK" -ge 5 ] && [ "$RATE_429" -ge 1 ]; then
  PASS=$((PASS + 1)); log "  ✓ Rate limiting ($RATE_OK ok, $RATE_429 blocked)"
else FAIL=$((FAIL + 1)); log "  ✗ FAIL: Rate limiting ($RATE_OK/$RATE_429)"; fi

# ═══════════════════════════════════════════════════════
# Phase 2: Monitoring Stack
# ═══════════════════════════════════════════════════════
log ""
log "=== Phase 2: Monitoring Stack ==="

PROM=$(curl -s --max-time 5 http://localhost:9091/-/ready 2>/dev/null || echo "")
assert_contains "Prometheus ready" "$PROM" "ready"

GRAF_H=$(curl -s --max-time 5 http://localhost:3000/api/health 2>/dev/null || echo "")
assert_contains "Grafana healthy" "$GRAF_H" "ok"

GRAF_DS=$(curl -s --max-time 5 http://localhost:3000/api/datasources 2>/dev/null || echo "[]")
assert_contains "Grafana → Prometheus" "$GRAF_DS" "prometheus"
assert_contains "Grafana → Jaeger" "$GRAF_DS" "jaeger"
assert_contains "Grafana → Loki" "$GRAF_DS" "loki"

LOKI_R=$(curl -s --max-time 5 http://localhost:3100/ready 2>/dev/null || echo "")
assert_contains "Loki ready" "$LOKI_R" "ready"
assert_status "Jaeger UI" "http://localhost:16686/" "200"
record_state "01-monitoring"

# ═══════════════════════════════════════════════════════
# Phase 3: Chaos + Scaling (separate script)
# ═══════════════════════════════════════════════════════
log ""
log "=== Phase 3: Chaos + Scaling ==="
export PASS FAIL TOTAL
bash "$SCRIPT_DIR/run-k8s-chaos-e2e.sh"

log ""
log "Dashboards: http://localhost:3000 | Traces: http://localhost:16686"
