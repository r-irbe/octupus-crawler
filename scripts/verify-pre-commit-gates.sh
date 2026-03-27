#!/usr/bin/env bash
# verify-pre-commit-gates.sh — Block commits that violate mandatory gates
# Enforces G2 (branch naming) and G4 (state tracker) BEFORE git commit.
# Used by: git pre-commit hook, Claude PreToolUse hook, Copilot pre-commit.
# REQ-AGENT-005, AGENTS.md Gates G2, G4

set -euo pipefail

FAILED=0
SESSION_DIR="docs/memory/session"

# ── G2: Branch Safety ──────────────────────────────────────────────
BRANCH=$(git branch --show-current 2>/dev/null || echo "detached")

if [[ "$BRANCH" == "main" ]]; then
  echo "BLOCKED: Cannot commit directly to main — create work/<slug> branch first" >&2
  echo "  Run: git checkout -b work/<task-slug>" >&2
  FAILED=$((FAILED + 1))
elif [[ "$BRANCH" == "detached" ]]; then
  echo "BLOCKED: Detached HEAD — checkout a work/<slug> branch first" >&2
  FAILED=$((FAILED + 1))
elif [[ ! "$BRANCH" =~ ^work/ ]]; then
  echo "WARN: Branch '$BRANCH' doesn't follow work/<slug> convention" >&2
fi

# ── G4: State Tracker Existence ────────────────────────────────────
if [[ "$BRANCH" =~ ^work/ ]]; then
  SLUG="${BRANCH#work/}"

  # Look for a state tracker file whose name contains the branch slug
  TRACKER=$(find "$SESSION_DIR" -name "*.md" ! -name "STATE-TRACKER-TEMPLATE.md" 2>/dev/null \
    | grep -i "$SLUG" || true)

  if [[ -z "$TRACKER" ]]; then
    echo "BLOCKED: No state tracker found for branch '$BRANCH'" >&2
    echo "  Required: ${SESSION_DIR}/YYYY-MM-DD-${SLUG}-state.md" >&2
    echo "  Copy from: ${SESSION_DIR}/STATE-TRACKER-TEMPLATE.md" >&2
    FAILED=$((FAILED + 1))
  fi
fi

# ── Result ─────────────────────────────────────────────────────────
if [[ "$FAILED" -gt 0 ]]; then
  echo "" >&2
  echo "Pre-commit gate check FAILED ($FAILED violation(s)). Commit blocked." >&2
  echo "Fix the issues above before committing." >&2
  exit 1
fi

exit 0
