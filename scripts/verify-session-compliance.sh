#!/usr/bin/env bash
# verify-session-compliance.sh — Check all required artifacts for current session
# Validates: state tracker, worklog, guard chain evidence, commit format,
#            review evidence, and spec traceability
# AGENTS.md Gates G1-G11

set -euo pipefail

FAILED=0
WARNINGS=0

echo "╔══════════════════════════════════════════╗"
echo "║   Session Compliance Check               ║"
echo "╚══════════════════════════════════════════╝"
echo ""

BRANCH=$(git branch --show-current 2>/dev/null || echo "detached")
echo "Branch: $BRANCH"
echo "Date: $(date +%Y-%m-%d)"
echo ""

# ─────────────────────────────────────────────
# G1: Plan evidence
# ─────────────────────────────────────────────
echo "━━━ G1: Plan ━━━"
echo "  (Manual check — verify plan was communicated to user)"
echo ""

# ─────────────────────────────────────────────
# G2: Branch
# ─────────────────────────────────────────────
echo "━━━ G2: Branch ━━━"
if [[ "$BRANCH" == "main" ]]; then
  echo "  ✗ FAIL: On main — must use work/<slug>"
  FAILED=$((FAILED + 1))
elif [[ "$BRANCH" =~ ^work/ ]]; then
  echo "  ✓ On feature branch: $BRANCH"
else
  echo "  ⚠ Branch '$BRANCH' doesn't match work/<slug>"
  WARNINGS=$((WARNINGS + 1))
fi
echo ""

# ─────────────────────────────────────────────
# G3: Spec — check specs exist for changed packages
# ─────────────────────────────────────────────
echo "━━━ G3: Spec Coverage ━━━"

SPECS_DIR="docs/specs"
if [[ -d "$SPECS_DIR" ]]; then
  SPEC_COUNT=$(find "$SPECS_DIR" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l | tr -d ' ')
  echo "  Found $SPEC_COUNT spec directories"

  for spec_dir in "$SPECS_DIR"/*/; do
    [[ ! -d "$spec_dir" ]] && continue
    SPEC_NAME=$(basename "$spec_dir")
    HAS_REQ=$(test -f "$spec_dir/requirements.md" && echo "✓" || echo "✗")
    HAS_DES=$(test -f "$spec_dir/design.md" && echo "✓" || echo "✗")
    HAS_TSK=$(test -f "$spec_dir/tasks.md" && echo "✓" || echo "✗")

    if [[ "$HAS_REQ" == "✓" && "$HAS_DES" == "✓" && "$HAS_TSK" == "✓" ]]; then
      echo "    ✓ $SPEC_NAME: requirements=$HAS_REQ design=$HAS_DES tasks=$HAS_TSK"
    else
      echo "    ✗ $SPEC_NAME: requirements=$HAS_REQ design=$HAS_DES tasks=$HAS_TSK"
      FAILED=$((FAILED + 1))
    fi
  done
else
  echo "  ⚠ No specs directory found"
  WARNINGS=$((WARNINGS + 1))
fi
echo ""

# ─────────────────────────────────────────────
# G4: State tracker for current branch
# ─────────────────────────────────────────────
echo "━━━ G4: State Tracker ━━━"

SESSION_DIR="docs/memory/session"
if [[ "$BRANCH" =~ ^work/ ]]; then
  SLUG=$(echo "$BRANCH" | sed 's|work/||')
  TRACKER=$(find "$SESSION_DIR" -name "*${SLUG}*" ! -name "STATE-TRACKER-TEMPLATE.md" 2>/dev/null | head -1)

  if [[ -n "$TRACKER" ]]; then
    echo "  ✓ State tracker found: $(basename "$TRACKER")"

    # Check it's been updated recently
    GUARD_STATUS=$(grep -oE "Guard function status.*\|.*" "$TRACKER" 2>/dev/null | tail -1)
    LAST_GATE=$(grep -oE "Last completed gate.*\|.*" "$TRACKER" 2>/dev/null | tail -1)
    echo "    $GUARD_STATUS"
    echo "    $LAST_GATE"
  else
    echo "  ✗ No state tracker for branch '$BRANCH'"
    echo "    Expected: $SESSION_DIR/YYYY-MM-DD-${SLUG}-state.md"
    FAILED=$((FAILED + 1))
  fi
else
  echo "  ⚠ Not on a work/ branch — state tracker check skipped"
fi
echo ""

# ─────────────────────────────────────────────
# G5: Guard function evidence
# ─────────────────────────────────────────────
echo "━━━ G5: Guard Functions ━━━"
echo "  Verifying all packages have scripts..."

for pkg_dir in packages/*/; do
  [[ ! -f "$pkg_dir/package.json" ]] && continue
  PKG_NAME=$(basename "$pkg_dir")

  HAS_TC=$(jq -r '.scripts.typecheck // empty' "$pkg_dir/package.json" 2>/dev/null)
  HAS_LN=$(jq -r '.scripts.lint // empty' "$pkg_dir/package.json" 2>/dev/null)
  HAS_TS=$(jq -r '.scripts.test // empty' "$pkg_dir/package.json" 2>/dev/null)

  if [[ -n "$HAS_TC" && -n "$HAS_LN" && -n "$HAS_TS" ]]; then
    echo "    ✓ $PKG_NAME: typecheck=$HAS_TC"
  elif [[ "$PKG_NAME" == "eslint-config" ]]; then
    echo "    ○ $PKG_NAME: config-only package (no scripts expected)"
  else
    echo "    ✗ $PKG_NAME: missing scripts (tc=${HAS_TC:-none} lint=${HAS_LN:-none} test=${HAS_TS:-none})"
    FAILED=$((FAILED + 1))
  fi
done

echo ""
echo "  Run './scripts/verify-guard-chain.sh' for live G5 verification."
echo ""

# ─────────────────────────────────────────────
# G6: Commit format on current branch
# ─────────────────────────────────────────────
echo "━━━ G6: Commit Format ━━━"

CONV_RE="^(feat|fix|refactor|test|docs|chore|ci|build|perf)(\([a-zA-Z0-9_-]+\))?: .+"
if [[ "$BRANCH" != "main" ]]; then
  BRANCH_COMMITS=$(git log main.."$BRANCH" --oneline --format="%s" 2>/dev/null || true)
  if [[ -n "$BRANCH_COMMITS" ]]; then
    BAD=0
    while IFS= read -r msg; do
      [[ -z "$msg" ]] && continue
      if ! echo "$msg" | grep -qE "$CONV_RE"; then
        if ! echo "$msg" | grep -qiE "^Merge "; then
          echo "    ✗ '$msg'"
          BAD=$((BAD + 1))
        fi
      fi
    done <<< "$BRANCH_COMMITS"
    if [[ "$BAD" -eq 0 ]]; then
      echo "  ✓ All branch commits follow conventional format"
    else
      echo "  ✗ $BAD non-conventional commit(s)"
      FAILED=$((FAILED + 1))
    fi
  else
    echo "  ○ No commits on branch yet"
  fi
else
  echo "  ○ On main — checking recent commits"
  git log --oneline -5 --format="    %s"
fi
echo ""

# ─────────────────────────────────────────────
# G7: State tracker current
# ─────────────────────────────────────────────
echo "━━━ G7: State Tracker Currency ━━━"
if [[ -n "${TRACKER:-}" && -f "${TRACKER}" ]]; then
  DONE_COUNT=$(grep -cE "\`done\`" "$TRACKER" 2>/dev/null || true)
  PENDING_COUNT=$(grep -cE "\`pending\`" "$TRACKER" 2>/dev/null || true)
  IN_PROGRESS=$(grep -cE "\`in-progress\`" "$TRACKER" 2>/dev/null || true)
  echo "  Tasks: $DONE_COUNT done, $IN_PROGRESS in-progress, $PENDING_COUNT pending"

  # Check commits on branch match tracker
  BRANCH_COMMIT_COUNT=$(git log main.."$BRANCH" --oneline 2>/dev/null | wc -l | tr -d ' ' || echo "0")
  TRACKER_HASH_MATCHES=$(grep -oE "[a-f0-9]{7}" "$TRACKER" 2>/dev/null || true)
  if [[ -n "$TRACKER_HASH_MATCHES" ]]; then
    TRACKER_COMMITS=$(echo "$TRACKER_HASH_MATCHES" | wc -l | tr -d ' ')
  else
    TRACKER_COMMITS=0
  fi
  echo "  Branch has $BRANCH_COMMIT_COUNT commit(s), tracker references $TRACKER_COMMITS hash(es)"

  if [[ "$BRANCH_COMMIT_COUNT" -gt 0 && "$TRACKER_COMMITS" -eq 0 ]]; then
    echo "  ⚠ Commits exist but tracker has no commit hashes — may be stale"
    WARNINGS=$((WARNINGS + 1))
  fi
else
  echo "  ○ No tracker to check"
fi
echo ""

# ─────────────────────────────────────────────
# G8: Review evidence
# ─────────────────────────────────────────────
echo "━━━ G8: Review Evidence ━━━"
echo "  Checking for review artifacts in worklogs and specs..."

WORKLOG_DIR="docs/worklogs"
REVIEW_MATCHES=$(grep -rl "G8\|review council\|Review Council\|APPROVED\|CHANGES REQUESTED" "$WORKLOG_DIR"/ 2>/dev/null || true)
if [[ -n "$REVIEW_MATCHES" ]]; then
  REVIEW_EVIDENCE=$(echo "$REVIEW_MATCHES" | wc -l | tr -d ' ')
else
  REVIEW_EVIDENCE=0
fi
echo "  Worklogs with review evidence: $REVIEW_EVIDENCE"

if [[ "$REVIEW_EVIDENCE" -eq 0 ]]; then
  # Check how many feature commits exist that should have reviews
  FEAT_COMMITS=$(git log main --oneline --format="%s" 2>/dev/null | grep -c "^feat\|^fix\|^refactor" || true)
  if [[ "$FEAT_COMMITS" -gt 0 ]]; then
    echo "  ⚠ $FEAT_COMMITS feature commit(s) on main but no review evidence in worklogs"
    WARNINGS=$((WARNINGS + 1))
  fi
fi
echo ""

# ─────────────────────────────────────────────
# G9: Worklog
# ─────────────────────────────────────────────
echo "━━━ G9: Worklog ━━━"
TODAY=$(date +%Y-%m-%d)
TODAY_WORKLOGS=$(find "$WORKLOG_DIR" -name "${TODAY}*" 2>/dev/null | wc -l | tr -d ' ')
echo "  Worklogs for today ($TODAY): $TODAY_WORKLOGS"

if [[ "$TODAY_WORKLOGS" -eq 0 ]]; then
  echo "  ⚠ No worklog for today — create one before declaring work complete"
  WARNINGS=$((WARNINGS + 1))
fi

# Check index
if [[ -f "$WORKLOG_DIR/index.md" ]]; then
  UNINDEXED=0
  for wl in "$WORKLOG_DIR"/*.md; do
    [[ "$(basename "$wl")" == "index.md" ]] && continue
    WL_NAME=$(basename "$wl" .md)
    if ! grep -q "$WL_NAME" "$WORKLOG_DIR/index.md" 2>/dev/null; then
      echo "    ✗ $(basename "$wl") not in index"
      UNINDEXED=$((UNINDEXED + 1))
    fi
  done
  if [[ "$UNINDEXED" -eq 0 ]]; then
    echo "  ✓ All worklogs indexed"
  else
    FAILED=$((FAILED + 1))
  fi
fi
echo ""

# ─────────────────────────────────────────────
# G10: Report
# ─────────────────────────────────────────────
echo "━━━ G10: Report ━━━"
echo "  (Manual check — verify summary was communicated to user)"
echo ""

# ─────────────────────────────────────────────
# G11: Spec Update
# ─────────────────────────────────────────────
echo "━━━ G11: Spec Update ━━━"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -x "$SCRIPT_DIR/verify-spec-update.sh" ]]; then
  if "$SCRIPT_DIR/verify-spec-update.sh" > /dev/null 2>&1; then
    echo "  ✓ All specs current (pnpm verify:specs passed)"
  else
    echo "  ✗ Stale specs detected — run 'pnpm verify:specs' for details"
    FAILED=$((FAILED + 1))
  fi
else
  echo "  ⚠ verify-spec-update.sh not found or not executable"
  WARNINGS=$((WARNINGS + 1))
fi
echo ""

# ─────────────────────────────────────────────
# PACKAGE HEALTH
# ─────────────────────────────────────────────
echo "━━━ Package Health ━━━"
for pkg_dir in packages/*/; do
  [[ ! -f "$pkg_dir/package.json" ]] && continue
  PKG_NAME=$(basename "$pkg_dir")
  [[ "$PKG_NAME" == "eslint-config" ]] && continue

  HAS_TSCONFIG=$(test -f "$pkg_dir/tsconfig.json" && echo "✓" || echo "✗")
  HAS_ESLINT=$(test -f "$pkg_dir/eslint.config.js" && echo "✓" || echo "✗")
  HAS_VITEST=$(test -f "$pkg_dir/vitest.config.ts" && echo "✓" || echo "✗")
  HAS_SRC=$(test -d "$pkg_dir/src" && echo "✓" || echo "✗")

  SRC_FILES=$(find "$pkg_dir/src" -name "*.ts" ! -name "*.test.ts" 2>/dev/null | wc -l | tr -d ' ')
  TEST_FILES=$(find "$pkg_dir/src" -name "*.test.ts" 2>/dev/null | wc -l | tr -d ' ')

  echo "  $PKG_NAME: tsconfig=$HAS_TSCONFIG eslint=$HAS_ESLINT vitest=$HAS_VITEST src=$HAS_SRC ($SRC_FILES source, $TEST_FILES test)"
done
echo ""

# ─────────────────────────────────────────────
# SUMMARY
# ─────────────────────────────────────────────
echo "╔══════════════════════════════════════════╗"
echo "║   SESSION COMPLIANCE SUMMARY             ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "  Failures:  $FAILED"
echo "  Warnings:  $WARNINGS"
echo ""

if [[ "$FAILED" -gt 0 ]]; then
  echo "RESULT: ✗ NON-COMPLIANT — $FAILED issue(s) require attention"
  exit 1
elif [[ "$WARNINGS" -gt 0 ]]; then
  echo "RESULT: ⚠ COMPLIANT WITH $WARNINGS WARNING(S)"
  exit 0
else
  echo "RESULT: ✓ FULLY COMPLIANT"
  exit 0
fi
