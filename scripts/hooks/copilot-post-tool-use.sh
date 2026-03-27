#!/usr/bin/env bash
# Copilot PostToolUse hook — typecheck after edits + file size warning
# Location: .github/hooks/gates.json → scripts/hooks/copilot-post-tool-use.sh
# Mirrors: .claude/settings.json PostToolUse hooks (adapted for Copilot stdin JSON)
# REQ-AGENT-009, REQ-AGENT-013

set -euo pipefail

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
INPUT=$(cat)

# ── Parse JSON from stdin using node ──────────────────────────────
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

# Only act on file-editing tools
case "$TOOL_NAME" in
  create_file|replace_string_in_file|multi_replace_string_in_file|edit_notebook_file)
    ;;
  *)
    exit 0
    ;;
esac

FILE_PATH=$(json_field "tool_input.filePath")
MESSAGES=""

# ── File size check (300-line hard limit, MUST #4) ────────────────
if [[ -n "$FILE_PATH" && -f "$FILE_PATH" ]]; then
  LINES=$(wc -l < "$FILE_PATH" 2>/dev/null || echo 0)
  LINES=$(echo "$LINES" | tr -d ' ')
  if [[ "$LINES" -gt 300 ]]; then
    MESSAGES+="WARNING: $FILE_PATH has $LINES lines (>300 hard limit, MUST #4). MUST split along feature/responsibility boundaries. "
  elif [[ "$LINES" -gt 200 ]]; then
    MESSAGES+="NOTE: $FILE_PATH has $LINES lines (>200 target). Consider splitting. "
  fi
fi

# ── Typecheck (fast feedback on .ts files) ────────────────────────
if [[ "$FILE_PATH" == *.ts ]]; then
  TSC_OUTPUT=$(cd "$REPO_ROOT" && pnpm tsc --noEmit 2>&1 | head -20) || true
  if [[ -n "$TSC_OUTPUT" && "$TSC_OUTPUT" != *"error TS"* ]]; then
    : # No errors, skip
  elif [[ -n "$TSC_OUTPUT" ]]; then
    MESSAGES+="TypeScript errors detected: $TSC_OUTPUT"
  fi
fi

# ── Return context if any issues found ────────────────────────────
if [[ -n "$MESSAGES" ]]; then
  # Escape for JSON
  ESCAPED=$(echo "$MESSAGES" | node -e "
    const chunks = [];
    process.stdin.on('data', c => chunks.push(c));
    process.stdin.on('end', () => {
      process.stdout.write(JSON.stringify(Buffer.concat(chunks).toString().trim()));
    });
  " 2>/dev/null || echo "\"$MESSAGES\"")

  echo "{\"hookSpecificOutput\":{\"hookEventName\":\"PostToolUse\",\"additionalContext\":${ESCAPED}}}"
fi

exit 0
