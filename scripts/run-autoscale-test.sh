#!/usr/bin/env bash
# scripts/run-autoscale-test.sh — HPA autoscaling test with staged load ramp
# REQ-LTO-033: Autoscale test validating HPA triggers and pod scaling
# Design: docs/specs/load-test-observability/design.md §7
set -euo pipefail

NAMESPACE="${NAMESPACE:-ipf}"
RESULTS_DIR="${RESULTS_DIR:-/tmp/autoscale-test-results}"
API_URL="${API_URL:-http://localhost:3000}"
SIMULATOR_HOST="${SIMULATOR_HOST:-http://mega-simulator:8080}"
mkdir -p "$RESULTS_DIR"

log() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*"; }

wait_with_progress() {
  local duration=$1
  local phase=${2:-""}
  local interval=30
  local elapsed=0
  while [ "$elapsed" -lt "$duration" ]; do
    local remaining=$(( duration - elapsed ))
    local step=$(( remaining < interval ? remaining : interval ))
    sleep "$step"
    elapsed=$(( elapsed + step ))
    if [ "$elapsed" -lt "$duration" ]; then
      log "  ⏳ $phase — ${elapsed}s / ${duration}s elapsed"
    fi
  done
}

check_hpa() {
  if ! kubectl get hpa -n "$NAMESPACE" crawler-worker-hpa &>/dev/null; then
    log "WARNING: HPA 'crawler-worker-hpa' not found in namespace $NAMESPACE"
    log "Creating a basic HPA for testing..."
    kubectl autoscale deployment crawler-worker -n "$NAMESPACE" \
      --cpu-percent=60 --min=2 --max=10 2>/dev/null || true
  fi
  log "HPA configuration:"
  kubectl get hpa -n "$NAMESPACE" -o wide
}

record_state() {
  local phase=$1
  log "Recording state: $phase"
  kubectl get pods -n "$NAMESPACE" -o wide > "$RESULTS_DIR/${phase}-pods.txt"
  kubectl get hpa -n "$NAMESPACE" -o wide > "$RESULTS_DIR/${phase}-hpa.txt"
  kubectl top pods -n "$NAMESPACE" > "$RESULTS_DIR/${phase}-resources.txt" 2>/dev/null || true
}

wait_for_scale() {
  local target=$1
  local timeout=$2
  local elapsed=0
  local interval=10

  log "Waiting for replica count >= $target (timeout: ${timeout}s)..."
  while [ "$elapsed" -lt "$timeout" ]; do
    local ready
    ready=$(kubectl get deployment crawler-worker -n "$NAMESPACE" -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
    ready=${ready:-0}
    if [ "$ready" -ge "$target" ]; then
      log "Scale-up confirmed: $ready replicas ready"
      return 0
    fi
    sleep "$interval"
    elapsed=$((elapsed + interval))
  done

  log "WARNING: Scale-up to $target not reached within ${timeout}s"
  return 1
}

# ── Pre-flight ───────────────────────────────────────
log "=== Autoscale Test Starting ==="

for cmd in kubectl k6; do
  if ! command -v "$cmd" &>/dev/null; then
    log "ERROR: $cmd is required but not installed." >&2
    exit 1
  fi
done

K6_PID=""
cleanup() {
  if [ -n "$K6_PID" ]; then kill "$K6_PID" 2>/dev/null || true; fi
}
trap cleanup EXIT

check_hpa
record_state "00-initial"

# ── Phase 1: Low load baseline (3 min) ──────────────
log ""
log "=== Phase 1: Low Load Baseline (3 min, 50 URL/s) ==="
k6 run --quiet --duration=3m \
  -e API_URL="$API_URL" \
  -e SIMULATOR_HOST="$SIMULATOR_HOST" \
  -e TARGET_RATE=50 \
  -e TEST_DURATION=3m \
  packages/testing/src/load/mega-crawl.k6.js \
  > "$RESULTS_DIR/phase1-k6.txt" 2>&1 &
K6_PID=$!
sleep 180
kill "$K6_PID" 2>/dev/null || true
wait "$K6_PID" 2>/dev/null || true
record_state "01-low-load"

# ── Phase 2: Medium load ramp (5 min) ───────────────
log ""
log "=== Phase 2: Medium Load (5 min, 250 URL/s) ==="
k6 run --quiet --duration=5m \
  -e API_URL="$API_URL" \
  -e SIMULATOR_HOST="$SIMULATOR_HOST" \
  -e TARGET_RATE=250 \
  -e TEST_DURATION=5m \
  packages/testing/src/load/mega-crawl.k6.js \
  > "$RESULTS_DIR/phase2-k6.txt" 2>&1 &
K6_PID=$!
sleep 60
record_state "02-medium-load-1m"
wait_for_scale 3 240 || true
record_state "02-medium-load-scaled"
wait "$K6_PID" 2>/dev/null || true

# ── Phase 3: High load peak (5 min) ─────────────────
log ""
log "=== Phase 3: High Load Peak (5 min, 500 URL/s) ==="
k6 run --quiet --duration=5m \
  -e API_URL="$API_URL" \
  -e SIMULATOR_HOST="$SIMULATOR_HOST" \
  -e TARGET_RATE=500 \
  -e TEST_DURATION=5m \
  packages/testing/src/load/mega-crawl.k6.js \
  > "$RESULTS_DIR/phase3-k6.txt" 2>&1 &
K6_PID=$!
sleep 60
record_state "03-high-load-1m"
wait_for_scale 5 240 || true
record_state "03-high-load-scaled"
wait "$K6_PID" 2>/dev/null || true

# ── Phase 4: Cool-down (5 min) ──────────────────────
log ""
log "=== Phase 4: Cool-down (5 min, no load) ==="
log "Monitoring scale-down..."
for i in 1 2 3 4 5; do
  sleep 60
  REPLICAS=$(kubectl get deployment crawler-worker -n "$NAMESPACE" -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "?")
  log "  ⏳ Cool-down — ${i}m / 5m (replicas: ${REPLICAS:-0})"
  record_state "04-cooldown-${i}m"
done

# ── Summary ──────────────────────────────────────────
log ""
log "=== Autoscale Test Complete ==="
log "Results: $RESULTS_DIR"
log ""
log "Verify:"
log "  1. Pods scaled from 2 -> 3+ under medium load"
log "  2. Pods scaled from 3+ -> 5+ under high load"
log "  3. Pods scaled back down during cool-down"
log "  4. No OOM kills: kubectl get events -n $NAMESPACE | grep OOM"
log ""
log "View in Grafana:"
log "  Infrastructure: http://localhost:3000/d/infrastructure-health"
log "  Scenario Timeline: http://localhost:3000/d/scenario-timeline"
