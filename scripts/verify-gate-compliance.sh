#!/usr/bin/env bash
# verify-gate-compliance.sh — Audit git history for gate protocol compliance
# Checks: G2 (branch naming), G4 (state trackers), G6 (conventional commits),
#          G8 (review artifacts), G9 (worklogs)
# REQ-AGENT-005, AGENTS.md Gates G2-G10

set -euo pipefail

FAILED=0
WARNINGS=0
BASE_BRANCH="${1:-main}"

echo "╔══════════════════════════════════════════╗"
echo "║   Gate Compliance Audit (vs $BASE_BRANCH)"
echo "╚══════════════════════════════════════════╝"
echo ""

# ─────────────────────────────────────────────
# G2: Branch naming — work/<task-slug>
# ─────────────────────────────────────────────
echo "━━━ G2: Branch Naming ━━━"

CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "detached")
if [[ "$CURRENT_BRANCH" == "main" ]]; then
  echo "  ✗ FAIL: On main — should be on a feature branch"
  FAILED=$((FAILED + 1))
elif [[ "$CURRENT_BRANCH" =~ ^work/ ]]; then
  echo "  ✓ Branch '$CURRENT_BRANCH' follows work/<slug> convention"
else
  echo "  ⚠ WARN: Branch '$CURRENT_BRANCH' doesn't match work/<slug>"
  WARNINGS=$((WARNINGS + 1))
fi

# Check merge commits on main for proper branch names
echo ""
echo "  Merge history on $BASE_BRANCH:"
MERGE_COMMITS=$(git log "$BASE_BRANCH" --merges --oneline 2>/dev/null | head -10)
if [[ -n "$MERGE_COMMITS" ]]; then
  while IFS= read -r line; do
    if echo "$line" | grep -qE "work/"; then
      echo "    ✓ $line"
    elif echo "$line" | grep -qiE "merge"; then
      echo "    ⚠ $line (not from work/ branch)"
      WARNINGS=$((WARNINGS + 1))
    fi
  done <<< "$MERGE_COMMITS"
else
  echo "    (no merge commits found)"
fi
echo ""

# ─────────────────────────────────────────────
# G4: State trackers exist for each work branch
# ─────────────────────────────────────────────
echo "━━━ G4: State Trackers ━━━"

SESSION_DIR="docs/memory/session"
TRACKER_COUNT=$(find "$SESSION_DIR" -name "*.md" ! -name "STATE-TRACKER-TEMPLATE.md" 2>/dev/null | wc -l | tr -d ' ')
echo "  Found $TRACKER_COUNT state tracker(s) in $SESSION_DIR/"

# Check each tracker has required sections
for tracker in "$SESSION_DIR"/*.md; do
  [[ "$(basename "$tracker")" == "STATE-TRACKER-TEMPLATE.md" ]] && continue
  [[ ! -f "$tracker" ]] && continue

  TNAME=$(basename "$tracker")
  HAS_SESSION=$(grep -c "## Session Identity" "$tracker" 2>/dev/null || true)
  HAS_TASKS=$(grep -c "## Task Queue" "$tracker" 2>/dev/null || true)
  HAS_STATE=$(grep -c "## Current State" "$tracker" 2>/dev/null || true)
  HAS_DECISIONS=$(grep -c "## Decisions Log" "$tracker" 2>/dev/null || true)

  if [[ "$HAS_SESSION" -gt 0 && "$HAS_TASKS" -gt 0 && "$HAS_STATE" -gt 0 && "$HAS_DECISIONS" -gt 0 ]]; then
    echo "    ✓ $TNAME — all required sections present"
  else
    MISSING=""
    [[ "$HAS_SESSION" -eq 0 ]] && MISSING="${MISSING}Session Identity, "
    [[ "$HAS_TASKS" -eq 0 ]] && MISSING="${MISSING}Task Queue, "
    [[ "$HAS_STATE" -eq 0 ]] && MISSING="${MISSING}Current State, "
    [[ "$HAS_DECISIONS" -eq 0 ]] && MISSING="${MISSING}Decisions Log, "
    echo "    ✗ $TNAME — missing: ${MISSING%, }"
    FAILED=$((FAILED + 1))
  fi
done

# Check work branches that lack state trackers
WORK_BRANCHES=$(git branch --list "work/*" 2>/dev/null | sed 's/^[* ]*//' | sort)
if [[ -n "$WORK_BRANCHES" ]]; then
  echo ""
  echo "  Work branches vs state trackers:"
  while IFS= read -r branch; do
    SLUG=$(echo "$branch" | sed 's|work/||')
    MATCH=$(find "$SESSION_DIR" -name "*${SLUG}*" 2>/dev/null | head -1)
    if [[ -n "$MATCH" ]]; then
      echo "    ✓ $branch → $(basename "$MATCH")"
    else
      echo "    ✗ $branch — NO state tracker found"
      FAILED=$((FAILED + 1))
    fi
  done <<< "$WORK_BRANCHES"
fi
echo ""

# ─────────────────────────────────────────────
# G6: Conventional commits on non-main branches
# ─────────────────────────────────────────────
echo "━━━ G6: Conventional Commits ━━━"

CONV_RE="^(feat|fix|refactor|test|docs|chore|ci|build|perf)(\([a-zA-Z0-9_,/-]+\))?: .+"
NON_CONV=0
TOTAL_COMMITS=0

while IFS= read -r msg; do
  [[ -z "$msg" ]] && continue
  TOTAL_COMMITS=$((TOTAL_COMMITS + 1))

  # Skip merge commits
  if echo "$msg" | grep -qiE "^Merge "; then
    continue
  fi

  if echo "$msg" | grep -qE "$CONV_RE"; then
    true # matches
  else
    echo "    ✗ Non-conventional: '$msg'"
    NON_CONV=$((NON_CONV + 1))
  fi
done < <(git log "$BASE_BRANCH" --oneline --format="%s" 2>/dev/null | head -30)

if [[ "$NON_CONV" -eq 0 ]]; then
  echo "  ✓ All $TOTAL_COMMITS recent commits follow conventional format"
else
  echo "  ✗ $NON_CONV/$TOTAL_COMMITS commits violate conventional commit format"
  FAILED=$((FAILED + 1))
fi
echo ""

# ─────────────────────────────────────────────
# G8: Review artifacts — check worklogs/specs mention review
# ─────────────────────────────────────────────
echo "━━━ G8: Review Evidence ━━━"

# Check which packages have commits but no review evidence in worklogs
PACKAGES_WITH_COMMITS=$(git log "$BASE_BRANCH" --oneline --format="%s" 2>/dev/null | grep -oE '^\w+\(([a-zA-Z_-]+)\)' | grep -oE '\([a-zA-Z_-]+\)' | tr -d '()' | sort -u || true)
WORKLOG_DIR="docs/worklogs"

for pkg in $PACKAGES_WITH_COMMITS; do
  REVIEW_FOUND=$(grep -rl "$pkg" "$WORKLOG_DIR"/*.md 2>/dev/null | head -1 || true)
  if [[ -n "$REVIEW_FOUND" ]]; then
    HAS_REVIEW=$(grep -ciE "review|council|G8|finding" "$REVIEW_FOUND" 2>/dev/null || true)
    if [[ "$HAS_REVIEW" -gt 0 ]]; then
      echo "  ✓ $pkg — review evidence in $(basename "$REVIEW_FOUND")"
    else
      echo "  ⚠ $pkg — worklog exists but no review/G8 mention"
      WARNINGS=$((WARNINGS + 1))
    fi
  else
    echo "  ✗ $pkg — NO worklog found"
    FAILED=$((FAILED + 1))
  fi
done
echo ""

# ─────────────────────────────────────────────
# G9: Worklog coverage
# ─────────────────────────────────────────────
echo "━━━ G9: Worklog Coverage ━━━"

WORKLOG_COUNT=$(find "$WORKLOG_DIR" -name "*.md" ! -name "index.md" 2>/dev/null | wc -l | tr -d ' ')
echo "  Found $WORKLOG_COUNT worklog(s)"

# Check index.md is up to date
if [[ -f "$WORKLOG_DIR/index.md" ]]; then
  INDEX_REFS=$(grep -c "\[" "$WORKLOG_DIR/index.md" 2>/dev/null || true)
  echo "  Worklog index has $INDEX_REFS references"

  # Find worklogs not in index
  for wl in "$WORKLOG_DIR"/*.md; do
    [[ "$(basename "$wl")" == "index.md" ]] && continue
    WL_NAME=$(basename "$wl" .md)
    if ! grep -q "$WL_NAME" "$WORKLOG_DIR/index.md" 2>/dev/null; then
      echo "    ✗ $(basename "$wl") — NOT in index.md"
      FAILED=$((FAILED + 1))
    fi
  done
else
  echo "  ✗ No worklog index.md found"
  FAILED=$((FAILED + 1))
fi
echo ""

# ─────────────────────────────────────────────
# CODE QUALITY: File size, any type, barrel imports
# ─────────────────────────────────────────────
echo "━━━ Code Quality Checks ━━━"

# File size check (300 line hard limit)
OVERSIZED=0
while IFS= read -r tsfile; do
  LINES=$(wc -l < "$tsfile" | tr -d ' ')
  if [[ "$LINES" -gt 300 ]]; then
    echo "  ✗ OVERSIZED ($LINES lines): $tsfile"
    OVERSIZED=$((OVERSIZED + 1))
  elif [[ "$LINES" -gt 200 ]]; then
    echo "  ⚠ LARGE ($LINES lines): $tsfile"
    WARNINGS=$((WARNINGS + 1))
  fi
done < <(find packages/ -name "*.ts" ! -path "*/node_modules/*" ! -path "*/dist/*" 2>/dev/null)

if [[ "$OVERSIZED" -eq 0 ]]; then
  echo "  ✓ No files exceed 300-line hard limit"
else
  echo "  ✗ $OVERSIZED file(s) exceed 300-line hard limit"
  FAILED=$((FAILED + 1))
fi

# Check for 'any' type usage
ANY_USAGE=$(grep -rn ": any\b\|as any\b\|<any>" packages/ --include="*.ts" \
  --exclude-dir=node_modules --exclude-dir=dist 2>/dev/null | \
  grep -v "test\." | grep -v "no-explicit-any" | head -5 || true)
if [[ -n "$ANY_USAGE" ]]; then
  echo "  ✗ 'any' type usage found:"
  echo "$ANY_USAGE" | head -3
  FAILED=$((FAILED + 1))
else
  echo "  ✓ No 'any' type usage in production code"
fi

# Check for barrel imports
BARREL_IMPORTS=$(grep -rn "from '\./index'" packages/ --include="*.ts" \
  --exclude-dir=node_modules --exclude-dir=dist 2>/dev/null | head -5 || true)
if [[ -n "$BARREL_IMPORTS" ]]; then
  echo "  ✗ Barrel index imports found:"
  echo "$BARREL_IMPORTS" | head -3
  FAILED=$((FAILED + 1))
else
  echo "  ✓ No barrel index imports"
fi
echo ""

# ─────────────────────────────────────────────
# SUMMARY
# ─────────────────────────────────────────────
echo "╔══════════════════════════════════════════╗"
echo "║   COMPLIANCE SUMMARY                     ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "  Failures:  $FAILED"
echo "  Warnings:  $WARNINGS"
echo ""

if [[ "$FAILED" -gt 0 ]]; then
  echo "RESULT: ✗ NON-COMPLIANT — $FAILED issue(s) must be resolved"
  echo ""
  echo "Action: Fix failures, re-run verification, then proceed."
  exit 1
else
  if [[ "$WARNINGS" -gt 0 ]]; then
    echo "RESULT: ⚠ COMPLIANT WITH WARNINGS ($WARNINGS)"
  else
    echo "RESULT: ✓ FULLY COMPLIANT"
  fi
  exit 0
fi
