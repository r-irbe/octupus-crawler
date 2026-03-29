#!/usr/bin/env bash
# verify-pre-commit-gates.sh — Block commits that violate mandatory gates
# Enforces G2 (branch naming), G4 (state tracker), file size, test naming,
# eslint-disable justification BEFORE git commit.
# Used by: git pre-commit hook, Claude PreToolUse hook, Copilot pre-commit.
# REQ-AGENT-005, REQ-TCH-001, REQ-TCH-002, REQ-TCH-003

set -euo pipefail

FAILED=0
WARNED=0
SESSION_DIR="docs/memory/session"
HARD_LIMIT=300

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

  TRACKER=$(find "$SESSION_DIR" -name "*.md" ! -name "STATE-TRACKER-TEMPLATE.md" 2>/dev/null \
    | grep -i "$SLUG" || true)

  if [[ -z "$TRACKER" ]]; then
    echo "BLOCKED: No state tracker found for branch '$BRANCH'" >&2
    echo "  Required: ${SESSION_DIR}/YYYY-MM-DD-${SLUG}-state.md" >&2
    echo "  Copy from: ${SESSION_DIR}/STATE-TRACKER-TEMPLATE.md" >&2
    FAILED=$((FAILED + 1))
  fi
fi

# ── File Size Check (REQ-TCH-001) ─────────────────────────────────
STAGED_TS=$(git diff --cached --name-only --diff-filter=ACM -- '*.ts' 2>/dev/null || true)
for file in $STAGED_TS; do
  if [[ -f "$file" ]]; then
    LINES=$(wc -l < "$file" | tr -d ' ')
    if [[ "$LINES" -gt "$HARD_LIMIT" ]]; then
      echo "BLOCKED: $file has $LINES lines (>${HARD_LIMIT} hard limit)" >&2
      FAILED=$((FAILED + 1))
    elif [[ "$LINES" -gt 200 ]]; then
      echo "WARN: $file has $LINES lines (>200 target, <=${HARD_LIMIT} limit)" >&2
      WARNED=$((WARNED + 1))
    fi
  fi
done

# ── Test Naming Convention (REQ-TCH-002) ───────────────────────────
STAGED_TESTS=$(git diff --cached --name-only --diff-filter=ACM -- '*.test.ts' 2>/dev/null || true)
for file in $STAGED_TESTS; do
  BASENAME=$(basename "$file")
  if [[ ! "$BASENAME" =~ \.(unit|integration|e2e|property|contract)\.test\.ts$ ]]; then
    echo "BLOCKED: $file does not follow naming convention (*.{unit,integration,e2e,property,contract}.test.ts)" >&2
    FAILED=$((FAILED + 1))
  fi
done

# ── eslint-disable Justification (REQ-TCH-003) ────────────────────
for file in $STAGED_TS; do
  if [[ -f "$file" ]]; then
    DISABLE_LINES=$(grep -n "eslint-disable" "$file" 2>/dev/null || true)
    while IFS= read -r match; do
      [[ -z "$match" ]] && continue
      LINE_NUM="${match%%:*}"
      LINE_CONTENT="${match#*:}"
      # Check same line has a justification comment after the directive
      if [[ "$LINE_CONTENT" =~ eslint-disable ]] && [[ ! "$LINE_CONTENT" =~ "--" ]]; then
        # Check preceding line for justification
        PREV_NUM=$((LINE_NUM - 1))
        if [[ "$PREV_NUM" -gt 0 ]]; then
          PREV_LINE=$(sed -n "${PREV_NUM}p" "$file" 2>/dev/null || true)
          if [[ ! "$PREV_LINE" =~ ^[[:space:]]*//.+ ]]; then
            echo "WARN: $file:$LINE_NUM has eslint-disable without justification comment" >&2
            WARNED=$((WARNED + 1))
          fi
        fi
      fi
    done <<< "$DISABLE_LINES"
  fi
done

# ── Result ─────────────────────────────────────────────────────────
if [[ "$WARNED" -gt 0 ]]; then
  echo "" >&2
  echo "Pre-commit: $WARNED warning(s) (non-blocking)." >&2
fi

if [[ "$FAILED" -gt 0 ]]; then
  echo "" >&2
  echo "Pre-commit gate check FAILED ($FAILED violation(s)). Commit blocked." >&2
  echo "Fix the issues above before committing." >&2
  exit 1
fi

exit 0
