#!/usr/bin/env bash
# scripts/run-chaos-test.sh — Orchestrated 25-minute chaos test sequence
# REQ-LTO-030: Automated chaos orchestration with timed experiment application
# Design: docs/specs/load-test-observability/design.md §6.3
set -euo pipefail

NAMESPACE="${CHAOS_NAMESPACE:-chaos-mesh}"
MONITORING_NS="${MONITORING_NAMESPACE:-default}"
CHAOS_DIR="infra/k8s/chaos"
RESULTS_DIR="${RESULTS_DIR:-/tmp/chaos-test-results}"
mkdir -p "$RESULTS_DIR"

# Phase durations (seconds)
BASELINE_DURATION=${BASELINE_DURATION:-300}   # 5 min
POD_CHAOS_DURATION=${POD_CHAOS_DURATION:-300} # 5 min
NET_CHAOS_DURATION=${NET_CHAOS_DURATION:-300} # 5 min
STRESS_DURATION=${STRESS_DURATION:-300}       # 5 min
RECOVERY_DURATION=${RECOVERY_DURATION:-300}   # 5 min

log() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*"; }

check_prereqs() {
  if ! kubectl get crd podchaos.chaos-mesh.org &>/dev/null; then
    log "ERROR: Chaos Mesh CRDs not found. Run scripts/setup-local.sh first."
    exit 1
  fi
  log "Chaos Mesh CRDs found"

  # Pause ArgoCD auto-sync during chaos tests to prevent self-heal interference (F-015)
  if kubectl get app ipf-crawler -n argocd &>/dev/null; then
    log "Pausing ArgoCD auto-sync for ipf-crawler..."
    kubectl patch app ipf-crawler -n argocd --type merge \
      -p '{"spec":{"syncPolicy":{"automated":null}}}' 2>/dev/null || \
      log "WARNING: Could not pause ArgoCD sync"
  fi
}

snapshot_metrics() {
  local phase=$1
  local file="$RESULTS_DIR/${phase}-metrics.txt"
  log "Capturing metrics snapshot: $phase"

  if kubectl get ns "$MONITORING_NS" &>/dev/null; then
    kubectl exec -n "$MONITORING_NS" deploy/prometheus-server -- \
      wget -qO- 'http://localhost:9090/api/v1/query?query=up' > "$file" 2>/dev/null || \
      log "WARNING: Metrics capture failed for $phase (Prometheus unreachable)"
  else
    log "WARNING: Namespace $MONITORING_NS not found — skipping metrics capture"
  fi

  # Capture pod status (always works)
  kubectl get pods -n ipf -o wide > "$RESULTS_DIR/${phase}-pods.txt" 2>/dev/null || true
}

apply_chaos() {
  local name=$1
  local file=$2
  log "Applying chaos: $name"
  kubectl apply -f "$file"
}

remove_chaos() {
  local name=$1
  local file=$2
  log "Removing chaos: $name"
  kubectl delete -f "$file" --ignore-not-found=true
}

cleanup() {
  log "Cleaning up all chaos experiments..."
  for f in "$CHAOS_DIR"/*.yml; do
    kubectl delete -f "$f" --ignore-not-found=true 2>/dev/null || true
  done

  # Restore ArgoCD auto-sync
  if kubectl get app ipf-crawler -n argocd &>/dev/null; then
    log "Restoring ArgoCD auto-sync..."
    kubectl patch app ipf-crawler -n argocd --type merge \
      -p '{"spec":{"syncPolicy":{"automated":{"prune":true,"selfHeal":true}}}}' 2>/dev/null || true
  fi

  log "Cleanup complete"
}

trap cleanup EXIT

# ── Pre-flight ───────────────────────────────────────
check_prereqs
log "=== Chaos Test Sequence Starting (25 min total) ==="
log "Results directory: $RESULTS_DIR"

# ── Phase 1: Baseline (5 min) ────────────────────────
log ""
log "=== Phase 1: Baseline ($BASELINE_DURATION s) ==="
snapshot_metrics "01-baseline-start"
sleep "$BASELINE_DURATION"
snapshot_metrics "01-baseline-end"

# ── Phase 2: Pod Chaos (5 min) ───────────────────────
log ""
log "=== Phase 2: Pod Kill Chaos ($POD_CHAOS_DURATION s) ==="
apply_chaos "pod-kill" "$CHAOS_DIR/pod-kill.yml"
snapshot_metrics "02-pod-chaos-start"
sleep "$POD_CHAOS_DURATION"
snapshot_metrics "02-pod-chaos-end"
remove_chaos "pod-kill" "$CHAOS_DIR/pod-kill.yml"

# ── Phase 3: Network Chaos (5 min) ───────────────────
log ""
log "=== Phase 3: Network Delay Chaos ($NET_CHAOS_DURATION s) ==="
apply_chaos "network-delay" "$CHAOS_DIR/network-delay.yml"
snapshot_metrics "03-network-chaos-start"
sleep "$NET_CHAOS_DURATION"
snapshot_metrics "03-network-chaos-end"
remove_chaos "network-delay" "$CHAOS_DIR/network-delay.yml"

# ── Phase 4: CPU Stress (5 min) ──────────────────────
log ""
log "=== Phase 4: CPU Stress Chaos ($STRESS_DURATION s) ==="
apply_chaos "cpu-stress" "$CHAOS_DIR/stress-cpu.yml"
snapshot_metrics "04-stress-start"
sleep "$STRESS_DURATION"
snapshot_metrics "04-stress-end"
remove_chaos "cpu-stress" "$CHAOS_DIR/stress-cpu.yml"

# ── Phase 5: Recovery (5 min) ────────────────────────
log ""
log "=== Phase 5: Recovery ($RECOVERY_DURATION s) ==="
log "All chaos removed. Monitoring recovery..."
snapshot_metrics "05-recovery-start"
sleep "$RECOVERY_DURATION"
snapshot_metrics "05-recovery-end"

# ── Summary ──────────────────────────────────────────
log ""
log "=== Chaos Test Complete ==="
log "Total duration: $(( BASELINE_DURATION + POD_CHAOS_DURATION + NET_CHAOS_DURATION + STRESS_DURATION + RECOVERY_DURATION )) seconds"
log "Results: $RESULTS_DIR"
log ""
log "View in Grafana:"
log "  Scenario Timeline: http://localhost:3001/d/scenario-timeline"
log "  Chaos Events:      http://localhost:3001/d/chaos-events"
log "  Infrastructure:    http://localhost:3001/d/infrastructure-health"
