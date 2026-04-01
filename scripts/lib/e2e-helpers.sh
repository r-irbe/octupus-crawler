#!/usr/bin/env bash
# scripts/lib/e2e-helpers.sh — Shared assertion and utility functions for E2E tests
# Sourced by run-k8s-e2e-test.sh and run-k8s-chaos-e2e.sh
set -euo pipefail

# ── Counters ─────────────────────────────────────────
export PASS=${PASS:-0}
export FAIL=${FAIL:-0}
export TOTAL=${TOTAL:-0}

log() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*"; }

assert_contains() {
  local desc=$1 output=$2 expected=$3
  TOTAL=$((TOTAL + 1))
  if echo "$output" | grep -q "$expected"; then
    PASS=$((PASS + 1))
    log "  ✓ $desc"
  else
    FAIL=$((FAIL + 1))
    log "  ✗ FAIL: $desc (expected '$expected')"
  fi
}

assert_status() {
  local desc=$1 url=$2 expected=$3
  TOTAL=$((TOTAL + 1))
  local status
  status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url" 2>/dev/null || echo "000")
  if [ "$status" = "$expected" ]; then
    PASS=$((PASS + 1))
    log "  ✓ $desc (HTTP $status)"
  else
    FAIL=$((FAIL + 1))
    log "  ✗ FAIL: $desc (got HTTP $status, expected $expected)"
  fi
}

assert_latency_gt() {
  local desc=$1 url=$2 min_ms=$3
  TOTAL=$((TOTAL + 1))
  local start end ms
  start=$(date +%s%N)
  curl -s --max-time 15 "$url" >/dev/null 2>&1 || true
  end=$(date +%s%N)
  ms=$(( (end - start) / 1000000 ))
  if [ "$ms" -gt "$min_ms" ]; then
    PASS=$((PASS + 1))
    log "  ✓ $desc (${ms}ms > ${min_ms}ms)"
  else
    FAIL=$((FAIL + 1))
    log "  ✗ FAIL: $desc (${ms}ms, expected >${min_ms}ms)"
  fi
}

record_state() {
  local phase=$1
  local ns=${NAMESPACE:-ipf}
  local dir=${RESULTS_DIR:-/tmp/k8s-e2e-results}
  kubectl get pods -n "$ns" -o wide > "$dir/${phase}-pods.txt" 2>/dev/null || true
  kubectl get hpa -n "$ns" -o wide > "$dir/${phase}-hpa.txt" 2>/dev/null || true
  kubectl top pods -n "$ns" > "$dir/${phase}-resources.txt" 2>/dev/null || true
}

wait_for_ready() {
  local deploy=$1 timeout=${2:-120}
  local ns=${NAMESPACE:-ipf}
  log "Waiting for $deploy to be ready (${timeout}s timeout)..."
  kubectl wait --for=condition=available "deploy/$deploy" -n "$ns" --timeout="${timeout}s" 2>/dev/null
}

get_replicas() {
  local ns=${NAMESPACE:-ipf}
  kubectl get deployment crawler-worker -n "$ns" \
    -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0"
}

print_summary() {
  log ""
  log "═══════════════════════════════════════════════"
  log "  Results: $PASS/$TOTAL passed"
  if [ "$FAIL" -gt 0 ]; then
    log "  FAILURES: $FAIL"
  fi
  log "  Results saved: ${RESULTS_DIR:-/tmp/k8s-e2e-results}"
  log "═══════════════════════════════════════════════"
}
