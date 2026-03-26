#!/usr/bin/env bash
# verify-spec-update.sh — G11: Verify specs are updated after implementation
# Enforces "living specs" rule (AGENTS.md SHOULD #15):
#   When code diverges from design.md or requirements.md, update the spec
#   in the same commit. Stale specs are flagged.
#
# Checks:
#   1. tasks.md checkboxes reflect implemented code
#   2. Implemented packages have corresponding spec updates

set -euo pipefail

FAILED=0
WARNINGS=0

echo "╔══════════════════════════════════════════╗"
echo "║   G11: Spec Update Verification          ║"
echo "╚══════════════════════════════════════════╝"
echo ""

SPECS_DIR="docs/specs"
PKGS_DIR="packages"

# ─────────────────────────────────────────────
# 1. Map packages to their spec directories
# ─────────────────────────────────────────────

# Known mapping of package dir name → spec dir name
# If names differ, add explicit mapping here
declare -A PKG_TO_SPEC=(
  ["core"]="core-contracts"
  ["config"]="core-contracts"
  ["testing"]="testing-quality"
)

get_spec_dir() {
  local pkg_name="$1"
  # Check explicit mapping first
  if [[ -v "PKG_TO_SPEC[$pkg_name]" ]]; then
    echo "${PKG_TO_SPEC[$pkg_name]}"
  else
    # Default: package name matches spec dir name
    echo "$pkg_name"
  fi
}

# ─────────────────────────────────────────────
# 2. Check each implemented package's tasks.md
# ─────────────────────────────────────────────

echo "━━━ Task Completion Sync ━━━"
echo ""

for pkg_dir in "$PKGS_DIR"/*/; do
  [[ ! -f "$pkg_dir/package.json" ]] && continue
  PKG_NAME=$(basename "$pkg_dir")

  # Skip config-only packages
  [[ "$PKG_NAME" == "eslint-config" ]] && continue

  # Count source files (indicates implementation exists)
  SRC_COUNT=$(find "$pkg_dir/src" -name "*.ts" ! -name "*.test.ts" ! -name "*.d.ts" 2>/dev/null | wc -l | tr -d ' ')
  [[ "$SRC_COUNT" -eq 0 ]] && continue

  SPEC_NAME=$(get_spec_dir "$PKG_NAME")
  TASKS_FILE="$SPECS_DIR/$SPEC_NAME/tasks.md"

  if [[ ! -f "$TASKS_FILE" ]]; then
    echo "  ⚠ $PKG_NAME: no tasks.md at $TASKS_FILE"
    WARNINGS=$((WARNINGS + 1))
    continue
  fi

  CHECKED=$(grep -cE '^\s*- \[x\]' "$TASKS_FILE" 2>/dev/null | tr -d '[:space:]' || echo 0)
  UNCHECKED=$(grep -cE '^\s*- \[ \]' "$TASKS_FILE" 2>/dev/null | tr -d '[:space:]' || echo 0)
  TOTAL=$((CHECKED + UNCHECKED))

  if [[ "$TOTAL" -eq 0 ]]; then
    echo "  ○ $PKG_NAME ($SPEC_NAME): no checkboxes in tasks.md"
    continue
  fi

  if [[ "$CHECKED" -eq 0 && "$SRC_COUNT" -gt 0 ]]; then
    echo "  ✗ $PKG_NAME ($SPEC_NAME): $SRC_COUNT source files but 0/$TOTAL tasks checked"
    FAILED=$((FAILED + 1))
  elif [[ "$CHECKED" -gt 0 && "$UNCHECKED" -gt 0 ]]; then
    echo "  ~ $PKG_NAME ($SPEC_NAME): $CHECKED/$TOTAL tasks checked ($UNCHECKED remaining)"
  elif [[ "$CHECKED" -eq "$TOTAL" ]]; then
    echo "  ✓ $PKG_NAME ($SPEC_NAME): all $TOTAL tasks checked"
  else
    echo "  ? $PKG_NAME ($SPEC_NAME): $CHECKED checked, $UNCHECKED unchecked"
  fi
done
echo ""

# ─────────────────────────────────────────────
# 3. Check for specs without any implementation
# ─────────────────────────────────────────────

echo "━━━ Unimplemented Specs ━━━"
echo ""

for spec_dir in "$SPECS_DIR"/*/; do
  [[ ! -d "$spec_dir" ]] && continue
  SPEC_NAME=$(basename "$spec_dir")

  # Find if any package maps to this spec
  HAS_PKG=false
  for pkg_dir in "$PKGS_DIR"/*/; do
    [[ ! -f "$pkg_dir/package.json" ]] && continue
    PKG_NAME=$(basename "$pkg_dir")
    MAPPED=$(get_spec_dir "$PKG_NAME")
    if [[ "$MAPPED" == "$SPEC_NAME" ]]; then
      HAS_PKG=true
      break
    fi
  done

  if [[ "$HAS_PKG" == false ]]; then
    echo "  ○ $SPEC_NAME: no matching package yet"
  fi
done
echo ""

# ─────────────────────────────────────────────
# 4. Check design.md provenance dates
# ─────────────────────────────────────────────

echo "━━━ Spec Freshness ━━━"
echo ""

for spec_dir in "$SPECS_DIR"/*/; do
  [[ ! -d "$spec_dir" ]] && continue
  SPEC_NAME=$(basename "$spec_dir")

  for doc in "$spec_dir"/{requirements,design,tasks}.md; do
    [[ ! -f "$doc" ]] && continue
    DOC_NAME=$(basename "$doc")

    # Check if provenance line exists
    PROV=$(grep -i "Provenance" "$doc" 2>/dev/null | tail -1)
    if [[ -z "$PROV" ]]; then
      echo "  ⚠ $SPEC_NAME/$DOC_NAME: no provenance line"
      WARNINGS=$((WARNINGS + 1))
    fi
  done
done
echo ""

# ─────────────────────────────────────────────
# SUMMARY
# ─────────────────────────────────────────────

echo "╔══════════════════════════════════════════╗"
echo "║   G11 SPEC UPDATE SUMMARY                ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "  Failures:  $FAILED"
echo "  Warnings:  $WARNINGS"
echo ""

if [[ "$FAILED" -gt 0 ]]; then
  echo "RESULT: ✗ STALE SPECS — $FAILED package(s) have unchecked tasks despite implementation"
  echo ""
  echo "Fix: Update tasks.md checkboxes ([ ] → [x]) for completed tasks."
  echo "     Update design.md/requirements.md if implementation diverged."
  exit 1
elif [[ "$WARNINGS" -gt 0 ]]; then
  echo "RESULT: ⚠ SPECS OK WITH $WARNINGS WARNING(S)"
  exit 0
else
  echo "RESULT: ✓ ALL SPECS CURRENT"
  exit 0
fi
