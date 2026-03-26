#!/usr/bin/env bash
# verify-guard-chain.sh — G5 guard function chain with retry logic
# Runs typecheck → lint → test across ALL packages (no cache).
# Exit 0 = all pass, Exit 1 = failure after max retries.
# REQ-AGENT-005, AGENTS.md Gate G5

set -euo pipefail

MAX_ATTEMPTS=3
ATTEMPT=0
PASSED=false

echo "╔══════════════════════════════════════════╗"
echo "║   G5: Guard Function Chain (Full Suite)  ║"
echo "╚══════════════════════════════════════════╝"
echo ""

while [[ "$ATTEMPT" -lt "$MAX_ATTEMPTS" && "$PASSED" == "false" ]]; do
  ATTEMPT=$((ATTEMPT + 1))
  echo "━━━ Attempt $ATTEMPT/$MAX_ATTEMPTS ━━━"
  echo ""

  GATE_FAILED=""

  # --- Typecheck ---
  echo "▸ typecheck..."
  if pnpm turbo typecheck --force 2>&1 | tee /tmp/ipf-typecheck.log | tail -3; then
    TC_RESULT=$(grep -c "successful" /tmp/ipf-typecheck.log || true)
    TC_FAILED=$(grep -c "Failed" /tmp/ipf-typecheck.log || true)
    if [[ "$TC_FAILED" -gt 0 ]]; then
      echo "  ✗ typecheck FAILED"
      GATE_FAILED="typecheck"
    else
      echo "  ✓ typecheck passed ($TC_RESULT packages)"
    fi
  else
    echo "  ✗ typecheck FAILED (exit code)"
    GATE_FAILED="typecheck"
  fi
  echo ""

  # --- Lint ---
  if [[ -z "$GATE_FAILED" ]]; then
    echo "▸ lint..."
    if pnpm turbo lint --force 2>&1 | tee /tmp/ipf-lint.log | tail -3; then
      LINT_FAILED=$(grep -c "Failed" /tmp/ipf-lint.log || true)
      LINT_ERRORS=$(grep -cE "[0-9]+ error" /tmp/ipf-lint.log || true)
      if [[ "$LINT_FAILED" -gt 0 || "$LINT_ERRORS" -gt 0 ]]; then
        echo "  ✗ lint FAILED"
        GATE_FAILED="lint"
      else
        echo "  ✓ lint passed"
      fi
    else
      echo "  ✗ lint FAILED (exit code)"
      GATE_FAILED="lint"
    fi
    echo ""
  fi

  # --- Test ---
  if [[ -z "$GATE_FAILED" ]]; then
    echo "▸ test..."
    if pnpm turbo test --force 2>&1 | tee /tmp/ipf-test.log | tail -5; then
      TEST_FAILED=$(grep -c "Failed" /tmp/ipf-test.log || true)
      TEST_COUNT=$(grep -oE "[0-9]+ passed" /tmp/ipf-test.log | awk '{s+=$1} END {print s+0}')
      if [[ "$TEST_FAILED" -gt 0 ]]; then
        echo "  ✗ test FAILED"
        GATE_FAILED="test"
      else
        echo "  ✓ test passed ($TEST_COUNT tests total)"
      fi
    else
      echo "  ✗ test FAILED (exit code)"
      GATE_FAILED="test"
    fi
    echo ""
  fi

  # --- Result ---
  if [[ -z "$GATE_FAILED" ]]; then
    PASSED=true
  else
    echo "⚠ Attempt $ATTEMPT failed at: $GATE_FAILED"
    if [[ "$ATTEMPT" -lt "$MAX_ATTEMPTS" ]]; then
      echo "  Retrying..."
      echo ""
    fi
  fi
done

echo ""
echo "╔══════════════════════════════════════════╗"
if [[ "$PASSED" == "true" ]]; then
  echo "║   G5 RESULT: ✓ ALL GATES PASSED         ║"
  echo "╚══════════════════════════════════════════╝"
  echo ""
  echo "Typecheck: PASS | Lint: PASS | Test: PASS"
  echo "Attempts used: $ATTEMPT/$MAX_ATTEMPTS"
  exit 0
else
  echo "║   G5 RESULT: ✗ FAILED AFTER $MAX_ATTEMPTS ATTEMPTS  ║"
  echo "╚══════════════════════════════════════════╝"
  echo ""
  echo "ESCALATION REQUIRED: Guard chain failed after $MAX_ATTEMPTS attempts."
  echo "Failed gate: $GATE_FAILED"
  echo "Action: STOP, report to user, do NOT commit."
  echo ""
  echo "Logs: /tmp/ipf-typecheck.log, /tmp/ipf-lint.log, /tmp/ipf-test.log"
  exit 1
fi
