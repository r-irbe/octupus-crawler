#!/usr/bin/env bash
# Architecture conformance checks — blocks CI on structural violations
# Implements: T-CICD-021 (REQ-CICD-022)
# Checks: barrel imports, file size limits, circular package deps

set -euo pipefail

ERRORS=0
WARNINGS=0

# --- 1. Barrel import check ---
# Disallowed: import from './index' or from 'index.ts' barrel re-exports
echo "=== Checking for barrel imports ==="
BARREL_MATCHES=$(grep -rn "from '\./index'" --include='*.ts' packages/ apps/ 2>/dev/null | grep -v node_modules || true)
BARREL_MATCHES2=$(grep -rn "from '\.\./index'" --include='*.ts' packages/ apps/ 2>/dev/null | grep -v node_modules || true)

if [ -n "$BARREL_MATCHES" ] || [ -n "$BARREL_MATCHES2" ]; then
  echo "ERROR: Barrel imports found (ADR-016, MUST #5):"
  echo "$BARREL_MATCHES"
  echo "$BARREL_MATCHES2"
  ERRORS=$((ERRORS + 1))
else
  echo "  OK — no barrel imports"
fi

# --- 2. File size checks ---
echo ""
echo "=== Checking file sizes ==="

SEARCH_DIRS=""
[ -d "packages/" ] && SEARCH_DIRS="packages/"
[ -d "apps/" ] && SEARCH_DIRS="$SEARCH_DIRS apps/"

if [ -z "$SEARCH_DIRS" ]; then
  echo "  SKIP — no packages/ or apps/ directories"
else
  while IFS= read -r file; do
    LINES=$(wc -l < "$file" | tr -d ' ')
    if [ "$LINES" -gt 300 ]; then
      echo "ERROR: $file has $LINES lines (hard limit: 300)"
      ERRORS=$((ERRORS + 1))
    elif [ "$LINES" -gt 200 ]; then
      echo "WARNING: $file has $LINES lines (target: 200)"
      WARNINGS=$((WARNINGS + 1))
    fi
  done < <(find $SEARCH_DIRS -name '*.ts' -not -name '*.test.ts' -not -name '*.d.ts' -not -path '*/node_modules/*' -not -path '*/generated/*' -not -path '*/dist/*')
fi

if [ "$ERRORS" -eq 0 ] && [ "$WARNINGS" -eq 0 ]; then
  echo "  OK — all files within size limits"
elif [ "$ERRORS" -eq 0 ]; then
  echo "  $WARNINGS file(s) above target (200 lines) but below hard limit (300)"
fi

# --- 3. Circular package dependency check ---
echo ""
echo "=== Checking for circular package dependencies ==="

# packages/ must never depend on apps/ (dependency rule: inward only)
INWARD_VIOLATIONS=$(grep -rn '"@ipf/' --include='package.json' packages/ 2>/dev/null | while IFS=: read -r file line content; do
  # Extract referenced package
  PKG=$(echo "$content" | grep -oE '"@ipf/[^"]+' | head -1 | sed 's/"@ipf\///')
  if [ -n "$PKG" ]; then
    # Check if the referenced package is in apps/
    if [ -d "apps/$PKG" ]; then
      echo "  $file references apps/$PKG"
    fi
  fi
done || true)

if [ -n "$INWARD_VIOLATIONS" ]; then
  echo "ERROR: Package→App dependency violations (ADR-015 inward-only rule):"
  echo "$INWARD_VIOLATIONS"
  ERRORS=$((ERRORS + 1))
else
  echo "  OK — no inward dependency violations"
fi

# --- Summary ---
echo ""
echo "=== Architecture Conformance Summary ==="
echo "Errors:   $ERRORS"
echo "Warnings: $WARNINGS"

if [ "$ERRORS" -gt 0 ]; then
  echo "FAILED — fix the errors above"
  exit 1
fi

echo "PASSED"
exit 0
