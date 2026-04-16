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
  set +e
  pnpm turbo typecheck --force 2>&1 | tee /tmp/ipf-typecheck.log | tail -3
  TC_EXIT=${PIPESTATUS[0]}
  set -e
  if [[ "$TC_EXIT" -eq 0 ]]; then
    TC_RESULT=$(grep -c "successful" /tmp/ipf-typecheck.log || true)
    echo "  ✓ typecheck passed ($TC_RESULT packages)"
  else
    echo "  ✗ typecheck FAILED (exit $TC_EXIT)"
    GATE_FAILED="typecheck"
  fi
  echo ""

  # --- Lint ---
  if [[ -z "$GATE_FAILED" ]]; then
    echo "▸ lint..."
    set +e
    pnpm turbo lint --force 2>&1 | tee /tmp/ipf-lint.log | tail -3
    LINT_EXIT=${PIPESTATUS[0]}
    set -e
    if [[ "$LINT_EXIT" -eq 0 ]]; then
      echo "  ✓ lint passed"
    else
      echo "  ✗ lint FAILED (exit $LINT_EXIT)"
      GATE_FAILED="lint"
    fi
    echo ""
  fi

  # --- Test ---
  if [[ -z "$GATE_FAILED" ]]; then
    echo "▸ test (unit)..."
    set +e
    pnpm turbo test --force 2>&1 | tee /tmp/ipf-test.log | tail -5
    TEST_EXIT=${PIPESTATUS[0]}
    set -e
    if [[ "$TEST_EXIT" -eq 0 ]]; then
      TEST_COUNT=$(grep -oE "[0-9]+ passed" /tmp/ipf-test.log | awk '{s+=$1} END {print s+0}')
      echo "  ✓ test passed ($TEST_COUNT tests total)"
    else
      echo "  ✗ test FAILED (exit $TEST_EXIT)"
      GATE_FAILED="test"
    fi
    echo ""
  fi

  # --- Integration Test ---
  if [[ -z "$GATE_FAILED" ]]; then
    echo "▸ test:integration..."
    set +e
    pnpm turbo test:integration --force 2>&1 | tee /tmp/ipf-integration.log | tail -5
    INT_EXIT=${PIPESTATUS[0]}
    set -e
    if [[ "$INT_EXIT" -eq 0 ]]; then
      INT_COUNT=$(grep -oE "[0-9]+ passed" /tmp/ipf-integration.log | awk '{s+=$1} END {print s+0}')
      echo "  ✓ integration passed ($INT_COUNT tests total)"
    else
      echo "  ✗ integration FAILED (exit $INT_EXIT)"
      grep -A5 "container\|Container\|TESTCONTAINER" /tmp/ipf-integration.log 2>/dev/null || true
      GATE_FAILED="test:integration"
    fi
    echo ""
  fi

  # --- Property Test ---
  if [[ -z "$GATE_FAILED" ]]; then
    echo "▸ test:property..."
    set +e
    pnpm turbo test:property --force 2>&1 | tee /tmp/ipf-property.log | tail -5
    PROP_EXIT=${PIPESTATUS[0]}
    set -e
    if [[ "$PROP_EXIT" -eq 0 ]]; then
      PROP_COUNT=$(grep -oE "[0-9]+ passed" /tmp/ipf-property.log | awk '{s+=$1} END {print s+0}')
      echo "  ✓ property passed ($PROP_COUNT tests total)"
    else
      echo "  ✗ property FAILED (exit $PROP_EXIT)"
      GATE_FAILED="test:property"
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
  echo "Typecheck: PASS | Lint: PASS | Test: PASS | Integration: PASS | Property: PASS"
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
  echo "Logs: /tmp/ipf-typecheck.log, /tmp/ipf-lint.log, /tmp/ipf-test.log, /tmp/ipf-integration.log, /tmp/ipf-property.log"
  exit 1
fi
