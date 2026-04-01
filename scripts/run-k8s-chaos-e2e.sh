#!/usr/bin/env bash
# scripts/run-k8s-chaos-e2e.sh — Chaos and scaling tests for k8s E2E suite
# Prerequisites: k3d cluster with mega-simulator running, port-forwards active
# Used by: run-k8s-e2e-test.sh (called after simulator/monitoring verification)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/e2e-helpers.sh
source "$SCRIPT_DIR/lib/e2e-helpers.sh"

NAMESPACE="${NAMESPACE:-ipf}"
CHAOS_DIR="${CHAOS_DIR:-infra/k8s/chaos}"
RESULTS_DIR="${RESULTS_DIR:-/tmp/k8s-e2e-results}"
mkdir -p "$RESULTS_DIR"

cleanup_chaos() {
  log "Cleaning up chaos experiments..."
  for f in "$CHAOS_DIR"/*.yml; do
    [ -f "$f" ] && kubectl delete -f "$f" --ignore-not-found=true 2>/dev/null || true
  done
  kubectl delete -f infra/k8s/overlays/e2e/network-partition-policy.yaml \
    --ignore-not-found=true 2>/dev/null || true
}
trap cleanup_chaos EXIT

# ═══════════════════════════════════════════════════════
# Scaling Tests
# ═══════════════════════════════════════════════════════
log ""
log "=== Scaling: Scale Up ==="

INITIAL_REPLICAS=$(get_replicas)
INITIAL_REPLICAS=${INITIAL_REPLICAS:-1}
log "Initial crawler-worker replicas: $INITIAL_REPLICAS"

kubectl scale deployment crawler-worker -n "$NAMESPACE" --replicas=5
sleep 5
kubectl wait --for=condition=available deploy/crawler-worker -n "$NAMESPACE" \
  --timeout=120s 2>/dev/null || true
sleep 10

SCALED_UP=$(get_replicas)
TOTAL=$((TOTAL + 1))
if [ "${SCALED_UP:-0}" -ge 4 ]; then
  PASS=$((PASS + 1))
  log "  ✓ Scale-up successful: $SCALED_UP replicas ready"
else
  FAIL=$((FAIL + 1))
  log "  ✗ FAIL: Scale-up: only ${SCALED_UP:-0} replicas (expected ≥4)"
fi
record_state "scale-up"

# Generate load during scaled state
log "Generating load across scaled workers..."
for i in $(seq 1 50); do
  curl -s -o /dev/null --max-time 5 \
    "http://localhost:8080/domain-00$((i % 80))/page-$((i % 15))" &
done
wait 2>/dev/null || true
sleep 5

log ""
log "=== Scaling: Scale Down ==="
kubectl scale deployment crawler-worker -n "$NAMESPACE" --replicas=1
sleep 30

SCALED_DOWN=$(get_replicas)
TOTAL=$((TOTAL + 1))
if [ "${SCALED_DOWN:-0}" -le 2 ]; then
  PASS=$((PASS + 1))
  log "  ✓ Scale-down successful: $SCALED_DOWN replicas"
else
  FAIL=$((FAIL + 1))
  log "  ✗ FAIL: Still ${SCALED_DOWN:-0} replicas (expected ≤2)"
fi
record_state "scale-down"

# Restore
kubectl scale deployment crawler-worker -n "$NAMESPACE" \
  --replicas="$INITIAL_REPLICAS"
sleep 5

# ═══════════════════════════════════════════════════════
# Chaos Testing
# ═══════════════════════════════════════════════════════
CHAOS_AVAILABLE=true
if ! kubectl get crd podchaos.chaos-mesh.org &>/dev/null; then
  log "WARNING: Chaos Mesh CRDs not found — skipping chaos tests"
  log "  Install: helm install chaos-mesh chaos-mesh/chaos-mesh -n chaos-mesh"
  CHAOS_AVAILABLE=false
fi

if [ "$CHAOS_AVAILABLE" = "true" ]; then
  # Pod Kill
  log ""
  log "=== Chaos: Pod Kill (30s) ==="
  kubectl apply -f "$CHAOS_DIR/pod-kill.yml" 2>/dev/null
  sleep 30
  kubectl wait --for=condition=available deploy/crawler-worker -n "$NAMESPACE" \
    --timeout=60s 2>/dev/null || true
  PODS_AFTER=$(kubectl get pods -n "$NAMESPACE" -l app=crawler-worker \
    --no-headers 2>/dev/null | wc -l | tr -d ' ')
  TOTAL=$((TOTAL + 1))
  if [ "${PODS_AFTER:-0}" -ge 1 ]; then
    PASS=$((PASS + 1))
    log "  ✓ Pod recovered after kill ($PODS_AFTER running)"
  else
    FAIL=$((FAIL + 1))
    log "  ✗ FAIL: Pod not recovered"
  fi
  kubectl delete -f "$CHAOS_DIR/pod-kill.yml" --ignore-not-found=true 2>/dev/null || true
  sleep 10
  record_state "chaos-pod-kill"

  # Network Delay
  log ""
  log "=== Chaos: Network Delay (20s) ==="
  kubectl apply -f "$CHAOS_DIR/network-delay.yml" 2>/dev/null
  sleep 15
  log "  Measuring latency with injected delay..."
  assert_latency_gt "Request latency with delay" \
    "http://localhost:8080/domain-0025/page-1" 100
  kubectl delete -f "$CHAOS_DIR/network-delay.yml" --ignore-not-found=true 2>/dev/null || true
  sleep 5
  record_state "chaos-network-delay"

  # CPU Stress
  log ""
  log "=== Chaos: CPU Stress (20s) ==="
  kubectl apply -f "$CHAOS_DIR/stress-cpu.yml" 2>/dev/null
  sleep 20
  STRESS_PODS=$(kubectl get pods -n "$NAMESPACE" -l app=crawler-worker \
    --field-selector=status.phase=Running --no-headers 2>/dev/null | wc -l | tr -d ' ')
  TOTAL=$((TOTAL + 1))
  if [ "${STRESS_PODS:-0}" -ge 1 ]; then
    PASS=$((PASS + 1))
    log "  ✓ Pods survive CPU stress ($STRESS_PODS running)"
  else
    FAIL=$((FAIL + 1))
    log "  ✗ FAIL: No pods running under stress"
  fi
  kubectl delete -f "$CHAOS_DIR/stress-cpu.yml" --ignore-not-found=true 2>/dev/null || true
  sleep 10
  record_state "chaos-cpu-stress"

  # DNS Failure
  log ""
  log "=== Chaos: DNS Failure (15s) ==="
  kubectl apply -f "$CHAOS_DIR/dns-failure.yml" 2>/dev/null
  sleep 15
  DNS_PODS=$(kubectl get pods -n "$NAMESPACE" -l app=crawler-worker \
    --field-selector=status.phase=Running --no-headers 2>/dev/null | wc -l | tr -d ' ')
  TOTAL=$((TOTAL + 1))
  if [ "${DNS_PODS:-0}" -ge 1 ]; then
    PASS=$((PASS + 1))
    log "  ✓ Pods survive DNS failure ($DNS_PODS running)"
  else
    FAIL=$((FAIL + 1))
    log "  ✗ FAIL: No pods during DNS failure"
  fi
  kubectl delete -f "$CHAOS_DIR/dns-failure.yml" --ignore-not-found=true 2>/dev/null || true
  sleep 10
  record_state "chaos-dns-failure"

  # Network Partition (worker ↔ Redis)
  log ""
  log "=== Chaos: Network Partition — Worker ↔ Redis (20s) ==="
  kubectl apply -f infra/k8s/overlays/e2e/network-partition-policy.yaml 2>/dev/null
  sleep 20
  PART_PODS=$(kubectl get pods -n "$NAMESPACE" -l app=crawler-worker \
    --field-selector=status.phase=Running --no-headers 2>/dev/null | wc -l | tr -d ' ')
  TOTAL=$((TOTAL + 1))
  if [ "${PART_PODS:-0}" -ge 1 ]; then
    PASS=$((PASS + 1))
    log "  ✓ Workers survive Redis partition ($PART_PODS running)"
  else
    FAIL=$((FAIL + 1))
    log "  ✗ FAIL: Workers crashed during partition"
  fi
  kubectl delete -f infra/k8s/overlays/e2e/network-partition-policy.yaml \
    --ignore-not-found=true 2>/dev/null || true
  sleep 10
  record_state "chaos-network-partition"
fi

# ═══════════════════════════════════════════════════════
# Post-Chaos Recovery
# ═══════════════════════════════════════════════════════
log ""
log "=== Post-Chaos Recovery Verification ==="
sleep 15
kubectl wait --for=condition=available deploy/crawler-worker -n "$NAMESPACE" \
  --timeout=60s 2>/dev/null || true

HEALTH=$(curl -s --max-time 5 http://localhost:8080/health 2>/dev/null || echo "")
assert_contains "Mega simulator healthy after chaos" "$HEALTH" "ok"

PROM=$(curl -s --max-time 5 http://localhost:9091/-/ready 2>/dev/null || echo "")
assert_contains "Prometheus healthy after chaos" "$PROM" "ready"

GRAF=$(curl -s --max-time 5 http://localhost:3000/api/health 2>/dev/null || echo "")
assert_contains "Grafana healthy after chaos" "$GRAF" "ok"

record_state "recovery"
print_summary
[ "$FAIL" -eq 0 ]
