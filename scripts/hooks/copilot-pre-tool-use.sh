#!/usr/bin/env bash
# Copilot PreToolUse hook — enforces mandatory gates before git commit/push
# Location: .github/hooks/gates.json → scripts/hooks/copilot-pre-tool-use.sh
# Mirrors: .claude/settings.json PreToolUse hooks (adapted for Copilot stdin JSON)
# REQ-AGENT-005, REQ-AGENT-008, REQ-AGENT-010

set -euo pipefail

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
INPUT=$(cat)

# ── Parse JSON from stdin using node (always available in this repo) ──
json_field() {
  echo "$INPUT" | node -e "
    const chunks = [];
    process.stdin.on('data', c => chunks.push(c));
    process.stdin.on('end', () => {
      try {
        const obj = JSON.parse(Buffer.concat(chunks).toString());
        const val = '$1'.split('.').reduce((o, k) => o?.[k], obj);
        process.stdout.write(String(val ?? ''));
      } catch { /* silent */ }
    });
  " 2>/dev/null || echo ""
}

TOOL_NAME=$(json_field "tool_name")

# Only intercept terminal commands
if [[ "$TOOL_NAME" != "run_in_terminal" ]]; then
  exit 0
fi

COMMAND=$(json_field "tool_input.command")

# ── G2 + G4: Pre-commit gates ─────────────────────────────────────
if echo "$COMMAND" | grep -qE '\bgit\s+(commit|cz)\b'; then
  # Run branch + state tracker checks
  if ! "$REPO_ROOT/scripts/verify-pre-commit-gates.sh" 2>/dev/null; then
    cat <<'EOF'
{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"Pre-commit gates failed (G2/G4). Create work/<slug> branch and state tracker first."}}
EOF
    exit 0
  fi

  # G5: Run guard functions (typecheck + lint + test)
  if ! pnpm turbo typecheck --output-logs=errors-only 2>/dev/null && \
     pnpm turbo lint --output-logs=errors-only 2>/dev/null && \
     pnpm turbo test --output-logs=errors-only 2>/dev/null; then
    cat <<'EOF'
{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"Guard functions failed (G5). Fix typecheck/lint/test errors before committing."}}
EOF
    exit 0
  fi
fi

# ── Block push to main ────────────────────────────────────────────
if echo "$COMMAND" | grep -qE '\bgit\s+push\b'; then
  BRANCH=$(git branch --show-current 2>/dev/null || echo "")
  if [[ "$BRANCH" == "main" ]]; then
    cat <<'EOF'
{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"BLOCKED: Push to main — use work/<slug> branch"}}
EOF
    exit 0
  fi
fi

# ── Block force push on shared branches ───────────────────────────
if echo "$COMMAND" | grep -qE '\bgit\s+push\s+.*--force\b'; then
  cat <<'EOF'
{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"ask","permissionDecisionReason":"Force push detected — confirm this is intentional and not on a shared branch."}}
EOF
  exit 0
fi

exit 0
