#!/usr/bin/env bash
# lint-context-files.sh — Validate AI agent context files
# Checks: line counts, positional layout, token budget estimation
# REQ-AGENT-054, REQ-AGENT-055, REQ-AGENT-007

set -euo pipefail

FAILED=0
WARNINGS=0

# --- Line count checks ---

check_line_count() {
  local file="$1" max="$2" label="$3"
  if [[ ! -f "$file" ]]; then
    echo "SKIP: $file not found"
    return
  fi
  local lines
  lines=$(wc -l < "$file" | tr -d ' ')
  if [[ "$lines" -gt "$max" ]]; then
    echo "FAIL: $label has $lines lines (max: $max)"
    FAILED=1
  else
    echo "OK:   $label — $lines/$max lines"
  fi
}

echo "=== Line Count Checks ==="
check_line_count "CLAUDE.md" 200 "CLAUDE.md"
check_line_count "AGENTS.md" 1000 "AGENTS.md"
check_line_count ".github/copilot-instructions.md" 1000 "copilot-instructions.md"

# Check .claude/rules/ files
for rule in .claude/rules/*.md; do
  [[ -f "$rule" ]] && check_line_count "$rule" 100 "$rule"
done

# Check .claude/skills/ files
for skill in .claude/skills/*/SKILL.md; do
  [[ -f "$skill" ]] && check_line_count "$skill" 200 "$skill"
done

# Check .github/instructions/ files
for inst in .github/instructions/*.instructions.md; do
  [[ -f "$inst" ]] && check_line_count "$inst" 100 "$inst"
done

# --- Positional layout checks ---

echo ""
echo "=== Positional Layout Checks ==="

check_positional_layout() {
  local file="$1" label="$2"
  if [[ ! -f "$file" ]]; then return; fi

  # Check boundaries section is near the top (within first 30 lines)
  local boundary_line
  boundary_line=$(grep -n "^## Boundaries" "$file" | head -1 | cut -d: -f1)
  if [[ -n "$boundary_line" && "$boundary_line" -le 30 ]]; then
    echo "OK:   $label — Boundaries at line $boundary_line (primacy zone)"
  elif [[ -n "$boundary_line" ]]; then
    echo "WARN: $label — Boundaries at line $boundary_line (should be in first 30 lines)"
    WARNINGS=$((WARNINGS + 1))
  else
    echo "WARN: $label — No '## Boundaries' section found"
    WARNINGS=$((WARNINGS + 1))
  fi

  # Check quick reference section is near the end (within last 20 lines)
  local total_lines qr_line
  total_lines=$(wc -l < "$file" | tr -d ' ')
  qr_line=$(grep -n "^## Quick Reference" "$file" | tail -1 | cut -d: -f1)
  if [[ -n "$qr_line" ]]; then
    local distance=$((total_lines - qr_line))
    if [[ "$distance" -le 20 ]]; then
      echo "OK:   $label — Quick Reference at line $qr_line (recency zone)"
    else
      echo "WARN: $label — Quick Reference $distance lines from end (should be within 20)"
      WARNINGS=$((WARNINGS + 1))
    fi
  fi
}

check_positional_layout "CLAUDE.md" "CLAUDE.md"
check_positional_layout "AGENTS.md" "AGENTS.md"

# --- Token budget estimation ---

echo ""
echo "=== Token Budget Estimates (≈1 token per 4 chars) ==="

estimate_tokens() {
  local file="$1"
  if [[ ! -f "$file" ]]; then return; fi
  local chars
  chars=$(wc -c < "$file" | tr -d ' ')
  local tokens=$((chars / 4))
  echo "  $file: ~${tokens} tokens"
}

estimate_tokens "CLAUDE.md"
estimate_tokens "AGENTS.md"
estimate_tokens ".github/copilot-instructions.md"

# --- Summary ---

echo ""
echo "=== Summary ==="
if [[ "$FAILED" -ne 0 ]]; then
  echo "RESULT: FAILED — fix line count violations above"
  exit 1
elif [[ "$WARNINGS" -gt 0 ]]; then
  echo "RESULT: PASSED with $WARNINGS warning(s)"
  exit 0
else
  echo "RESULT: PASSED — all checks clean"
  exit 0
fi
