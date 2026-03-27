#!/usr/bin/env bash
# Copilot Stop hook — session-end verification reminder
# Location: .github/hooks/gates.json → scripts/hooks/copilot-stop.sh
# Mirrors: .claude/settings.json Stop hook (adapted for Copilot stdin JSON)
# REQ-AGENT-011

set -euo pipefail

INPUT=$(cat)

# Check if this is already a continuation from a previous stop hook
STOP_ACTIVE=$(echo "$INPUT" | node -e "
  const chunks = [];
  process.stdin.on('data', c => chunks.push(c));
  process.stdin.on('end', () => {
    try {
      const obj = JSON.parse(Buffer.concat(chunks).toString());
      process.stdout.write(String(obj.stop_hook_active ?? false));
    } catch { process.stdout.write('false'); }
  });
" 2>/dev/null || echo "false")

# Don't block if already continuing from a previous stop hook (prevent infinite loop)
if [[ "$STOP_ACTIVE" == "true" ]]; then
  exit 0
fi

# Collect session state
BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
UNCOMMITTED=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')

REASON=""
if [[ "$UNCOMMITTED" -gt 0 ]]; then
  REASON="There are $UNCOMMITTED uncommitted changes. "
fi

# If on a work branch, check for state tracker
if [[ "$BRANCH" =~ ^work/ ]]; then
  SLUG="${BRANCH#work/}"
  TRACKER=$(find docs/memory/session -name "*.md" ! -name "STATE-TRACKER-TEMPLATE.md" 2>/dev/null \
    | grep -i "$SLUG" || true)
  if [[ -z "$TRACKER" ]]; then
    REASON+="No state tracker found for branch '$BRANCH'. "
  fi
fi

if [[ -n "$REASON" ]]; then
  # Escape reason for JSON
  ESCAPED=$(echo "$REASON" | node -e "
    const chunks = [];
    process.stdin.on('data', c => chunks.push(c));
    process.stdin.on('end', () => {
      process.stdout.write(JSON.stringify(Buffer.concat(chunks).toString().trim()));
    });
  " 2>/dev/null || echo "\"$REASON\"")

  echo "{\"hookSpecificOutput\":{\"hookEventName\":\"Stop\",\"decision\":\"block\",\"reason\":${ESCAPED}}}"
fi

exit 0
